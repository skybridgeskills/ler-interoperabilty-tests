# Phase 3 — Transaction-service client + server endpoints

## Scope of phase

Build the typed server-side client for the DCC transaction service, the
configuration parser, the bundled VC template, the run-state derivation
helper, and the two SvelteKit `+server.ts` endpoints the page calls.

Two parallel implementations following the existing `Real/Fake` pattern:

- **`RealTransactionServiceClient(config)`** — talks to an actual
  transaction service over HTTP using `fetch`.
- **`FakeTransactionServiceClient()`** — in-memory VCALM/VC-API style
  fake. Stores exchanges in a `Map`, advances state via test-only
  helpers (`advanceToActive`, `advanceToComplete`, `advanceToInvalid`),
  and produces interaction URLs that look real
  (`http://fake.test/interactions/<uuid>`). No network. Used by every
  unit / browser test plus the storybook runner stories. The test
  AppContext wires the fake; dev wires the real client.

After this phase the suite can talk to a running transaction service
(no UI yet). A `curl` smoke test against the new endpoints will return
real data; running tests against the same endpoints uses the fake and
needs no Docker.

## Code Organization Reminders

- All transaction-service code is **server-only**, under
  `src/lib/server/domain/exchange-runner/`. Never import from a
  `.svelte` file.
- The browser-side polling helper goes under
  `src/lib/client/exchange-runner/`.
- The pure run-state derivation function (used by both server and the
  storybook stories) goes in `src/lib/interop/runner-state.ts` (no
  server-only imports).
- One concept per file. Keep each ≤ ~200 lines.

## Style conventions

- **Factory functions** for both client variants. Both implement the
  same `TransactionServiceClient` interface so the provider can hand
  back either:
  ```ts
  export type TransactionServiceClient = {
  	createExchange(req: CreateExchangeRequest): Promise<{ exchangeId: string; protocols: ExchangeProtocols }>;
  	getExchange(exchangeId: string): Promise<ExchangeRecord>;
  };
  export function RealTransactionServiceClient(config: ExchangeRunnerConfig): TransactionServiceClient { ... }
  export function FakeTransactionServiceClient(): TransactionServiceClient & FakeTestHooks { ... }
  ```
  The fake exposes extra test hooks (`advanceToActive`,
  `advanceToComplete`, `advanceToInvalid`, `getStored(exchangeId)`)
  that the production code never calls.
- **`ZodFactory`** for every payload shape (request body, response,
  derived run state).
- **Provider** `provideTransactionServiceClient` wired through
  `provideExchangeRunnerConfig`.
- **camelCase** action names (`createExchange`, `getExchange`,
  `deriveRunStateFromExchange`).
- **TSDoc** on the public client + provider.
- **Imports.** External → `$lib/` → relative.

## Implementation Details

### `exchange-runner-config.ts`

Parses env vars into a typed config object:

```ts
export const ExchangeRunnerConfig = ZodFactory(
	z.object({
		enabled: z.boolean(),
		transactionServiceUrl: z.string().url(),
		tenantName: z.string(),
		tenantToken: z.string()
	})
);
export type ExchangeRunnerConfig = ReturnType<typeof ExchangeRunnerConfig>;

export function parseExchangeRunnerConfig(env: NodeJS.ProcessEnv): ExchangeRunnerConfig {
	const enabled = env.EXCHANGE_RUNNER_ENABLED === 'true';
	return ExchangeRunnerConfig({
		enabled,
		transactionServiceUrl: env.TRANSACTION_SERVICE_URL ?? 'http://localhost:4004',
		tenantName: env.TRANSACTION_SERVICE_TENANT_NAME ?? 'default',
		tenantToken: env.TRANSACTION_SERVICE_TENANT_TOKEN ?? ''
	});
}

export function provideExchangeRunnerConfig() {
	return { exchangeRunnerConfig: parseExchangeRunnerConfig(process.env) };
}
```

Co-located test asserts the parser handles defaults + missing token +
explicit overrides.

### `transaction-service-client.ts` — interface + Real implementation

```ts
export const CreateExchangeRequest = ZodFactory(z.object({
  retrievalId: z.string()
}));

export const ExchangeProtocols = ZodFactory(z.object({
  iu: z.string(),
  vcapi: z.string(),
  lcw: z.string().optional(),
  verifiablePresentationRequest: z.unknown()
}));

export const ExchangeRecord = ZodFactory(z.object({
  exchangeId: z.string(),
  state: z.enum(['pending', 'active', 'complete', 'invalid']),
  variables: z.record(z.unknown()),
  expires: z.string().optional()
}));

export function TransactionServiceClient(config: ExchangeRunnerConfig) {
  const headers = {
    Authorization: `Bearer ${config.tenantToken}`,
    'Content-Type': 'application/json'
  };

  async function createExchange(req: CreateExchangeRequest): Promise<{
    exchangeId: string;
    protocols: ExchangeProtocols;
  }> {
    const body = {
      variables: {
        tenantName: config.tenantName,
        exchangeHost: config.transactionServiceUrl,
        retrievalId: req.retrievalId,
        vc: JSON.stringify(ob3CredentialTemplate(req.retrievalId))
      }
    };
    const url = `${config.transactionServiceUrl}/workflows/claim/exchanges`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
    const protocols = ExchangeProtocols(await res.json());
    const exchangeId = extractExchangeIdFromIu(protocols.iu); // /interactions/<id>
    return { exchangeId, protocols };
  }

  async function getExchange(exchangeId: string): Promise<ExchangeRecord> {
    const url = `${config.transactionServiceUrl}/workflows/claim/exchanges/${exchangeId}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
    return ExchangeRecord(await res.json());
  }

  return { createExchange, getExchange };
}
export type TransactionServiceClient = ReturnType<typeof TransactionServiceClient>;

export class TransactionServiceError extends Error { ... }
// (one exception to "no classes" — extends Error so callers can `instanceof` it)
```

`provideTransactionServiceClient({ exchangeRunnerConfig })` (dev) returns
`{ transactionServiceClient: RealTransactionServiceClient(exchangeRunnerConfig) }`.

Tests: a thin happy-path test asserts the **real** client builds the
correct URL/headers/body via a one-shot `fetch` spy; the bulk of test
coverage uses the fake instead (see below).

### `fake-transaction-service-client.ts` — in-memory fake

Implements the same `TransactionServiceClient` contract entirely in
memory:

```ts
type FakeTestHooks = {
	advanceToActive(exchangeId: string, vars?: Record<string, unknown>): void;
	advanceToComplete(exchangeId: string, vars?: Record<string, unknown>): void;
	advanceToInvalid(exchangeId: string, reason?: string): void;
	getStored(exchangeId: string): ExchangeRecord | undefined;
	listExchanges(): ExchangeRecord[];
	clear(): void;
};

export function FakeTransactionServiceClient(): TransactionServiceClient & FakeTestHooks {
	const store = new Map<string, ExchangeRecord>();
	// createExchange — generates uuid, stores ExchangeRecord{state:'pending', variables:req.vars}, returns
	//   { exchangeId, protocols: { iu, vcapi, lcw, verifiablePresentationRequest } } shaped exactly like the real service
	// getExchange  — returns the stored record (clone), or throws TransactionServiceError(404)
	// advanceTo*   — mutates store entry's state (and variables) so tests can drive the polling client through
	//                idle → awaiting-wallet → wallet-connected → complete (or → error).
	return {
		createExchange,
		getExchange,
		advanceToActive,
		advanceToComplete,
		advanceToInvalid,
		getStored,
		listExchanges,
		clear
	};
}
```

Co-located test (`fake-transaction-service-client.test.ts`) covers:

- `createExchange` returns a URL-shaped `iu`, a unique `exchangeId`, and
  initial state `'pending'`.
- `getExchange` round-trips state changes from `advanceTo*`.
- `getExchange(unknown)` throws `TransactionServiceError(404)`.
- Advance helpers compose with `deriveRunStateFromExchange` to produce
  the same `ChecklistRunState` transitions as the real service would.

### Provider wiring

- `provideTransactionServiceClient` (dev) → `RealTransactionServiceClient`.
- `provideFakeTransactionServiceClient` (test) →
  `FakeTransactionServiceClient`. Wired into `test-app-context.ts` so
  every test gets a fresh in-memory fake.

Both providers expose the same `transactionServiceClient` slice, so
endpoint code (`src/routes/api/exchange-runner/...`) is identical
between dev and test.

### `ob3-credential-template.ts`

A function `ob3CredentialTemplate(retrievalId): unknown` returning a
plain JSON-LD Open Badges 3 credential template (no proof). Issuer
`did:key` matching whatever default the bundled signing-service container
uses (verified during phase 1 smoke check; if unknown, default to a
placeholder did and document the override env var).

### `runner-state.ts` (under `src/lib/interop/`)

```ts
export const ChecklistRunState = ZodFactory(
	z.enum(['idle', 'awaiting-wallet', 'wallet-connected', 'complete', 'error'])
);
export const StepRunState = ZodFactory(z.enum(['pending', 'in-flight', 'complete', 'skipped']));

export function deriveRunStateFromExchange(
	exchange: ExchangeRecord,
	stepCount: number
): { run: ChecklistRunState; perStep: StepRunState[] };
```

Pure mapping. Unit tests cover:

- `state: 'pending'` → run='awaiting-wallet', step 1 in-flight, rest pending.
- `state: 'active'` + populated DIDAuth variables → step 2/3 in-flight.
- `state: 'complete'` → run='complete', all steps complete.
- `state: 'invalid'` → run='error'.

### Server endpoints

`src/routes/api/exchange-runner/create/+server.ts`:

```ts
export const POST = async () => {
  const { transactionServiceClient, exchangeRunnerConfig } = providerCtx<...Ctx>();
  if (!exchangeRunnerConfig.enabled) {
    return new Response('Exchange runner disabled', { status: 503 });
  }
  const retrievalId = crypto.randomUUID();
  const result = await transactionServiceClient.createExchange({ retrievalId });
  return json(result);
};
```

`src/routes/api/exchange-runner/[exchangeId]/+server.ts`:

```ts
export const GET = async ({ params }) => {
  const { transactionServiceClient, exchangeRunnerConfig } = providerCtx<...Ctx>();
  if (!exchangeRunnerConfig.enabled) return new Response(..., { status: 503 });
  const exchange = await transactionServiceClient.getExchange(params.exchangeId);
  const derived = deriveRunStateFromExchange(exchange, /* known step count */);
  return json({ exchange, derived });
};
```

Both endpoints catch `TransactionServiceError`/network errors and return
descriptive JSON: `{ code, message, hint }` where `hint` is "Run `pnpm
turbo dev:full` to start the local DCC services" when the URL is
unreachable.

### Browser-side helpers (`src/lib/client/exchange-runner/`)

- `poll-exchange.ts` — `pollExchange(exchangeId, callbacks, { abort })`
  — 2s `setInterval`, 5min total timeout, calls callbacks on update /
  error / timeout. AbortController-friendly. Returns a stop fn.
- `render-qr.ts` — wraps `qrcode` (dynamic `import('qrcode')`) and
  produces a data URL or SVG string; component decides which to use.

Co-located unit tests for `poll-exchange.ts` use `vi.useFakeTimers()` to
exercise the cadence and timeout.

## Validate

```
pnpm turbo check
pnpm turbo test
```

Manual smoke (with `pnpm dev:services` running):

```
pnpm dev
curl -fsS -X POST http://localhost:5173/api/exchange-runner/create | jq .
curl -fsS http://localhost:5173/api/exchange-runner/<exchangeId> | jq .
```

The `create` call should return an exchangeId + interaction URL; the
`get` call should return the exchange in `state: 'pending'` (or
`'active'` if any wallet has touched it).
