// Measured components need the real stylesheet; the `client` project loads none.
import '../../../../routes/layout.css';

import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import type { AttestedAnswerValue, RequirementOutcome } from '$lib/interop/scenario-run/index.js';

import AnswerPrompt from './AnswerPrompt.svelte';
import {
	answeredCorrectly,
	answeredWrongly,
	autoPass,
	couldNotTell,
	directEvidence,
	displayed,
	exchangeComplete,
	handled,
	oid4MissEvidence,
	SETUP,
	truncatedEvidence
} from './fixtures.js';
import RequirementRow from './RequirementRow.svelte';
import ScenarioStepCard from './ScenarioStepCard.svelte';
import StepDetails from './StepDetails.svelte';

const requirements = [exchangeComplete, handled, displayed];
const settled: Record<string, RequirementOutcome> = {
	'exchange-complete': autoPass,
	handled: answeredWrongly
};

/** Elements whose own content legitimately scrolls, so they are not overflow. */
const CONTENT_SCROLLS = new Set(['INPUT', 'TEXTAREA', 'PRE']);

/**
 * An element that is deliberately truncating (Tailwind's `truncate`) always
 * reports `scrollWidth > clientWidth` — that is what clipping to an ellipsis
 * *means*, not a layout break. A long URL in the Details panel is the case in
 * point: it is clipped on purpose and pushes nothing wide.
 */
function truncatesOnPurpose(el: HTMLElement): boolean {
	const style = getComputedStyle(el);
	return style.textOverflow === 'ellipsis' && style.overflowX === 'hidden';
}

function overflowingIn(container: HTMLElement): string[] {
	return [...container.querySelectorAll('*')]
		.filter((el): el is HTMLElement => el instanceof HTMLElement)
		.filter((el) => !CONTENT_SCROLLS.has(el.tagName))
		.filter((el) => !truncatesOnPurpose(el))
		.filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth)
		.map((el) => `${el.tagName.toLowerCase()} [${el.className}]`);
}

const question = handled.check.kind === 'attested' ? handled.check.answer : undefined;

/**
 * The three Vitest projects run in parallel, two of them driving a real browser,
 * and `turbo validate` runs a Vite build alongside them. Real clicks carry
 * Playwright's actionability waits, which is enough to trip the default timeout
 * under that load — so the interactive describes get the same allowance the
 * server route tests already take, for the same reason.
 */
const UNDER_LOAD = { timeout: 20_000 };

describe('scenario-step components at 375px', () => {
	it('renders a requirement row with the ATTESTED pill without overflowing', async () => {
		await page.viewport(375, 812);
		const { container } = render(RequirementRow, { requirement: handled, outcome: couldNotTell });

		await expect.element(page.getByText('Attested')).toBeInTheDocument();
		expect(overflowingIn(container)).toEqual([]);
	});

	it('renders a live step card, action and all, without overflowing', async () => {
		await page.viewport(375, 812);
		const { container } = render(ScenarioStepCard, {
			index: 2,
			label: 'Credential 2',
			state: 'in-flight',
			setup: SETUP,
			requirements,
			outcomes: { 'exchange-complete': autoPass },
			onAnswer: () => {}
		});

		await expect.element(page.getByText('In flight')).toBeInTheDocument();
		expect(overflowingIn(container)).toEqual([]);
	});

	it('renders a settled step card without overflowing', async () => {
		await page.viewport(375, 812);
		const { container } = render(ScenarioStepCard, {
			index: 1,
			label: 'Credential 1',
			state: 'settled',
			setup: SETUP,
			requirements,
			outcomes: settled
		});

		await expect.element(page.getByText(/Missed/)).toBeInTheDocument();
		expect(overflowingIn(container)).toEqual([]);
	});

	it('renders an open Details panel, long URLs and all, without overflowing', async () => {
		await page.viewport(375, 812);
		const { container } = render(ScenarioStepCard, {
			index: 1,
			label: 'Issue a credential',
			state: 'in-flight',
			setup: SETUP,
			requirements,
			outcomes: {},
			evidence: oid4MissEvidence
		});

		// Open the panel and every stage body inside it — a collapsed disclosure
		// cannot overflow, so measuring it closed would prove nothing. The stage
		// URLs are the real risk here: they are long, and they must truncate rather
		// than push the card wide.
		for (const disclosure of container.querySelectorAll('details')) {
			disclosure.open = true;
		}
		await expect.element(page.getByText('What happened on the wire')).toBeInTheDocument();
		expect(overflowingIn(container)).toEqual([]);
	});
});

describe('AnswerPrompt', UNDER_LOAD, () => {
	it('always offers “I couldn’t tell”, after the authored options', async () => {
		if (!question) throw new Error('fixture is not a choose question');
		render(AnswerPrompt, { answer: question, onAnswer: () => {} });

		const labels = [...document.querySelectorAll('button')].map((b) => b.textContent?.trim());
		expect(labels).toEqual([
			'Accepted it',
			'Refused it',
			'Accepted it, with a visible warning',
			'I couldn’t tell'
		]);
	});

	it('emits the chosen value, and `cant-tell` from the last option', async () => {
		if (!question) throw new Error('fixture is not a choose question');
		const seen: AttestedAnswerValue[] = [];
		render(AnswerPrompt, { answer: question, onAnswer: (v) => seen.push(v) });

		await page.getByRole('button', { name: 'Refused it' }).click();
		await page.getByRole('button', { name: 'I couldn’t tell' }).click();

		expect(seen).toEqual([{ kind: 'choose', value: 'refused' }, { kind: 'cant-tell' }]);
	});
});

describe('ScenarioStepCard', UNDER_LOAD, () => {
	it('shows the setup callout on a live step — only the expected answer is concealed', async () => {
		render(ScenarioStepCard, {
			index: 2,
			label: 'Credential 2',
			state: 'in-flight',
			setup: SETUP,
			requirements,
			outcomes: {},
			onAnswer: () => {}
		});

		await expect.element(page.getByText('What we are sending')).toBeInTheDocument();
		await expect.element(page.getByText(SETUP)).toBeInTheDocument();
	});

	it('renders the caller-resolved label and never reaches for a step title', async () => {
		render(ScenarioStepCard, {
			index: 3,
			label: 'Credential 3',
			state: 'pending',
			setup: SETUP,
			requirements,
			outcomes: {}
		});

		await expect.element(page.getByText('Credential 3')).toBeInTheDocument();
		await expect.element(page.getByText('Waiting')).toBeInTheDocument();
	});

	it('carries a Details panel on a step still IN FLIGHT after a miss', async () => {
		render(ScenarioStepCard, {
			index: 1,
			label: 'Issue a credential',
			state: 'in-flight',
			setup: SETUP,
			requirements,
			outcomes: {},
			evidence: oid4MissEvidence
		});

		await expect.element(page.getByText('Details')).toBeInTheDocument();
	});

	it('carries a Details panel on a settled step', async () => {
		render(ScenarioStepCard, {
			index: 1,
			label: 'Credential 1',
			state: 'settled',
			setup: SETUP,
			requirements,
			outcomes: settled,
			evidence: directEvidence
		});

		await expect.element(page.getByText('Details')).toBeInTheDocument();
	});

	it('shows no Details on a pending step, or on one with no evidence at all', async () => {
		render(ScenarioStepCard, {
			index: 3,
			label: 'Credential 3',
			state: 'pending',
			setup: SETUP,
			requirements,
			outcomes: {},
			evidence: oid4MissEvidence
		});
		expect(page.getByText('Details').elements()).toHaveLength(0);

		render(ScenarioStepCard, {
			index: 1,
			label: 'Credential 1',
			state: 'in-flight',
			setup: SETUP,
			requirements,
			outcomes: {}
		});
		expect(page.getByText('Details').elements()).toHaveLength(0);
	});
});

describe('StepDetails', UNDER_LOAD, () => {
	it('renders nothing at all when the step observed nothing', async () => {
		const { container } = render(StepDetails, {});
		expect(container.querySelector('details')).toBeNull();
	});

	it('lists every wire stage in order, with its status', async () => {
		render(StepDetails, { evidence: oid4MissEvidence });

		await expect.element(page.getByText('What happened on the wire')).toBeInTheDocument();
		await expect.element(page.getByText('Credential offer')).toBeInTheDocument();
		// Exact: the stage LABEL, not the failure sentence below it that also
		// contains the words.
		await expect.element(page.getByText('Credential request', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('500', { exact: true })).toBeInTheDocument();
	});

	it('makes the failing stage’s response body reachable — the whole point', async () => {
		render(StepDetails, { evidence: oid4MissEvidence });

		// Two disclosures deep: the panel, then the stage's own body.
		await page.getByText('Details').click();
		const bodies = page.getByText('Response body').elements();
		await page
			.getByText('Response body')
			.nth(bodies.length - 1)
			.click();

		await expect
			.element(page.getByText(/Cannot read property id of undefined/))
			.toBeInTheDocument();
	});

	it('says how much of a truncated body is missing, in readable units', async () => {
		render(StepDetails, { evidence: truncatedEvidence });

		await page.getByText('Details').click();
		await page.getByText('Response body').click();

		await expect.element(page.getByText(/Showing the first .* of 412 KB\./)).toBeInTheDocument();
	});

	it('shows the summary and the received credential for a transport with no wire', async () => {
		render(StepDetails, { evidence: directEvidence });

		await page.getByText('Details').click();
		await expect.element(page.getByText('What this step observed')).toBeInTheDocument();
		await expect.element(page.getByText('The credential we received')).toBeInTheDocument();
		expect(page.getByText('What happened on the wire').elements()).toHaveLength(0);
	});
});

describe('RevealStrip — role-neutral copy', UNDER_LOAD, () => {
	// The reveal must read for any role: the suite runs verifier and issuer
	// scenarios too, so the explanation cannot hardcode "your wallet". The
	// positive assertions below fail if the copy ever reverts to a role word.
	it('says what actually happened, never naming a role', async () => {
		render(RequirementRow, { requirement: handled, outcome: answeredCorrectly });
		await expect.element(page.getByText('That is what actually happened.')).toBeInTheDocument();
	});

	it('says what did not happen for a wrong answer, still role-neutral', async () => {
		render(RequirementRow, { requirement: handled, outcome: answeredWrongly });
		await expect.element(page.getByText('That is not what actually happened.')).toBeInTheDocument();
	});
});

describe('RequirementRow — attested reveals defer to end-of-run', UNDER_LOAD, () => {
	it('echoes the answer flatly, no verdict, while the reveal is withheld', async () => {
		render(RequirementRow, { requirement: handled, outcome: answeredWrongly, revealed: false });

		// The flat echo of what was picked, and nothing that names the verdict.
		await expect.element(page.getByText(/You answered/)).toBeInTheDocument();
		expect(page.getByText('Not what happened').elements()).toHaveLength(0);
		expect(page.getByText(/That is not what actually happened\./).elements()).toHaveLength(0);
	});

	it('shows the full reveal once revealed', async () => {
		render(RequirementRow, { requirement: handled, outcome: answeredWrongly, revealed: true });

		await expect.element(page.getByText('Not what happened')).toBeInTheDocument();
		await expect.element(page.getByText('That is not what actually happened.')).toBeInTheDocument();
	});

	it('resolves automatic outcomes immediately regardless of revealed', async () => {
		render(RequirementRow, { requirement: exchangeComplete, outcome: autoPass, revealed: false });
		await expect.element(page.getByText('Pass')).toBeInTheDocument();
	});
});
