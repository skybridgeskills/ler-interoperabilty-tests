import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import { scenarioBySlug } from '$lib/interop/scenarios/index.js';

import {
	demoScenario,
	directDeliveryScenario,
	presentScenario,
	singleStepScenario,
	storedRun
} from './scenario-fixture.js';
import ScenarioPage from './ScenarioPage.svelte';
import { stubExchangeApi, type StubBehaviour } from './stub-exchange-api.js';

/**
 * The page's acceptance criteria, driven against a stubbed runner API.
 *
 * The wallet-in-hand pass is a human one and belongs to the review gate; what
 * is pinned here is the choreography — run order, the label guard, when a
 * question becomes answerable, when a run records, and the errored dead end.
 */

/**
 * The store's own reader drops any record whose slug is not in `allScenarios`,
 * and the catalog is empty until M6 authors it — so a fixture scenario's record
 * is written and then filtered out on read. What was persisted is read straight
 * off the key instead.
 */
const STORAGE_KEY = 'lits.scenario-runs.v1';

function persistedRun(slug: string): ScenarioRunRecord | undefined {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return undefined;
	return (JSON.parse(raw) as Record<string, ScenarioRunRecord>)[slug];
}

/**
 * The three Vitest projects run in parallel, two of them driving a real browser,
 * and `turbo validate` runs a Vite build alongside them. Real clicks carry
 * Playwright's actionability waits, which is enough to trip the default timeout
 * under that load — so the interactive describes get the same allowance the
 * server route tests already take, for the same reason.
 */
const UNDER_LOAD = { timeout: 20_000 };

let uninstall: (() => void) | undefined;

function withApi(behaviour: StubBehaviour) {
	uninstall?.();
	uninstall = stubExchangeApi(behaviour);
}

afterEach(() => {
	uninstall?.();
	uninstall = undefined;
	localStorage.removeItem(STORAGE_KEY);
});

/**
 * Answer the live step's question, `times` times over.
 *
 * Each answer advances the run, and the next step mints its exchange
 * asynchronously — so this waits for each prompt to appear rather than
 * sampling, which would race the mint and stop after the first step.
 */
async function answerEachStep(option: string, times: number) {
	for (let i = 0; i < times; i++) {
		const button = page.getByRole('button', { name: option, exact: true });
		await expect.element(button).toBeInTheDocument();
		await button.click();
	}
}

describe('ScenarioPage — the label guard', UNDER_LOAD, () => {
	it('never renders a shuffled step’s authored title, only shuffleLabel + position', async () => {
		withApi({ kind: 'awaits' });
		const { container } = render(ScenarioPage, { scenario: demoScenario });

		await expect.element(page.getByText('Credential 1')).toBeInTheDocument();

		// Every shuffled step's authored title is an answer key.
		for (const step of demoScenario.steps.filter((s) => s.shuffle)) {
			expect(container.textContent).not.toContain(step.title);
		}
		// The unshuffled debrief keeps its title.
		expect(container.textContent).toContain('Debrief');
	});

	it('labels every shuffled step positionally, in run order', async () => {
		withApi({ kind: 'awaits' });
		render(ScenarioPage, { scenario: demoScenario });

		await expect.element(page.getByText('Credential 1')).toBeInTheDocument();
		await expect.element(page.getByText('Credential 2')).toBeInTheDocument();
		await expect.element(page.getByText('Credential 3')).toBeInTheDocument();
	});
});

describe('ScenarioPage — the reveal choreography', UNDER_LOAD, () => {
	it('does not offer a question until the step has settled', async () => {
		withApi({ kind: 'awaits' });
		render(ScenarioPage, { scenario: demoScenario });

		await expect.element(page.getByText('Credential 1')).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Accepted it', exact: true }).elements()).toHaveLength(
			0
		);
		expect(page.getByRole('button', { name: 'I couldn’t tell' }).elements()).toHaveLength(0);
	});

	it('resolves the automatic requirement on settle, then asks', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: demoScenario });

		// The wire's verdict is on screen while the question is being asked.
		await expect
			.element(page.getByText('From the wire — checked automatically.').first())
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Accepted it', exact: true }))
			.toBeInTheDocument();
	});

	it('withholds the attested reveal mid-run, echoing the answer, and does not stop the run', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: demoScenario });

		await page.getByRole('button', { name: 'Accepted it', exact: true }).click();

		// The run moved on to the next step's question...
		await expect
			.element(page.getByRole('button', { name: 'Accepted it', exact: true }))
			.toBeInTheDocument();
		// ...but nothing has revealed yet — the answer is only echoed flatly, so the
		// operator is not primed for the remaining shuffled passes.
		await expect.element(page.getByText(/You answered/).first()).toBeInTheDocument();
		expect(page.getByText(/What actually happened/).elements()).toHaveLength(0);
	});

	it('reveals every attested requirement together once the run is complete', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: demoScenario });

		// Answer all three passes, then the debrief — nothing has revealed so far.
		await answerEachStep('Refused it', 3);
		const debrief = page.getByRole('button', { name: 'Yes', exact: true });
		await expect.element(debrief).toBeInTheDocument();
		expect(page.getByText(/What actually happened/).elements()).toHaveLength(0);

		await debrief.click();

		// With nothing left to answer, the held reveals appear together.
		await expect
			.element(page.getByText(/What actually happened|Correct|Not what happened/).first())
			.toBeInTheDocument();
	});
});

describe('ScenarioPage — recording', UNDER_LOAD, () => {
	it('disables Finish with a count until every requirement is answered', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: singleStepScenario });

		const finish = page.getByRole('button', { name: 'Finish' });
		await expect.element(finish).toBeDisabled();
		await expect.element(page.getByText(/1 requirement still to answer/)).toBeInTheDocument();
	});

	it('records exactly once, only when every requirement is answered', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: singleStepScenario });

		await page.getByRole('button', { name: 'Yes', exact: true }).click();

		const finish = page.getByRole('button', { name: 'Finish' });
		await expect.element(finish).toBeEnabled();
		expect(persistedRun(singleStepScenario.slug)).toBeUndefined();

		await finish.click();
		await expect.element(page.getByText(/Recorded\./)).toBeInTheDocument();
		expect(persistedRun(singleStepScenario.slug)?.attempts).toBe(1);
	});
});

describe('ScenarioPage — the errored dead end', UNDER_LOAD, () => {
	it('offers only Start over, and never a Finish', async () => {
		withApi({ kind: 'create-fails' });
		render(ScenarioPage, { scenario: demoScenario });

		await expect.element(page.getByText(/this run cannot be recorded/)).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Finish' }).elements()).toHaveLength(0);
	});
});

describe('ScenarioPage — blocked', UNDER_LOAD, () => {
	it('renders the typed reason and no run affordance', async () => {
		render(ScenarioPage, {
			scenario: demoScenario,
			blocked: {
				kind: 'cryptosuite-unavailable',
				requested: 'bbs-2023',
				available: ['eddsa-rdfc-2022']
			}
		});

		await expect
			.element(page.getByText(/cannot issue with cryptosuite "bbs-2023"/))
			.toBeInTheDocument();
		await expect.element(page.getByText(/still count toward the badge/)).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Finish' }).elements()).toHaveLength(0);
		expect(page.getByRole('button', { name: 'Start over' }).elements()).toHaveLength(0);
	});
});

describe('ScenarioPage — a stored run', UNDER_LOAD, () => {
	it('re-renders read-only with its reveals, plus a retry', async () => {
		render(ScenarioPage, { scenario: demoScenario, storedRun });

		await expect.element(page.getByText('Failed')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Run it again' })).toBeInTheDocument();
		// Read-only: no question is answerable.
		expect(page.getByRole('button', { name: 'I couldn’t tell' }).elements()).toHaveLength(0);
	});
});

describe('ScenarioPage — attach mode', UNDER_LOAD, () => {
	it('declines for a multi-action-step scenario and offers the normal run', async () => {
		withApi({ kind: 'awaits' });
		render(ScenarioPage, { scenario: demoScenario, attachExchangeId: 'attached-exchange-1' });

		await expect.element(page.getByText(/Attach mode is not available/)).toBeInTheDocument();
		await expect.element(page.getByText('Credential 1')).toBeInTheDocument();
	});

	it('adopts into step 1 for a single-action-step scenario', async () => {
		withApi({ kind: 'awaits' });
		render(ScenarioPage, {
			scenario: singleStepScenario,
			attachExchangeId: 'attached-exchange-1'
		});

		await expect.element(page.getByText('exchange · attached-exchange-1')).toBeInTheDocument();
		expect(page.getByRole('button', { name: /Initiate/ }).elements()).toHaveLength(0);
	});
});

describe('ScenarioPage — a whole run', UNDER_LOAD, () => {
	it('walks every step and records once every requirement is answered', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: demoScenario });

		// Three shuffled passes, each one question, then the debrief's affirm.
		await answerEachStep('Refused it', 3);
		const debrief = page.getByRole('button', { name: 'Yes', exact: true });
		await expect.element(debrief).toBeInTheDocument();
		await debrief.click();

		const finish = page.getByRole('button', { name: 'Finish' });
		await expect.element(finish).toBeEnabled();
		await finish.click();
		expect(persistedRun(demoScenario.slug)?.attempts).toBe(1);
	});
});

describe('ScenarioPage — a deliver-direct step', UNDER_LOAD, () => {
	it('signs a downloadable credential, settles, then offers the verdict', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: directDeliveryScenario });

		// The download panel renders the signed deliverable...
		await expect.element(page.getByRole('button', { name: /Download/ })).toBeInTheDocument();

		// ...and because a direct step settles at once, the verdict is answerable.
		const accepted = page.getByRole('button', { name: 'Accepted it', exact: true });
		await expect.element(accepted).toBeInTheDocument();
		await accepted.click();

		const finish = page.getByRole('button', { name: 'Finish' });
		await expect.element(finish).toBeEnabled();
		await finish.click();
		expect(persistedRun(directDeliveryScenario.slug)?.attempts).toBe(1);
	});

	it('cannot be recorded when signing fails', async () => {
		withApi({ kind: 'create-fails' });
		render(ScenarioPage, { scenario: directDeliveryScenario });

		await expect.element(page.getByText(/cannot be recorded/)).toBeInTheDocument();
	});
});

describe('ScenarioPage — a present-to-verifier step', UNDER_LOAD, () => {
	it('presents once the operator pastes a URL, then offers the verdict', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: presentScenario });

		// The paste field is shown; no verdict is answerable yet.
		const field = page.getByRole('textbox');
		await expect.element(field).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Accepted it', exact: true }).elements()).toHaveLength(
			0
		);

		await field.fill('https://verifier.test/interactions/ex-1');
		await page.getByRole('button', { name: 'Present', exact: true }).click();

		// Presented → the confirmation shows and the verdict becomes answerable.
		await expect.element(page.getByText(/Presented to your verifier/)).toBeInTheDocument();
		const accepted = page.getByRole('button', { name: 'Accepted it', exact: true });
		await expect.element(accepted).toBeInTheDocument();
		await accepted.click();

		const finish = page.getByRole('button', { name: 'Finish' });
		await expect.element(finish).toBeEnabled();
		await finish.click();
		expect(persistedRun(presentScenario.slug)?.attempts).toBe(1);
	});

	it('stays in-flight and lets the operator re-present after a transport miss', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: presentScenario });

		const field = page.getByRole('textbox');
		await field.fill('https://verifier.test/interactions/miss');
		await page.getByRole('button', { name: 'Present', exact: true }).click();

		// The amber note appears and the button offers a re-present — no verdict yet.
		await expect.element(page.getByText(/rejected the presentation/)).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Re-present' })).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Accepted it', exact: true }).elements()).toHaveLength(
			0
		);
	});

	it('drives the pure-automatic delivery scenario: present → wire checks resolve → finish', async () => {
		withApi({ kind: 'settles' });
		render(ScenarioPage, { scenario: scenarioBySlug('vcalm-verifier-delivery')! });

		const field = page.getByRole('textbox');
		await field.fill('https://verifier.test/interactions/ex-1');
		await page.getByRole('button', { name: 'Present', exact: true }).click();

		// No attested question — the six wire checks resolve and the run can finish.
		const finish = page.getByRole('button', { name: 'Finish' });
		await expect.element(finish).toBeEnabled();
		expect(page.getByRole('button', { name: 'Accepted it', exact: true }).elements()).toHaveLength(
			0
		);

		await finish.click();
		expect(persistedRun('vcalm-verifier-delivery')?.status).toBe('passed');
	});
});
