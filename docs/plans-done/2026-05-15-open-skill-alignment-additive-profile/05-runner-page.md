# Phase 05 — Runner page UI

## Scope of phase

Build the user-facing runner page at
`/issuer/direct-credential-issuance/ob3-direct-delivery/run`:

- Paste textarea for the credential JSON.
- "Load sample" picker that drops the chosen fixture into the
  textarea.
- "Include open skill alignment requirements" toggle.
- "Verify" button that POSTs to `/api/issuer-runner/verify` and
  renders the typed report.
- Per-requirement report panel grouped by checklist (base + optional
  additive) with pass / fail / warn / n/a rows.
- A "Run this" CTA on the existing read-only checklist page that
  links to the runner.

Storybook stories cover every render state.

## Code Organization Reminders

- Components stay small (~150 lines each). Extract sub-components if
  they grow.
- Page-level component owns the state machine. Sub-components are
  presentational, driven by props/snippets.
- Place reusable types in a sibling `*-types.ts` file.
- All `<Story>` blocks use `asChild` when they include layout markup.

## Style conventions

- **Svelte 5 runes.** `$state`, `$derived`, `$props`, `$effect`.
- **No singletons.** State stays page-local.
- **shadcn-svelte primitives** from `src/lib/components/ui/`.
- **Tokyo Night theme tokens** for all colors — no hardcoded hex.
- **`ZodFactory`** is not needed in components; types come from the
  `IssuerRunnerReport` import.
- **TSDoc** on every exported component prop type.

## Implementation Details

### Files

```
src/lib/components/interop/issuer-runner/
├── credential-paste-form/
│   ├── CredentialPasteForm.svelte               # NEW
│   ├── CredentialPasteForm.stories.svelte       # NEW
│   └── index.ts                                 # NEW
├── requirement-report/
│   ├── RequirementReport.svelte                 # NEW
│   ├── RequirementReport.stories.svelte         # NEW
│   ├── outcome-status-badge.ts                  # NEW: status → variant + label
│   └── index.ts                                 # NEW
├── issuer-runner-panel/
│   ├── IssuerRunnerPanel.svelte                 # NEW
│   ├── IssuerRunnerPanel.stories.svelte         # NEW
│   ├── issuer-runner-panel-types.ts             # NEW
│   └── index.ts                                 # NEW
src/lib/pages/runnable-issuer-direct-issuance/
├── RunnableIssuerDirectIssuancePage.svelte      # NEW
└── index.ts                                     # NEW
src/routes/issuer/direct-credential-issuance/ob3-direct-delivery/run/
├── +page.svelte                                 # NEW
└── +page.ts                                     # NEW: prerender = false
src/routes/issuer/[workflow]/[profile]/+page.svelte  # UPDATE: "Run this" CTA when combo has a runner
```

### `CredentialPasteForm`

Props:

```ts
type Props = {
	value: string;
	includeAdditive: boolean;
	status: 'idle' | 'running' | 'done' | 'error';
	onChange: (next: string) => void;
	onToggleAdditive: (next: boolean) => void;
	onLoadSample: (resultType: 'RawScore' | 'Percent' | 'RubricCriterionLevel') => void;
	onVerify: () => void;
};
```

Renders:

- A small `Tabs` or `Select` for sample loading (label: "Load sample"
  → three options).
- A `Textarea` (full width, `rows={20}`, monospace font from JetBrains
  Mono token).
- A `Switch` for the additive toggle, with copy "Include open skill
  alignment requirements".
- A primary `Button` ("Verify"), disabled when `value` is empty or
  status === 'running'. Shows a spinner state when running.

### `RequirementReport`

Props:

```ts
type Props = { report: IssuerRunnerReport };
```

Renders a summary banner (green / amber / red depending on `verified`

- fatalError) and per-group sections. Each row uses
  `outcome-status-badge.ts` to map `{status, level} → badge variant +
label`:

* `pass` → green check, label `PASS`
* `fail` (MUST) → red x, label `FAIL · MUST`
* `fail` (SHOULD) → orange exclamation, label `FAIL · SHOULD`
* `warn` → yellow triangle, label `WARN`
* `n/a` → muted dash, label `N/A`

Row text shows the requirement text + the check `message`. Group
header carries the checklist's `groupRef` summary ("OB 3.0 Direct
Delivery · Issuer · Direct Credential Issuance" / "Open Skill
Alignment · Issuer · Direct Credential Issuance").

### `IssuerRunnerPanel`

Receives the full state plus action callbacks; composes
`CredentialPasteForm` and conditionally `RequirementReport`. Shows a
top-of-panel error block when `report?.fatalError` is set, beneath
the form.

### `RunnableIssuerDirectIssuancePage`

```ts
let credentialText = $state<string>('');
let includeAdditive = $state<boolean>(false);
let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
let report = $state<IssuerRunnerReport | undefined>(undefined);

async function verify() {
	let parsed: unknown;
	try {
		parsed = JSON.parse(credentialText);
	} catch (e) {
		report = {
			verified: false,
			fatalError: { message: 'Pasted text is not valid JSON.' },
			groups: []
		};
		status = 'done';
		return;
	}
	status = 'running';
	try {
		const res = await fetch('/api/issuer-runner/verify', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ credential: parsed, includeAdditive })
		});
		report = (await res.json()) as IssuerRunnerReport;
		status = 'done';
	} catch (e) {
		report = {
			verified: false,
			fatalError: { message: e instanceof Error ? e.message : String(e) },
			groups: []
		};
		status = 'error';
	}
}

function loadSample(resultType: 'RawScore' | 'Percent' | 'RubricCriterionLevel') {
	credentialText = JSON.stringify(sampleFor(resultType), null, 2);
	report = undefined;
	status = 'idle';
}
```

Samples are imported from
`$lib/interop/additive-profiles/open-skill-alignment/fixtures/`.

### Route shell

`+page.svelte`:

```svelte
<script lang="ts">
	import { RunnableIssuerDirectIssuancePage } from '$lib/pages/runnable-issuer-direct-issuance/index.js';
</script>

<RunnableIssuerDirectIssuancePage />
```

`+page.ts`:

```ts
export const prerender = false;
```

### "Run this" CTA

`src/routes/issuer/[workflow]/[profile]/+page.svelte` — when the
loaded `(workflow, profile)` matches
`('direct-credential-issuance', 'ob3-direct-delivery')`, render a
prominent CTA card linking to the runner. Use the existing live-test
color tokens (already used by the wallet-acceptance runner card) for
visual consistency.

### Storybook stories

`IssuerRunnerPanel.stories.svelte`:

- `Idle`
- `Loading sample` (additive off)
- `Running`
- `Pass — additive off`
- `Pass — additive on, RawScore`
- `Pass — additive on, Percent`
- `Pass — additive on, RubricCriterionLevel`
- `Partial fail — missing resultDescription`
- `Warn — off-allowlist host`
- `Fatal — invalid JSON`
- `Fatal — verifier-core threw`

Each story builds a synthetic `IssuerRunnerReport` matching the state
it depicts. No network calls in stories.

`CredentialPasteForm.stories.svelte`, `RequirementReport.stories.svelte`
get smaller per-component variants.

### Tests

- Component tests for `CredentialPasteForm` (disabled state of Verify
  when textarea empty / when running) and `RequirementReport` (badge
  variants per status × level).
- Page-level smoke test (browser project) that loads the page, pastes
  a sample, toggles additive, clicks Verify against a `fetch` mock
  returning a passing report, and asserts the summary banner renders
  "Verified".

## Validate

```sh
pnpm turbo check
pnpm turbo test
pnpm turbo storybook   # eyeball the new stories during phase work
```

Fix any warnings.

**DO NOT commit between phases.**
