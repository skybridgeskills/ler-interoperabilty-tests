# Phase 01 — Additive-profile schema + accessors

## Scope of phase

Introduce the **`AdditiveProfile`** concept in the interop model. Ship
the schema, slug enum, an empty content-list stub, and the public
accessors. No content yet — that lands in phase 02.

## Code Organization Reminders

- Prefer a granular file structure, one concept per file.
- Place more abstract things, entry points, and tests **first**; helpers
  at the bottom of files.
- Keep related functionality grouped together.
- Any temporary code (stubs, placeholders) carries a TODO comment.
- Don't pre-create files that this phase doesn't populate.

## Style conventions

- **`ZodFactory`** for `AdditiveProfileSlug` and `AdditiveProfile`.
- **Factory functions, not classes** if any runtime helpers land here.
- **Domain-first layout** — schema in `src/lib/interop/`; accessors
  augment the existing `src/lib/interop/accessors.ts`.
- **File size ≤ ~200 lines.** Both files in this phase stay small.
- **TSDoc** on every exported schema, type, and accessor.
- **Tests colocated** as `*.test.ts`.

## Implementation Details

### Files

```
src/lib/interop/
├── additive-profile-schema.ts          # NEW
├── additive-profile-schema.test.ts     # NEW
├── additive-profiles/
│   └── all-additive-profiles.ts        # NEW: empty list stub
├── accessors.ts                        # UPDATE: add additive accessors
├── accessors.test.ts                   # UPDATE
└── index.ts                            # UPDATE: re-export additive types/accessors
```

### `additive-profile-schema.ts`

```ts
import { z } from 'zod';
import { ZodFactory } from '$lib/util/zod-factory.js';
import { ProfileSlug, WorkflowChecklist } from './profile-schema.js';

/** URL slug for an additive interoperability profile. */
export const AdditiveProfileSlug = ZodFactory(z.enum(['open-skill-alignment']));
export type AdditiveProfileSlug = ReturnType<typeof AdditiveProfileSlug>;

/**
 * An interoperability profile that layers on top of one or more base
 * profiles. Additive profiles cannot be run alone: they declare which
 * base profile slugs they apply to via `appliesToBaseProfiles` and
 * contribute extra requirements via per-(role × workflow) checklists.
 */
export const AdditiveProfile = ZodFactory(
	z.object({
		id: z.string(),
		slug: AdditiveProfileSlug.schema,
		name: z.string(),
		version: z.string(),
		status: z.string(),
		lastUpdated: z.string(),
		description: z.string(),
		appliesToBaseProfiles: z.array(ProfileSlug.schema).min(1),
		checklists: z.array(WorkflowChecklist.schema)
	})
);
export type AdditiveProfile = ReturnType<typeof AdditiveProfile>;
```

### `additive-profiles/all-additive-profiles.ts`

```ts
import type { AdditiveProfile } from '../additive-profile-schema.js';

/**
 * Canonical ordered list of additive profiles. Phase 02 populates this.
 * Order is the navigation order shown on `/profiles`.
 */
// TODO(phase-02): replace empty stub with the populated open-skill-alignment additive profile.
export const allAdditiveProfiles: AdditiveProfile[] = [];
```

### `accessors.ts` — additions

```ts
import type { AdditiveProfile, AdditiveProfileSlug } from './additive-profile-schema.js';
import { allAdditiveProfiles } from './additive-profiles/all-additive-profiles.js';

/** Look up an additive profile by URL slug. */
export function additiveProfileBySlug(slug: string): AdditiveProfile | undefined {
	return allAdditiveProfiles.find((p) => p.slug === slug);
}

/** Additive profiles that apply to the given base profile slug. */
export function additiveProfilesForBaseProfile(base: string): AdditiveProfile[] {
	return allAdditiveProfiles.filter((p) => p.appliesToBaseProfiles.includes(base as never));
}
```

`additiveProfilesForBaseProfile`'s `string` parameter widens the call
site so route loaders don't have to parse the slug twice; the
`.includes(... as never)` narrows internally.

### `index.ts` — additions

Re-export `AdditiveProfile`, `AdditiveProfileSlug`, `allAdditiveProfiles`,
`additiveProfileBySlug`, `additiveProfilesForBaseProfile`.

### Tests

`additive-profile-schema.test.ts`:

- Accepts a minimal valid object (`appliesToBaseProfiles: ['ob3-direct-delivery']`,
  empty checklists).
- Rejects an empty `appliesToBaseProfiles` array.
- Rejects an unknown slug.

`accessors.test.ts` additions:

- `additiveProfileBySlug('open-skill-alignment')` returns `undefined`
  while the list is empty (locks in the stub).
- `additiveProfilesForBaseProfile('ob3-direct-delivery')` returns `[]`.

The two stub-state tests carry a TODO so phase 02 updates them to
positive assertions when content lands.

## Validate

```sh
pnpm turbo check
pnpm turbo test
```

Fix any warnings.

**DO NOT commit between phases.**
