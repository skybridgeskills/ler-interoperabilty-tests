# Phase 02 — Build the `data-integrity-cryptosuites` additive profile

## Scope of phase

Add the `data-integrity-cryptosuites` additive profile to the registry,
applying to the renamed `vcalm` base profile. Ship four
`WorkflowChecklist`s with producer/consumer split, stable requirement
ids (no runner registration yet — content-only).

This phase ends with the new additive visible at
`/profiles/data-integrity-cryptosuites` and linked from `/profiles`,
with `pnpm turbo validate` green.

## Code organization reminders

- One `WorkflowChecklist` per file under
  `src/lib/interop/additive-profiles/data-integrity-cryptosuites/`.
- Place the abstract definitions (the `WorkflowChecklist({…})` call)
  at the top of each file; any string-construction helpers go at
  the bottom. We don't expect helpers here — the checklists are
  declarative.
- All new requirement strings get a stable `id`. Pattern:
  `data-integrity-cryptosuites.<role>.<workflow>.<step>.<assertion>`.
- Don't create a TODO-laden helper module for the
  cryptosuite-option list — declare it inline in `profile.ts` as
  prose, since a structured field on `AdditiveProfile` is explicitly
  out of scope (see 00-notes Q6).

## Style conventions

- `ZodFactory` for the slug enum extension.
- `appliesToBaseProfiles: ['vcalm'] satisfies ProfileSlug[]` — do
  **not** use `as const` (causes the Zod-readonly mismatch
  documented in the open-skill-alignment plan).
- camelCase const names: `dataIntegrityCryptosuites`,
  `dataIntegrityCryptosuitesMeta`.
- TSDoc on each exported const.
- Producer vs consumer requirements live in _separate steps_ inside
  each checklist; the step title prefixes "Producer:" / "Consumer:"
  for grepability.

## Implementation details

### 02.1 — Extend the slug enum

`src/lib/interop/additive-profile-schema.ts`:

```ts
export const AdditiveProfileSlug = ZodFactory(
	z.enum(['open-skill-alignment', 'data-integrity-cryptosuites'])
);
```

### 02.2 — Create the profile metadata

`src/lib/interop/additive-profiles/data-integrity-cryptosuites/profile.ts`:

```ts
import type { ProfileSlug } from '../../profile-schema.js';

/**
 * Identity + composition info for the data-integrity-cryptosuites
 * additive profile.
 *
 * The bundle declares two complete cryptosuite options. Producers of
 * credential proofs (issuer signing VCs, wallet signing VPs) MUST
 * support at least one option. Consumers of credential proofs
 * (wallet verifying issued VCs, verifier verifying VCs + VPs, issuer
 * verifying DID-auth VPs) MUST support every option.
 *
 * | Option | Cryptosuite       | Key type | DID methods         |
 * |--------|-------------------|----------|---------------------|
 * | EdDSA  | eddsa-rdfc-2022   | Ed25519  | did:web, did:key    |
 * | ECDSA  | ecdsa-rdfc-2019   | P-256    | did:web, did:key    |
 */
export const dataIntegrityCryptosuitesMeta = {
	id: 'data-integrity-cryptosuites-v1',
	slug: 'data-integrity-cryptosuites' as const,
	name: 'Data Integrity Cryptosuites',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-05-16',
	description:
		'Additive profile that bundles two complete Data Integrity cryptosuite options for ' +
		'OB 3.0 credentials and VCs/VPs: EdDSA (eddsa-rdfc-2022 + Ed25519) and ECDSA ' +
		'(ecdsa-rdfc-2019 + P-256). Issuer/holder identifiers MUST use did:web or did:key ' +
		'with a verification method matching the chosen cryptosuite. Producers (credential/' +
		'presentation signers) MUST support at least one option; consumers (verifiers, ' +
		'including issuers during DID-auth) MUST support every option in the bundle.',
	appliesToBaseProfiles: ['vcalm'] satisfies ProfileSlug[]
};
```

### 02.3 — Issuer × credential-issuance checklist

`src/lib/interop/additive-profiles/data-integrity-cryptosuites/issuer-credential-issuance.ts`:

```ts
import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Credential Issuance × VCALM, additive layer for the
 * data-integrity-cryptosuites bundle.
 *
 * Split into two steps: a producer step covering the VC-signing
 * obligations and a consumer step covering DID-auth VP verification
 * obligations that the issuer service performs to bind
 * credentialSubject.id.
 */
export const issuerCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'vcalm',
	steps: [
		{
			title: 'Producer: sign the credential with a supported cryptosuite',
			summary:
				"Pick at least one of the bundle's cryptosuite options and sign every issued " +
				'OpenBadgeCredential with it. The issuer DID must carry a verification method ' +
				'whose key type matches the chosen cryptosuite.',
			requirements: [
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.cryptosuite-supported',
					level: 'MUST',
					text: "MUST sign each VC using at least one of the bundle's cryptosuites: `eddsa-rdfc-2022` (Ed25519) or `ecdsa-rdfc-2019` (P-256)."
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.did-method',
					level: 'MUST',
					text: 'MUST use a did:web or did:key issuer identifier.'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.key-type-matches',
					level: 'MUST',
					text: 'MUST include in the issuer DID document a verification method whose key type matches the chosen cryptosuite (Ed25519 for eddsa-rdfc-2022; P-256 for ecdsa-rdfc-2019).'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.producer.proof-purpose',
					level: 'MUST',
					text: 'MUST set the proof `proofPurpose` to `assertionMethod` and reference a verification method id resolvable in the issuer DID document.'
				}
			]
		},
		{
			title: 'Consumer: verify the DID-auth presentation in any supported cryptosuite',
			summary:
				'When the wallet posts a DID-auth verifiablePresentation, the issuer service ' +
				'verifies its proof to bind credentialSubject.id. The issuer service MUST be ' +
				"able to verify presentations using any of the bundle's cryptosuite options.",
			requirements: [
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.consumer.verify-vp-all',
					level: 'MUST',
					text: 'MUST verify holder VP proofs using **every** cryptosuite in the bundle (`eddsa-rdfc-2022` and `ecdsa-rdfc-2019`).'
				},
				{
					id: 'data-integrity-cryptosuites.issuer.credential-issuance.consumer.resolve-holder-dids',
					level: 'MUST',
					text: "MUST resolve holder did:web and did:key identifiers to DID documents with the matching key type for the VP's cryptosuite."
				}
			]
		}
	]
});
```

### 02.4 — Wallet × credential-acceptance checklist

`src/lib/interop/additive-profiles/data-integrity-cryptosuites/wallet-credential-acceptance.ts`:

Producer step: signing the DID-auth VP (≥1 option).
Consumer step: verifying the received VC (all options).

Use ids:

- `data-integrity-cryptosuites.wallet.credential-acceptance.producer.vp-cryptosuite-supported` (MUST ≥1)
- `data-integrity-cryptosuites.wallet.credential-acceptance.producer.holder-did-method` (MUST did:web or did:key)
- `data-integrity-cryptosuites.wallet.credential-acceptance.producer.key-type-matches`
- `data-integrity-cryptosuites.wallet.credential-acceptance.consumer.verify-vc-all`
- `data-integrity-cryptosuites.wallet.credential-acceptance.consumer.resolve-issuer-dids`

### 02.5 — Wallet × credential-presentation checklist

`src/lib/interop/additive-profiles/data-integrity-cryptosuites/wallet-credential-presentation.ts`:

Producer-only (the wallet signs the VP it sends). One step:

- `data-integrity-cryptosuites.wallet.credential-presentation.producer.vp-cryptosuite-supported` (MUST ≥1)
- `data-integrity-cryptosuites.wallet.credential-presentation.producer.holder-did-method`
- `data-integrity-cryptosuites.wallet.credential-presentation.producer.key-type-matches`
- `data-integrity-cryptosuites.wallet.credential-presentation.producer.preserve-vc-proofs` (MUST preserve original VC proofs inside the VP — the VC stays signed with whatever cryptosuite the issuer chose; the VP's own proof is the holder's)

### 02.6 — Verifier × credential-request-and-verification checklist

`src/lib/interop/additive-profiles/data-integrity-cryptosuites/verifier-credential-request-and-verification.ts`:

Consumer-only. One step covering VP and VC verification both:

- `data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.verify-vp-all`
- `data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.verify-vc-all`
- `data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.resolve-issuer-dids`
- `data-integrity-cryptosuites.verifier.credential-request-and-verification.consumer.resolve-holder-dids`

### 02.7 — Compose and register

`src/lib/interop/additive-profiles/data-integrity-cryptosuites/index.ts`:

```ts
import { AdditiveProfile } from '../../additive-profile-schema.js';

import { issuerCredentialIssuance } from './issuer-credential-issuance.js';
import { dataIntegrityCryptosuitesMeta } from './profile.js';
import { verifierCredentialRequestAndVerification } from './verifier-credential-request-and-verification.js';
import { walletCredentialAcceptance } from './wallet-credential-acceptance.js';
import { walletCredentialPresentation } from './wallet-credential-presentation.js';

/**
 * The data-integrity-cryptosuites additive profile, ready for use in
 * the UI + accessors. Layers two cryptosuite options (EdDSA + ECDSA)
 * on top of the vcalm base profile across all 4 vcalm workflows.
 */
export const dataIntegrityCryptosuites = AdditiveProfile({
	...dataIntegrityCryptosuitesMeta,
	checklists: [
		issuerCredentialIssuance,
		walletCredentialAcceptance,
		walletCredentialPresentation,
		verifierCredentialRequestAndVerification
	]
});

export { dataIntegrityCryptosuitesMeta } from './profile.js';
```

### 02.8 — Add to the all-additive-profiles registry

`src/lib/interop/additive-profiles/all-additive-profiles.ts`:

```ts
import type { AdditiveProfile } from '../additive-profile-schema.js';

import { dataIntegrityCryptosuites } from './data-integrity-cryptosuites/index.js';
import { openSkillAlignment } from './open-skill-alignment/index.js';

export const allAdditiveProfiles: AdditiveProfile[] = [
	openSkillAlignment,
	dataIntegrityCryptosuites
];
```

### 02.9 — Update or add accessor tests

In `src/lib/interop/accessors.test.ts`:

- The existing `additiveProfilesForBaseProfile('vcalm')` test (from
  Phase 01 where we updated it to expect `[]`) now must expect the new
  additive: change it to assert the result includes
  `dataIntegrityCryptosuites`.
- Add a positive lookup test: `additiveProfileBySlug('data-integrity-cryptosuites')`
  resolves to the new profile.

## Validation

From the project root:

```sh
pnpm turbo check
pnpm turbo test
pnpm turbo build   # smoke-tests the route graph including /profiles/data-integrity-cryptosuites
```

Visit `/profiles/data-integrity-cryptosuites` in `pnpm dev` to
confirm it renders (the existing detail page already has additive
branching). Visit `/profiles/vcalm` to confirm the renamed base
profile renders.

Do **not** commit between phases.
