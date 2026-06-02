# Phase 1 — Schema + client + fake

## Scope

Surface the new `OID4VCI` field on the protocols object so the rest
of the plan has a typed end-to-end path.

- Add `OID4VCI?: string` to `ExchangeProtocols` in
  `src/lib/server/domain/exchange-runner/transaction-service-client.ts`.
- Real client passes it through unchanged (already does, since
  it's just `ExchangeProtocols(await res.json())`).
- Fake client emits a parseable
  `openid-credential-offer://?credential_offer_uri=…` URL.
- Co-located tests are updated.

## Code organization

- One concept per file. Schema lives in the same file as the rest
  of `ExchangeProtocols`; fake-side mock is in
  `fake-transaction-service-client.ts`.
- Keep the schema annotation minimal; the URL itself uses a custom
  scheme so we don't apply `.url()`.

## Implementation details

### `transaction-service-client.ts` — schema delta

```ts
export const ExchangeProtocols = ZodFactory(
	z.object({
		iu: z.string().url(),
		vcapi: z.string().url(),
		lcw: z.string().url().optional(),
		/**
		 * OID4VCI 1.0 deep link
		 * (`openid-credential-offer://?credential_offer_uri=…`). Present
		 * only when the connected transaction-service version supports
		 * OID4VCI. Older containers omit this field; the panel falls back
		 * to VCALM-only.
		 *
		 * Wire field name is uppercase `OID4VCI` (matches the spec name
		 * and the prior sveltekit spike). Schema: `z.string()` (not
		 * `.url()`) — `openid-credential-offer://` is a custom URI scheme
		 * that some `.url()` validators reject.
		 */
		OID4VCI: z.string().optional(),
		verifiablePresentationRequest: VerifiablePresentationRequest.schema
	})
);
```

### `fake-transaction-service-client.ts` — emit `OID4VCI`

In `createExchange`, alongside `iu`, `vcapi`, `lcw`, and `vpr`:

```ts
const credentialOfferUri = `${host}/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`;
const oid4vciDeepLink = `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(credentialOfferUri)}`;
return {
	exchangeId,
	protocols: {
		iu: `${host}/interactions/${exchangeId}`,
		vcapi: `${host}/workflows/claim/exchanges/${exchangeId}`,
		lcw: `${host}/lcw?xid=${exchangeId}`,
		OID4VCI: oid4vciDeepLink,
		verifiablePresentationRequest: {
			query: { type: 'DIDAuthentication' },
			challenge: `challenge-${exchangeId}`,
			domain: host
		}
	}
};
```

(Local variable stays camelCase; only the wire field key is
uppercase.)

### Tests

- `fake-transaction-service-client.test.ts` — extend the
  "createExchange returns URL-shaped iu" test with assertions on the
  new `OID4VCI` field shape:
  ```ts
  expect(protocols.OID4VCI).toMatch(/^openid-credential-offer:\/\/\?credential_offer_uri=/);
  expect(protocols.OID4VCI).toContain('/openid/credential-offer');
  ```
- `transaction-service-client.test.ts` — extend the existing happy-path
  test to receive a stubbed JSON response that includes `OID4VCI`;
  assert it survives through the parse. Add a separate test where the
  response omits the field and assert the parsed result has
  `protocols.OID4VCI === undefined`.
- All pre-existing tests pass.

## Validate

```
pnpm turbo check
pnpm turbo test
```

Both green. Build is unaffected (no route changes yet).

## Suggested commit

```
feat(exchange-runner): surface OID4VCI deep link on protocols schema
```
