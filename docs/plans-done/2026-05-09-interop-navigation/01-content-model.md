# Phase 1 — Interop content model

## Scope of phase

Stand up the typed content module under `src/lib/interop/` that the rest of
the plan builds on:

- Move `ZodFactory` out of `$lib/server/util/` so client code can import it.
- Define `Profile`, `WorkflowChecklist`, `ChecklistStep`, `ChecklistRequirement`,
  and the `RoleSlug` / `WorkflowSlug` / `ProfileSlug` enums via `ZodFactory`.
- Author the three profiles (VCALM-EdDSA, OID4-ECDSA, OB 3.0 Direct Delivery)
  and their per-(role × workflow) checklists, mirroring the source guide.
- Provide accessor helpers: `profileBySlug`, `allProfiles`, `roleBySlug`,
  `allRoles`, `workflowBySlug`, `allWorkflows`, `workflowsForRole`,
  `combinationFor(role, workflow, profile)`, `allCombinations()`, and
  `profileWorkflows(profile)`.
- Co-located unit tests asserting the data parses against the schemas, the
  count of combinations is exactly 10, and accessor lookups return / refuse
  the right entries.

## Code Organization Reminders

- Prefer a granular file structure, one concept per file.
- Place more abstract things (schemas, accessor entry-points, tests) **first**.
- Place helper utility functions **at the bottom** of files.
- Keep related functionality grouped together (one folder per profile).
- If a per-profile file approaches ~200 lines, split it into one file per
  workflow checklist and re-aggregate via `<profile>/index.ts`.
- Any temporary code gets a `TODO:` comment.

## Style conventions

- **Factory functions, not classes.** No classes anywhere in this phase.
- **`ZodFactory` for shared schemas** — every exported shape uses it and
  exports both `Foo` (the factory) and `type Foo = ReturnType<typeof Foo>`.
- **Domain-first layout.** Everything under `src/lib/interop/`. The existing
  server-only utilities stay where they are.
- **File size ≤ ~200 lines.** Split per-profile content into per-workflow
  files when needed.
- **Naming.** Files `kebab-case.ts`, accessors `camelCase` verbs/nouns,
  types `PascalCase`.
- **Imports.** Three groups (external, `$lib/`, relative).
- **TSDoc** on every public schema + accessor.
- **Tests.** Plain `*.test.ts` for schema + accessor logic (server Vitest
  project picks them up).

## Implementation Details

### Step 1 — relocate `ZodFactory` so client code can import it

1. Move `src/lib/server/util/zod-factory.ts` → `src/lib/util/zod-factory.ts`.
2. Update the one existing import in
   `src/lib/server/util/app-version.ts` from
   `import { ZodFactory } from './zod-factory.js'` to
   `import { ZodFactory } from '$lib/util/zod-factory.js'`.
3. No other callers — confirm via `grep -rn "zod-factory" src/`.

### Step 2 — schemas (`src/lib/interop/profile-schema.ts`)

```ts
import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

export const RoleSlug = ZodFactory(z.enum(['issuer', 'wallet', 'verifier']));
export type RoleSlug = ReturnType<typeof RoleSlug>;

export const WorkflowSlug = ZodFactory(
	z.enum([
		'credential-issuance',
		'credential-acceptance',
		'credential-request-and-verification',
		'credential-presentation',
		'direct-credential-issuance',
		'direct-credential-verification'
	])
);
export type WorkflowSlug = ReturnType<typeof WorkflowSlug>;

export const ProfileSlug = ZodFactory(z.enum(['vcalm-eddsa', 'oid4-ecdsa', 'ob3-direct-delivery']));
export type ProfileSlug = ReturnType<typeof ProfileSlug>;

export const ChecklistRequirement = ZodFactory(
	z.object({
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		text: z.string()
	})
);
export type ChecklistRequirement = ReturnType<typeof ChecklistRequirement>;

export const ChecklistStep = ZodFactory(
	z.object({
		title: z.string(),
		summary: z.string(),
		requirements: z.array(ChecklistRequirement.schema)
	})
);
export type ChecklistStep = ReturnType<typeof ChecklistStep>;

export const WorkflowChecklist = ZodFactory(
	z.object({
		role: RoleSlug.schema,
		workflow: WorkflowSlug.schema,
		profile: ProfileSlug.schema,
		steps: z.array(ChecklistStep.schema)
	})
);
export type WorkflowChecklist = ReturnType<typeof WorkflowChecklist>;

export const ProfileKeyComponent = ZodFactory(z.object({ label: z.string(), value: z.string() }));
export type ProfileKeyComponent = ReturnType<typeof ProfileKeyComponent>;

export const Profile = ZodFactory(
	z.object({
		id: z.string(),
		slug: ProfileSlug.schema,
		name: z.string(),
		version: z.string(),
		status: z.string(),
		lastUpdated: z.string(),
		description: z.string(),
		keyComponents: z.array(ProfileKeyComponent.schema),
		useCases: z.array(z.string()),
		notes: z.array(z.string()).optional(),
		checklists: z.array(WorkflowChecklist.schema)
	})
);
export type Profile = ReturnType<typeof Profile>;
```

Co-located test (`profile-schema.test.ts`) asserts:

- A minimal valid `Profile` parses.
- Invalid `level` / unknown `role` / unknown `workflow` enum values throw.

### Step 3 — roles + workflows (`roles.ts`, `workflows.ts`)

`roles.ts`:

```ts
import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { RoleSlug } from './profile-schema.js';

export const Role = ZodFactory(
	z.object({
		slug: RoleSlug.schema,
		name: z.string(), // "Issuer"
		plural: z.string(), // "Issuers"
		blurb: z.string() // 1-line description
	})
);
export type Role = ReturnType<typeof Role>;

/** Canonical ordered list of roles. Order is the navigation order. */
export const allRoles: Role[] = [
	Role({
		slug: 'issuer',
		name: 'Issuer',
		plural: 'Issuers',
		blurb: 'Create and deliver credentials to learners.'
	}),
	Role({
		slug: 'wallet',
		name: 'Wallet',
		plural: 'Wallets',
		blurb: 'Receive credentials from issuers and present them to verifiers on behalf of the holder.'
	}),
	Role({
		slug: 'verifier',
		name: 'Verifier',
		plural: 'Verifiers',
		blurb: 'Request, receive, and verify credentials.'
	})
];

export function roleBySlug(slug: string): Role | undefined {
	return allRoles.find((r) => r.slug === slug);
}
```

`workflows.ts` mirrors that pattern with one `Workflow` per slug; each
`Workflow` records `slug`, `name`, `role` (the primary role that implements
that workflow), `pairedWith` (the other workflow in its conceptual pair, if
any), and a 1–3 sentence blurb pulled from the source guide.

Source mapping (workflow → primary role):

| Workflow slug                       | Primary role |
| ----------------------------------- | ------------ |
| credential-issuance                 | issuer       |
| credential-acceptance               | wallet       |
| credential-request-and-verification | verifier     |
| credential-presentation             | wallet       |
| direct-credential-issuance          | issuer       |
| direct-credential-verification      | verifier     |

Tests assert:

- `allRoles` length is 3, slugs are `issuer | wallet | verifier`.
- `allWorkflows` length is 6, slugs are the canonical list.
- `roleBySlug('verifier')` returns the verifier; `roleBySlug('xxx')` returns
  `undefined`.

### Step 4 — per-profile data (`src/lib/interop/profiles/<profile>.ts`)

Author one file per profile with its `Profile` record and embedded
`checklists` array. Drawn verbatim from the source guide for step titles +
requirement text:

- `vcalm-eddsa.ts` — 4 checklists: issuer/credential-issuance,
  wallet/credential-acceptance, verifier/credential-request-and-verification,
  wallet/credential-presentation.
- `oid4-ecdsa.ts` — 4 checklists, same workflows as VCALM but with OID4VCI/
  OID4VP protocols and ECDSA suite.
- `ob3-direct-delivery.ts` — 2 checklists:
  issuer/direct-credential-issuance and
  verifier/direct-credential-verification.

If any single file approaches 200 lines, split into a folder:

```
profiles/vcalm-eddsa/
├── profile.ts            # the Profile record without checklists
├── credential-issuance.ts
├── credential-acceptance.ts
├── credential-request-and-verification.ts
├── credential-presentation.ts
└── index.ts              # composes profile + checklists, exports vcalmEddsa
```

`profiles/all-profiles.ts` collects them:

```ts
import type { Profile } from '../profile-schema.js';

import { vcalmEddsa } from './vcalm-eddsa.js';
import { oid4Ecdsa } from './oid4-ecdsa.js';
import { ob3DirectDelivery } from './ob3-direct-delivery.js';

/** Canonical ordered list of profiles. */
export const allProfiles: Profile[] = [vcalmEddsa, oid4Ecdsa, ob3DirectDelivery];
```

### Step 5 — accessors (`accessors.ts`)

```ts
import { allProfiles } from './profiles/all-profiles.js';
import { allRoles } from './roles.js';
import { allWorkflows } from './workflows.js';
import type {
	Profile,
	ProfileSlug,
	RoleSlug,
	WorkflowChecklist,
	WorkflowSlug
} from './profile-schema.js';
import type { Role } from './roles.js';
import type { Workflow } from './workflows.js';

/** Look up a profile by URL slug. */
export function profileBySlug(slug: string): Profile | undefined {
	return allProfiles.find((p) => p.slug === slug);
}

/** Look up a role by URL slug. */
export function roleBySlug(slug: string): Role | undefined {
	return allRoles.find((r) => r.slug === slug);
}

/** Look up a workflow by URL slug. */
export function workflowBySlug(slug: string): Workflow | undefined {
	return allWorkflows.find((w) => w.slug === slug);
}

/** Workflows the given role is the primary participant in. */
export function workflowsForRole(role: RoleSlug): Workflow[] {
	return allWorkflows.filter((w) => w.role === role);
}

/** Profiles that include the given role × workflow combination. */
export function profilesForCombination(role: RoleSlug, workflow: WorkflowSlug): Profile[] {
	return allProfiles.filter((p) =>
		p.checklists.some((c) => c.role === role && c.workflow === workflow)
	);
}

/** Resolve a (role, workflow, profile) checklist; returns undefined if invalid. */
export function combinationFor(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): { profile: Profile; checklist: WorkflowChecklist } | undefined {
	const p = profileBySlug(profile);
	const checklist = p?.checklists.find((c) => c.role === role && c.workflow === workflow);
	if (!p || !checklist) return undefined;
	return { profile: p, checklist };
}

/** Every valid (role, workflow, profile) combination for prerender entries(). */
export function allCombinations(): {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
}[] {
	return allProfiles.flatMap((p) =>
		p.checklists.map((c) => ({ role: c.role, workflow: c.workflow, profile: p.slug }))
	);
}

/** Workflows present in the given profile, with the primary role. */
export function profileWorkflows(profile: Profile): { workflow: Workflow; role: Role }[] {
	return profile.checklists.map((c) => ({
		workflow: workflowBySlug(c.workflow)!,
		role: roleBySlug(c.role)!
	}));
}
```

`accessors.test.ts` asserts:

- `allCombinations()` length is exactly 10.
- Each profile's checklists match the expected role/workflow set:
  - `vcalmEddsa`: 4 entries (issuer/issuance, wallet/acceptance,
    verifier/request-and-verification, wallet/presentation).
  - `oid4Ecdsa`: same 4.
  - `ob3DirectDelivery`: 2 entries (issuer/direct-issuance,
    verifier/direct-verification).
- `combinationFor('issuer', 'credential-issuance', 'vcalm-eddsa')` returns a
  defined value with at least one step.
- `combinationFor('issuer', 'credential-issuance', 'ob3-direct-delivery')`
  returns `undefined` (invalid combo).
- `profilesForCombination('wallet', 'credential-presentation')` returns the
  two protocol-based profiles.

### Step 6 — barrel (`index.ts`)

```ts
export * from './profile-schema.js';
export * from './roles.js';
export * from './workflows.js';
export * from './accessors.js';
export { allProfiles } from './profiles/all-profiles.js';
```

## Validate

Run from repo root:

```
pnpm turbo check
pnpm turbo test
```

Both must pass before moving on.
