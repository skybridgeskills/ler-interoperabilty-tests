# Phase 07 — E2E harness & CI

## Scope of phase

Add the Playwright e2e harness and a single smoke spec proving the build
runs end-to-end. Add a single GitHub Actions workflow that installs
dependencies and runs `pnpm turbo check test` on push and PR.

Files created in this phase:

- `playwright.config.ts`.
- `e2e/smoke.spec.ts` — landing page renders, `/health` returns 200.
- `.github/workflows/ci.yml`.

## Code Organization Reminders

- E2E specs go under `e2e/`; one concept per spec file.
- The `ci.yml` workflow is single-purpose; if a release/deploy workflow
  arrives later, it lives in a separate file.
- No temporary code expected.

## Style conventions

- Spec naming: `<feature>.spec.ts`. Use Playwright's `test()` /
  `expect()` (not Vitest) inside `e2e/`.
- Imports follow external → relative; only Playwright is needed here.
- Keep specs deterministic: assert on stable strings, not dates or IDs.

## Implementation Details

### `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'e2e',
	use: { baseURL: 'http://localhost:4173' }
});
```

### `e2e/smoke.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('landing page renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'LER Interoperability Test Suite'
	);
	await expect(page.getByRole('link', { name: 'Wallet' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Verifier' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Issuer' })).toBeVisible();
});

test('/health returns 200 with status ok', async ({ request }) => {
	const res = await request.get('/health');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.status).toBe('ok');
	expect(body.version).toBeDefined();
	expect(body.version.name).toBe('ler-interoperability-test-suite');
});
```

### Turbo wiring

`turbo.jsonc` from Phase 01 already declares `e2e:playwright` with a
`dependsOn: ["build"]` and `e2e` as a category task pointing at it.
Confirm those entries are present; add them if not.

### `.github/workflows/ci.yml`

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.22.0
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      # Install Playwright browsers for the storybook + client Vitest projects
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm turbo check
      - run: pnpm turbo test
        env:
          CI: '1'
```

(No e2e job per Q11 — the user opted for the single-job CI. `e2e` runs
locally only for now.)

## Validate

```sh
pnpm turbo build
pnpm turbo e2e          # smoke spec passes locally

# Open .github/workflows/ci.yml; ensure pnpm version + node version-file
# pin matches local. Ship; CI run on PR will be the final validation.
```

Confirm `pnpm turbo e2e` passes locally before pushing the workflow.

DO NOT COMMIT between phases unless specifically requested.
