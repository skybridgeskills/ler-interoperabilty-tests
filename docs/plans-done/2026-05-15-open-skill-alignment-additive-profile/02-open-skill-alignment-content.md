# Phase 02 — Open skill-alignment content

## Scope of phase

Populate the `open-skill-alignment` additive profile: meta, issuer +
verifier checklists, the credential-payload-fragment schema, and three
signed sample-credential fixtures. Wire it into
`allAdditiveProfiles`. Update the `/profiles` listing and detail-page
resolver so the additive profile is discoverable.

## Code Organization Reminders

- One concept per file. Checklists, meta, fixtures all live separately.
- Place schemas first; fixtures and helpers at the bottom.
- Sample-credential fixtures get a TSDoc comment explaining what they
  illustrate and which checklist rows they exercise.
- Keep checklist requirement `id` strings stable — phase 03 keys check
  functions off them.

## Style conventions

- **`ZodFactory`** for the `OpenSkillAlignmentFragment` shape.
- **Factory functions** for any fixture builders.
- **Domain-first**: content under
  `src/lib/interop/additive-profiles/open-skill-alignment/`.
- **File size ≤ ~200 lines.** Split fixtures per result type.
- **TSDoc** on each schema, fixture, and checklist file.
- **`asChild` on every `<Story>`** with custom layout markup.

## Implementation Details

### Files

```
src/lib/interop/additive-profiles/open-skill-alignment/
├── profile.ts                                  # NEW: meta
├── index.ts                                    # NEW: AdditiveProfile({...})
├── issuer-direct-credential-issuance.ts        # NEW: issuer checklist
├── verifier-direct-credential-verification.ts  # NEW: verifier checklist
├── payload-fragment-schema.ts                  # NEW: resultDescription[]+result[]
├── payload-fragment-schema.test.ts             # NEW
└── fixtures/
    ├── raw-score.ts                            # NEW
    ├── percent.ts                              # NEW
    └── rubric-criterion-level.ts               # NEW

src/lib/interop/
├── profile-schema.ts                           # UPDATE: ChecklistRequirement gains optional id
├── additive-profiles/all-additive-profiles.ts  # UPDATE: include openSkillAlignment

src/routes/profiles/
├── +page.svelte                                # UPDATE: render "Additive profiles" section
├── [profile]/+page.ts                          # UPDATE: resolver tries additive
└── [profile]/+page.svelte                      # UPDATE: branch on profile kind

src/lib/components/interop/additive-profile-card/
├── AdditiveProfileCard.svelte                  # NEW
├── AdditiveProfileCard.stories.svelte          # NEW
└── index.ts                                    # NEW
```

### `ChecklistRequirement.id` addition

In `src/lib/interop/profile-schema.ts`, extend `ChecklistRequirement`
with an optional stable id:

```ts
export const ChecklistRequirement = ZodFactory(
	z.object({
		id: z.string().optional(), // NEW — stable key for check-runner registration
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		text: z.string()
	})
);
```

Existing checklists stay valid (id is optional). Each new requirement
in this phase gets a kebab-case id like
`'open-skill-alignment.result-description.has-supported-result-type'`.

### Meta and checklists

`profile.ts`:

```ts
export const openSkillAlignmentMeta = {
	id: 'open-skill-alignment-v1',
	slug: 'open-skill-alignment' as const,
	name: 'Open Skill Alignment',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-05-15',
	description:
		'Additive profile that adds machine-readable skill-alignment data to an OpenBadgeCredential ' +
		'using credentialSubject.result[] and credentialSubject.achievement.resultDescription[]. ' +
		'Alignment target URLs SHOULD point at CTDL resources in the Credential Registry.',
	appliesToBaseProfiles: ['ob3-direct-delivery'] as const
};
```

`issuer-direct-credential-issuance.ts` — issuer checklist with stable
ids on every requirement. Cover at minimum:

- `MUST` — credential includes
  `credentialSubject.achievement.resultDescription[]` with ≥1 entry.
- `MUST` — every `resultDescription` entry has `id`, `type` includes
  `'ResultDescription'`, `name`, and a recognized `resultType`
  (`RawScore` | `Percent` | `RubricCriterionLevel`).
- `MUST` — `resultDescription` for `Percent` includes `valueMin: "0"`
  and `valueMax: "100"`.
- `MUST` — `resultDescription` for `RubricCriterionLevel` includes
  `rubricCriterionLevel[]` with ≥1 entry, each having `id`, `level`,
  and `name`.
- `MUST` — credential includes `credentialSubject.result[]` with ≥1
  entry, and each entry links to a matching `resultDescription` by
  `id`.
- `MUST` — for `RawScore` / `Percent` results, `value` is a non-empty
  string parseable as a number within `[valueMin, valueMax]` (when
  declared).
- `MUST` — for `RubricCriterionLevel` results, `achievedLevel` matches
  one of the linked description's `rubricCriterionLevel[].id`s.
- `SHOULD` — `alignment.targetUrl` entries on
  `achievement.resultDescription[].alignment[]` use CTDL resource URLs
  in the Credential Registry (host allowlist; warn for others, fail
  for non-URLs).
- `MAY` — `result[]` entries carry an additional `alignment[]` with
  CTDL URLs that augments the description-level alignments.

`verifier-direct-credential-verification.ts` — verifier checklist
(content-only, three SHOULD steps):

1. SHOULD parse and surface achievement-level alignments and
   `resultDescription[]` to the verifier's user.
2. SHOULD render each `result[]` entry against its matching
   `resultDescription`.
3. SHOULD treat unknown `resultType` values gracefully.

`index.ts`:

```ts
export const openSkillAlignment = AdditiveProfile({
	...openSkillAlignmentMeta,
	checklists: [issuerDirectCredentialIssuance, verifierDirectCredentialVerification]
});
```

### `payload-fragment-schema.ts`

```ts
const Alignment = z.object({
	type: z.array(z.string()).min(1), // includes 'Alignment'
	targetType: z.string(), // e.g. 'CFItem', 'CFRubricCriterionLevel'
	targetName: z.string(),
	targetFramework: z.string().optional(),
	targetCode: z.string().optional(),
	targetDescription: z.string().optional(),
	targetUrl: z.string().url()
});

const RubricCriterionLevel = z.object({
	id: z.string(),
	type: z.array(z.string()).min(1),
	alignment: z.array(Alignment).optional(),
	description: z.string().optional(),
	level: z.string(),
	name: z.string(),
	points: z.string().optional()
});

const ResultDescription = z.object({
	id: z.string(),
	type: z.array(z.string()).min(1),
	alignment: z.array(Alignment).optional(),
	allowedValue: z.array(z.string()).optional(),
	name: z.string(),
	requiredLevel: z.string().optional(),
	requiredValue: z.string().optional(),
	resultType: z.enum(['RawScore', 'Percent', 'RubricCriterionLevel']),
	rubricCriterionLevel: z.array(RubricCriterionLevel).optional(),
	valueMax: z.string().optional(),
	valueMin: z.string().optional()
});

const Result = z.object({
	type: z.array(z.string()).min(1),
	achievedLevel: z.string().optional(),
	alignment: z.array(Alignment).optional(),
	resultDescription: z.string(),
	status: z.string().optional(),
	value: z.string().optional()
});

export const OpenSkillAlignmentFragment = ZodFactory(
	z.object({
		resultDescription: z.array(ResultDescription).min(1),
		result: z.array(Result).min(1)
	})
);
export type OpenSkillAlignmentFragment = ReturnType<typeof OpenSkillAlignmentFragment>;
```

### Fixtures

`fixtures/raw-score.ts`, `percent.ts`, `rubric-criterion-level.ts` —
each exports a fully-signed OpenBadgeCredential JSON-LD object built
on a suite-owned `did:key` issuer, eddsa-rdfc-2022 proof, status list
entry pointing at a sample status list, and the matching
`resultDescription` + `result` for that result type. Use realistic
CTDL URLs (e.g.
`https://credentialengineregistry.org/resources/ce-…`).

Signing approach: ship a small static script under
`scripts/sign-fixtures.ts` that takes a base JSON + private key and
emits signed JSON. Run once during this phase to produce the static
fixtures; do not sign at module-load time.

### Wire up the listing + detail route

- `all-additive-profiles.ts` exports `[openSkillAlignment]`.
- `routes/profiles/+page.svelte` queries `allAdditiveProfiles` and
  renders a second section beneath the standalone grid using
  `AdditiveProfileCard`.
- `routes/profiles/[profile]/+page.ts` resolves first with
  `profileBySlug`, then `additiveProfileBySlug`, and returns a
  discriminated `{ kind: 'base'|'additive', profile }`.
- `routes/profiles/[profile]/+page.svelte` branches on `data.kind`.

### Storybook

`AdditiveProfileCard.stories.svelte` — one variant per additive
profile (today: just `open-skill-alignment`).

### Tests

- `payload-fragment-schema.test.ts` — accepts each of the three
  fixtures' fragment, rejects malformed variants (missing
  `resultDescription`, wrong `resultType`, non-URL `targetUrl`,
  `result.resultDescription` not present in the description list).
- Update the stub assertions added in phase 01:
  - `additiveProfileBySlug('open-skill-alignment')` returns the
    populated profile.
  - `additiveProfilesForBaseProfile('ob3-direct-delivery')` returns
    `[openSkillAlignment]`.
- Add a route load test for `/profiles/open-skill-alignment` that
  asserts `data.kind === 'additive'`.

## Validate

```sh
pnpm turbo check
pnpm turbo test
```

Fix any warnings.

**DO NOT commit between phases.**
