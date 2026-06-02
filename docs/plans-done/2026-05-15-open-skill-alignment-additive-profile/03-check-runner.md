# Phase 03 — Check-runner + check registry

## Scope of phase

Build the **typed check-runner** that consumes a parsed credential
plus a `verifier-core` result and produces an `IssuerRunnerReport`.
Ship the per-requirement check library covering:

- OB 3.0 Direct Delivery issuer checklist (every requirement that can
  be evaluated statically from the credential JSON + the verifier
  result).
- Open skill-alignment additive issuer checklist.

No HTTP route yet (phase 04). No UI yet (phase 05). The runner is
pure functions + a registry, fully unit-testable.

## Code Organization Reminders

- One file per checklist's check set.
- The registry file (`checks/index.ts`) is a small mapping — no logic.
- Each `CheckFn` is a tiny pure function. Helpers stay at the bottom
  of the module that uses them. Cross-checklist helpers live in
  `check-runner.ts` or a sibling `helpers.ts` if they accumulate.
- Requirements without registered checks default to `'n/a'`.
- Keep file size ≤ ~200 lines. Split per-requirement checks freely.

## Style conventions

- **Factory functions** for the orchestrator
  (`CheckRunner`, `function checkRunner(): {…}`).
- **`ZodFactory`** for `CheckOutcome` + `IssuerRunnerReport`.
- **Domain-first**: everything under
  `src/lib/server/domain/issuer-runner/`.
- **TSDoc** on every check function explaining the requirement it
  evaluates and the inputs it depends on.
- **Tests colocated.** Table-driven tests over good + broken fixtures.

## Implementation Details

### Files

```
src/lib/server/domain/issuer-runner/
├── check-outcome.ts                          # NEW: ZodFactory
├── issuer-runner-report.ts                   # NEW: ZodFactory
├── ctdl-allowlist.ts                         # NEW: extensible host allowlist
├── check-runner.ts                           # NEW: orchestrator
├── check-runner.test.ts                      # NEW
└── checks/
    ├── index.ts                              # NEW: id → CheckFn registry
    ├── ob3-direct-delivery-issuer.ts         # NEW
    ├── ob3-direct-delivery-issuer.test.ts    # NEW
    ├── open-skill-alignment-issuer.ts        # NEW
    └── open-skill-alignment-issuer.test.ts   # NEW
```

### Types

`check-outcome.ts`:

```ts
export const CheckOutcome = ZodFactory(
	z.object({
		id: z.string(),
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		status: z.enum(['pass', 'fail', 'warn', 'n/a']),
		message: z.string()
	})
);
export type CheckOutcome = ReturnType<typeof CheckOutcome>;
```

`issuer-runner-report.ts`:

```ts
export const ChecklistGroupRef = ZodFactory(
	z.object({
		kind: z.enum(['base', 'additive']),
		profileSlug: z.string(),
		workflow: WorkflowSlug.schema,
		role: RoleSlug.schema
	})
);

export const IssuerRunnerReport = ZodFactory(
	z.object({
		verified: z.boolean(),
		fatalError: z.object({ message: z.string(), hint: z.string().optional() }).optional(),
		groups: z.array(
			z.object({
				checklist: ChecklistGroupRef.schema,
				outcomes: z.array(CheckOutcome.schema)
			})
		)
	})
);
export type IssuerRunnerReport = ReturnType<typeof IssuerRunnerReport>;
```

### Verifier-result shape

`verifier-core`'s `verifyCredential` returns a `{ verified, log,
results, errors }` shape. Phase 04 ships the typed wrapper; for
testability here, define a minimal interface the check-runner depends
on:

```ts
// In check-runner.ts
export type VerifierCoreResultLite = {
	verified: boolean;
	log?: Array<{ id: string; valid: boolean; error?: { name?: string } }>;
};
```

Phase 04 widens this and proves the real `verifier-core` output
satisfies it.

### `ctdl-allowlist.ts`

```ts
/** Hosts recognized as CTDL Credential Registry deployments. Extensible. */
export const ctdlHostAllowlist: readonly string[] = [
	'credentialengineregistry.org',
	'sandbox.credentialengineregistry.org'
];

export function classifyTargetUrl(value: unknown): 'pass' | 'warn' | 'fail' {
	if (typeof value !== 'string') return 'fail';
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return 'fail';
	}
	return ctdlHostAllowlist.includes(url.host) ? 'pass' : 'warn';
}
```

### Check registry shape

```ts
// checks/index.ts
import type { CheckOutcome } from '../check-outcome.js';

export type CheckCtx = {
	credential: unknown; // already JSON.parsed
	verifierResult: VerifierCoreResultLite;
	includeAdditive: boolean;
};

export type CheckFn = (ctx: CheckCtx) => Omit<CheckOutcome, 'id' | 'level'>;
//                                      ^^ id + level come from the checklist requirement,
//                                         so check fns return just status + message.

import { ob3DirectDeliveryIssuerChecks } from './ob3-direct-delivery-issuer.js';
import { openSkillAlignmentIssuerChecks } from './open-skill-alignment-issuer.js';

export const checkRegistry: Record<string, CheckFn> = {
	...ob3DirectDeliveryIssuerChecks,
	...openSkillAlignmentIssuerChecks
};
```

### Orchestrator

```ts
// check-runner.ts
export function CheckRunner() {
	function run(input: {
		credential: unknown;
		verifierResult: VerifierCoreResultLite;
		includeAdditive: boolean;
		checklists: Array<{
			groupRef: ChecklistGroupRef;
			requirements: ChecklistRequirement[];
		}>;
	}): IssuerRunnerReport {
		const groups = input.checklists.map(({ groupRef, requirements }) => ({
			checklist: groupRef,
			outcomes: requirements.map((req): CheckOutcome => {
				const fn = req.id ? checkRegistry[req.id] : undefined;
				if (!fn) {
					return {
						id: req.id ?? `unkeyed:${req.text.slice(0, 40)}`,
						level: req.level,
						status: 'n/a',
						message: 'No automated check registered for this requirement yet.'
					};
				}
				const { status, message } = fn({
					credential: input.credential,
					verifierResult: input.verifierResult,
					includeAdditive: input.includeAdditive
				});
				return { id: req.id!, level: req.level, status, message };
			})
		}));
		const verified = groups.every((g) =>
			g.outcomes.every((o) => o.level !== 'MUST' || o.status === 'pass')
		);
		return { verified, groups };
	}
	return { run };
}
export type CheckRunner = ReturnType<typeof CheckRunner>;
```

### Per-requirement checks

`ob3-direct-delivery-issuer.ts` exports a map keyed by the same ids
used on the OB 3.0 Direct Delivery issuer checklist. Cover at least:

- `ob3-direct-delivery.vc-data-model-v2-compliant` —
  `credential['@context']` includes `https://www.w3.org/ns/credentials/v2`
  AND a `type` containing `VerifiableCredential`. Pass / fail based
  on parse.
- `ob3-direct-delivery.openbadgecredential-type` — `type` includes
  `'OpenBadgeCredential'`.
- `ob3-direct-delivery.subject-id-is-email` —
  `credentialSubject.id` starts with `mailto:` or shape `…@…`.
- `ob3-direct-delivery.data-integrity-eddsa-rdfc-2022` — `proof.type ===
'DataIntegrityProof'` AND `proof.cryptosuite === 'eddsa-rdfc-2022'`.
- `ob3-direct-delivery.proof-creation-date` — `proof.created` is an
  ISO date.
- `ob3-direct-delivery.proof-verification-method` —
  `proof.verificationMethod` resolves under the issuer DID.
- `ob3-direct-delivery.issuer-did-method` — issuer id starts with
  `did:web:` or `did:key:`.
- `ob3-direct-delivery.bitstring-status-list-entry` —
  `credentialStatus.type` includes `'BitstringStatusListEntry'` AND
  has both `statusListCredential` and `statusListIndex`.
- `ob3-direct-delivery.signature-valid` — derives from
  `verifierResult.log` `valid_signature` row.
- `ob3-direct-delivery.status-list-verified` — derives from
  `verifierResult.log` `revocation_status` row.
- `ob3-direct-delivery.valid-until-optional` — SHOULD; pass if
  `validUntil` present, n/a if absent.

`open-skill-alignment-issuer.ts`:

- Gated on `includeAdditive`. When `false`, every additive check
  returns `'n/a'` with message `"Additive profile not selected."`
  (so the rows still render but aren't misleading).
- `open-skill-alignment.has-result-description` — at least one
  `credentialSubject.achievement.resultDescription[]` entry.
- `open-skill-alignment.recognized-result-type` — every
  `resultDescription.resultType` is one of `'RawScore'`, `'Percent'`,
  `'RubricCriterionLevel'`.
- `open-skill-alignment.percent-value-range` — every `Percent`
  `resultDescription` has `valueMin: "0"` and `valueMax: "100"`.
- `open-skill-alignment.rubric-levels-present` — every
  `RubricCriterionLevel` `resultDescription` has a non-empty
  `rubricCriterionLevel[]`.
- `open-skill-alignment.has-result` — at least one
  `credentialSubject.result[]` entry.
- `open-skill-alignment.result-links-description` — every
  `result.resultDescription` matches an existing
  `resultDescription.id`.
- `open-skill-alignment.numeric-value-in-range` — for `RawScore` /
  `Percent` linked results, `value` parses as a number within
  `[valueMin, valueMax]` (when declared).
- `open-skill-alignment.achieved-level-matches` — for
  `RubricCriterionLevel` linked results, `achievedLevel` matches one
  of the description's `rubricCriterionLevel[].id`s.
- `open-skill-alignment.ctdl-alignment-target-url` — SHOULD; for
  every alignment on `resultDescription[].alignment[]`, classify the
  `targetUrl` via `classifyTargetUrl`. If any are `'fail'` → fail.
  Else if any are `'warn'` → warn (with a message listing the
  off-allowlist hosts). Else pass.

### Tests

`ob3-direct-delivery-issuer.test.ts` and
`open-skill-alignment-issuer.test.ts` — table-driven:

```ts
const cases = [
  { name: 'raw-score fixture passes',         fixture: rawScoreFixture,
    expected: { [...]: 'pass', [...]: 'pass' } },
  { name: 'missing resultDescription fails',  fixture: brokenNoDescription,
    expected: { 'open-skill-alignment.has-result-description': 'fail' } },
  { name: 'off-allowlist host warns',         fixture: brokenOffAllowlist,
    expected: { 'open-skill-alignment.ctdl-alignment-target-url': 'warn' } },
  // …
];
```

Broken fixtures are constructed by deep-cloning a good fixture and
mutating one field — keep them next to the test file in a
`__broken-fixtures__/` directory under the checks folder.

`check-runner.test.ts`:

- Builds a small fake `VerifierCoreResultLite` and one fixture,
  asserts the report shape, `verified` flag, and that unregistered
  requirement ids default to `'n/a'`.
- Asserts `verified === false` when one MUST is `'fail'`, but
  `verified === true` when all failing rows are SHOULD/MAY.

## Validate

```sh
pnpm turbo check
pnpm turbo test
```

Fix any warnings.

**DO NOT commit between phases.**
