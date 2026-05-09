# Phase 3 — Home page + AppHeader

## Scope of phase

- Update `LandingPage.svelte` to show an overview of all six workflows
  grouped by their conceptual pair (Issue to Wallet, Verify from Wallet,
  Standalone Operations). Each workflow links to its role landing and
  shows `ProfileBadge`s for its supported profiles.
- Update `AppHeader.svelte` to include a `Profiles` link after the three
  role links (order: Wallet → Verifier → Issuer → Profiles).
- Update `LandingPage.stories.svelte` to render with the new content.

## Code Organization Reminders

- Keep `LandingPage.svelte` focused on layout. If sections grow long,
  extract a child component (e.g. `WorkflowGroupSection.svelte`) inside
  `src/lib/pages/landing/` rather than a single 300-line file.
- Any temporary code gets a `TODO:` comment.

## Style conventions

- Tailwind utility classes only.
- Use the existing typographic scale (`text-display-lg`, `text-headline-md`,
  `text-body-md`).
- Imports: external → `$lib/` → relative.

## Implementation Details

### `LandingPage.svelte` content

Three sections:

1. **Hero** — keep the title + intro paragraph (slightly tightened to call
   out the role × workflow × profile mental model).
2. **Roles** — keep the three role cards from the existing landing,
   pointing to `/issuer`, `/wallet`, `/verifier`. Replace the "Coming soon"
   text with each role's `blurb` from `allRoles`.
3. **Workflows** — new section. For each conceptual pair, render a
   subhead and the workflows in that pair as `WorkflowCard`s. Group
   workflows by:
   - "Issue to Wallet" — `credential-issuance`, `credential-acceptance`
   - "Verify from Wallet" — `credential-request-and-verification`,
     `credential-presentation`
   - "Standalone Operations" — `direct-credential-issuance`,
     `direct-credential-verification`

Group definitions can live in `src/lib/interop/workflow-groups.ts` (still
under the interop module, since it's content metadata):

```ts
import type { Workflow, WorkflowSlug } from './profile-schema.js';
import { workflowBySlug } from './accessors.js';

export type WorkflowGroup = {
	slug: 'issue-to-wallet' | 'verify-from-wallet' | 'standalone';
	name: string;
	blurb: string;
	workflowSlugs: WorkflowSlug[];
};

export const allWorkflowGroups: WorkflowGroup[] = [
	{
		slug: 'issue-to-wallet',
		name: 'Issue to Wallet',
		blurb: 'Protocol-based credential delivery from issuers to holder wallets.',
		workflowSlugs: ['credential-issuance', 'credential-acceptance']
	},
	{
		slug: 'verify-from-wallet',
		name: 'Verify from Wallet',
		blurb: 'Holders present credentials to verifiers in response to a credential request.',
		workflowSlugs: ['credential-request-and-verification', 'credential-presentation']
	},
	{
		slug: 'standalone',
		name: 'Standalone Operations',
		blurb: 'Direct credential download / file or copy-paste workflows without a wallet.',
		workflowSlugs: ['direct-credential-issuance', 'direct-credential-verification']
	}
];

export function workflowsInGroup(group: WorkflowGroup): Workflow[] {
	return group.workflowSlugs.map((s) => workflowBySlug(s)!);
}
```

Re-export from `src/lib/interop/index.ts`.

### `AppHeader.svelte` change

Add a `Profiles` link after the three role nav links:

```svelte
<a href={resolve('/profiles')} class="text-foreground hover:text-primary">Profiles</a>
```

Update the `AppHeader.stories.svelte` snapshot if any (none currently
asserts hard text — the existing stories file just renders, so this should
be safe).

## Validate

```
pnpm turbo check
pnpm turbo test
```

Both must pass. Manually load `/` in `pnpm dev` to confirm the new home
renders with all three sections and that the header `Profiles` link
navigates (the page itself doesn't exist until phase 6 — that's fine; it
will 404 in dev until then but the link/check should still pass).
