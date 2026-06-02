# Phase 04 — verifier-core integration + verify endpoint

## Scope of phase

Add `@digitalcredentials/verifier-core` to the project. Ship a typed
client + fake, wire it into the provider context, and expose
`POST /api/issuer-runner/verify` that:

1. Parses the request body.
2. Calls `verifier-core` against the pasted credential.
3. Invokes the check-runner from phase 03 with the parsed credential
   - verifier result + selected checklists.
4. Returns a typed `IssuerRunnerReport`.

## Code Organization Reminders

- The real client and the fake live in sibling files implementing the
  same interface. Server endpoint depends on the interface, never the
  real client directly.
- Provider wiring goes in its own file so tests can swap dependencies.
- The route handler is thin — parse, call the runner, serialize.
- No business logic in the route handler.

## Style conventions

- **Factory functions** for the client + fake + runner facade.
- **`ZodFactory`** for the request body shape.
- **Provider-context DI.** Use the existing `provide*` pattern; wire
  into `build-app-context.ts`. Tests inject a fake.
- **Domain-first.** Crypto + HTTP boundary code under
  `src/lib/server/domain/issuer-runner/`. Route under
  `src/routes/api/issuer-runner/verify/`.
- **TSDoc** on the client interface and the provider.
- **Tests colocated.** Endpoint test uses the fake; one
  env-skippable smoke test uses the real client.

## Implementation Details

### Files

```
package.json                                            # UPDATE: add @digitalcredentials/verifier-core
src/lib/server/domain/issuer-runner/
├── verifier-core-client.ts                             # NEW: real client
├── verifier-core-client.test.ts                        # NEW
├── fake-verifier-core-client.ts                        # NEW
├── issuer-runner.ts                                    # NEW: factory orchestrating client + check-runner
├── issuer-runner.test.ts                              # NEW
├── provide-issuer-runner.ts                           # NEW
└── index.ts                                            # NEW: barrel
src/lib/server/build-app-context.ts                    # UPDATE: include provideIssuerRunner
src/lib/server/app-context.ts                          # UPDATE: add IssuerRunnerCtx
src/routes/api/issuer-runner/verify/
├── +server.ts                                          # NEW
└── server.test.ts                                      # NEW
```

### Dependency

`package.json` — add:

```json
"@digitalcredentials/verifier-core": "^2.0.0"
```

Pick the latest stable. If the package needs type-shims (see
`dcc-web-verifier-plus/types/modules.d.ts` for a precedent), add one
under `src/lib/types/`.

### `verifier-core-client.ts`

```ts
import * as verifierCore from '@digitalcredentials/verifier-core';

export type VerifyCredentialInput = { credential: unknown };
export type VerifyCredentialResult = {
	verified: boolean;
	log?: Array<{ id: string; valid: boolean; error?: { name?: string } }>;
	errors?: unknown;
};

export interface VerifierCoreClient {
	verifyCredential(input: VerifyCredentialInput): Promise<VerifyCredentialResult>;
}

export function RealVerifierCoreClient(): VerifierCoreClient {
	return {
		async verifyCredential({ credential }) {
			const result = await verifierCore.verifyCredential({ credential });
			return result as VerifyCredentialResult;
		}
	};
}
```

`fake-verifier-core-client.ts`:

```ts
export function FakeVerifierCoreClient(
	presets: Partial<VerifyCredentialResult> = {}
): VerifierCoreClient {
	return {
		async verifyCredential() {
			return {
				verified: presets.verified ?? true,
				log: presets.log ?? [
					{ id: 'valid_signature', valid: true },
					{ id: 'revocation_status', valid: true },
					{ id: 'expiration', valid: true },
					{ id: 'issuer_did_resolves', valid: true }
				],
				errors: presets.errors
			};
		}
	};
}
```

### `issuer-runner.ts`

```ts
import { CheckRunner } from './check-runner.js';
import { allProfiles } from '$lib/interop/profiles/all-profiles.js';
import { allAdditiveProfiles } from '$lib/interop/additive-profiles/all-additive-profiles.js';

export type VerifyInput = { credential: unknown; includeAdditive: boolean };

export function IssuerRunner({ verifierClient }: { verifierClient: VerifierCoreClient }) {
	const runner = CheckRunner();

	async function verify({ credential, includeAdditive }: VerifyInput): Promise<IssuerRunnerReport> {
		let verifierResult: VerifierCoreResultLite;
		try {
			verifierResult = await verifierClient.verifyCredential({ credential });
		} catch (e) {
			return {
				verified: false,
				fatalError: {
					message: e instanceof Error ? e.message : 'verifier-core threw an unexpected error',
					hint: 'Inspect the credential JSON for structural issues and retry.'
				},
				groups: []
			};
		}

		const base = profileBySlug('ob3-direct-delivery')!;
		const issuerChecklist = base.checklists.find(
			(c) => c.role === 'issuer' && c.workflow === 'direct-credential-issuance'
		)!;

		const checklists = [
			{
				groupRef: {
					kind: 'base',
					profileSlug: 'ob3-direct-delivery',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				requirements: flattenRequirements(issuerChecklist)
			}
		];

		if (includeAdditive) {
			const additive = additiveProfileBySlug('open-skill-alignment')!;
			const addList = additive.checklists.find(
				(c) => c.role === 'issuer' && c.workflow === 'direct-credential-issuance'
			)!;
			checklists.push({
				groupRef: {
					kind: 'additive',
					profileSlug: 'open-skill-alignment',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				requirements: flattenRequirements(addList)
			});
		}

		return runner.run({ credential, verifierResult, includeAdditive, checklists });
	}

	return { verify };
}
export type IssuerRunner = ReturnType<typeof IssuerRunner>;
```

`flattenRequirements(checklist)` walks the per-step requirements
into a flat list — the runner is checklist-aware via the registry,
not via step grouping.

### Provider

```ts
// provide-issuer-runner.ts
export function provideIssuerRunner(): { issuerRunner: IssuerRunner } {
	const verifierClient = RealVerifierCoreClient();
	return { issuerRunner: IssuerRunner({ verifierClient }) };
}
export type IssuerRunnerCtx = OutputOfProvider<typeof provideIssuerRunner>;
```

Wire `provideIssuerRunner` into `build-app-context.ts` for the
`dev`, `test`, and prod contexts. The `test-app-context.ts` overrides
the client with `FakeVerifierCoreClient()` so server-test runs stay
offline.

### Route

```ts
// src/routes/api/issuer-runner/verify/+server.ts
const VerifyRequest = ZodFactory(
	z.object({ credential: z.unknown(), includeAdditive: z.boolean().optional() })
);

export const POST = async ({ request }) => {
	const { issuerRunner } = appContext();
	let body: unknown;
	try {
		body = await request.json();
	} catch (e) {
		return json(
			{ verified: false, fatalError: { message: 'Request body is not valid JSON.' }, groups: [] },
			{ status: 400 }
		);
	}
	const parsed = VerifyRequest.schema.safeParse(body);
	if (!parsed.success) {
		return json(
			{
				verified: false,
				fatalError: { message: 'Bad request shape.', hint: parsed.error.message },
				groups: []
			},
			{ status: 400 }
		);
	}
	const report = await issuerRunner.verify({
		credential: parsed.data.credential,
		includeAdditive: parsed.data.includeAdditive ?? false
	});
	return json(report);
};
```

### Tests

- `verifier-core-client.test.ts` — small contract test against
  `FakeVerifierCoreClient`. No network.
- `issuer-runner.test.ts` — uses `FakeVerifierCoreClient` and each
  of the three fixture credentials. Asserts:
  - `verified === true` for each good fixture with
    `includeAdditive: true`.
  - When the fake reports `verified: false` with a bad-signature log,
    the resulting report's `ob3-direct-delivery.signature-valid` row
    is `'fail'` and overall `verified === false`.
- `server.test.ts` — POSTs a good fixture + assert response shape;
  posts non-JSON + asserts 400 with fatalError; posts a malformed
  request body + asserts 400.
- **Smoke test** (`issuer-runner.smoke.test.ts`, skipped when
  `process.env.RUN_VERIFIER_CORE_SMOKE !== '1'`): real client against
  the `raw-score` fixture, asserts `verified === true`. Lets us
  exercise the real package without paying for it on every CI run.

## Validate

```sh
pnpm turbo check
pnpm turbo test
```

Fix any warnings. The new dependency may surface bundler config or
type issues; address them inside this phase rather than deferring.

**DO NOT commit between phases.**
