import { describe, expect, it } from 'vitest';

import type {
	PassAttestation,
	VerifierRunDefinition,
	VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';

import {
	buildAttestation,
	deriveStepStates,
	handOffActivity,
	outcomeForRequirement,
	outcomesById,
	passArtifactViews,
	scoreRequestBody,
	startedActivity,
	verdictEchoActivity,
	verdictText
} from './verifier-pass-flow.js';

/** A minimal run: ground-truth kinds present, credentials deliberately bland. */
const run: VerifierRunDefinition = {
	runId: 'run-1',
	profile: 'ob3-direct-delivery',
	workflow: 'direct-credential-verification',
	cryptosuite: 'eddsa-rdfc-2022',
	passes: [
		{
			passId: 'p1',
			label: 'Credential 1',
			kind: 'broken-signature',
			credential: { name: 'cred-a' }
		},
		{ passId: 'p2', label: 'Credential 2', kind: 'valid', credential: { name: 'cred-b' } },
		{ passId: 'p3', label: 'Credential 3', kind: 'expired', credential: { name: 'cred-c' } },
		{ passId: 'p4', label: 'Credential 4', kind: 'schema-problem', credential: { name: 'cred-d' } }
	]
};

const rejectedP1: PassAttestation = { passId: 'p1', verdict: 'rejected', reason: 'signature' };

describe('narration', () => {
	it('announces the started run with the credential count', () => {
		expect(startedActivity(run)).toMatchObject({
			id: 'run.started',
			label: 'Started verifying — 4 credentials in a randomized order',
			status: 'ok'
		});
	});

	it('narrates a hand-off as prepared + over-to-you with unique ids', () => {
		const [prepared, handed] = handOffActivity(run.passes[1], 1, 4);
		expect(prepared).toMatchObject({ id: 'pass-p2.prepared', label: 'Prepared credential 2 of 4' });
		expect(handed).toMatchObject({
			id: 'pass-p2.handed',
			label: 'Handed credential 2 of 4 to your verifier — over to you'
		});
	});

	it('echoes a verdict with its reason, neutrally (info)', () => {
		expect(verdictEchoActivity(run.passes[0], rejectedP1)).toMatchObject({
			id: 'pass-p1.verdict',
			label: 'You reported: rejected — signature problem',
			status: 'info'
		});
	});

	it('echoes an accepted verdict without a reason suffix', () => {
		expect(verdictText('accepted')).toBe('You reported: accepted');
	});

	it('never leaks the pass kind into pre-reveal narration', () => {
		const narration = [
			startedActivity(run),
			...run.passes.flatMap((p, i) => handOffActivity(p, i, 4)),
			verdictEchoActivity(run.passes[0], rejectedP1)
		];
		const text = JSON.stringify(narration);
		for (const kind of ['broken-signature', 'schema-problem', 'expired', 'valid']) {
			expect(text).not.toContain(kind);
		}
	});
});

describe('buildAttestation', () => {
	it('keeps the reason on a rejected verdict', () => {
		expect(buildAttestation('p1', 'rejected', 'signature')).toEqual(rejectedP1);
	});

	it('omits an empty reason', () => {
		expect(buildAttestation('p1', 'rejected', '')).toEqual({ passId: 'p1', verdict: 'rejected' });
	});

	it('never attaches a reason to an accepted verdict', () => {
		expect(buildAttestation('p2', 'accepted', 'schema')).toEqual({
			passId: 'p2',
			verdict: 'accepted'
		});
	});
});

const reportArtifacts = [
	{
		kind: 'credential' as const,
		title: 'Credential 1 — broken signature',
		verified: false
	},
	{ kind: 'credential' as const, title: 'Credential 2 — valid', verified: true },
	{ kind: 'credential' as const, title: 'Credential 3 — expired', verified: false },
	{
		kind: 'credential' as const,
		title: 'Credential 4 — schema problem',
		verified: true
	}
];

describe('passArtifactViews', () => {
	it('pre-reveal: opaque titles, no verified chip, kind never exposed', () => {
		const views = passArtifactViews({ run, handedCount: 2, attestations: [rejectedP1] });
		expect(views).toHaveLength(2);
		expect(views[0]).toMatchObject({
			title: 'Credential 1',
			fileName: 'credential-1.json',
			note: 'You reported: rejected — signature problem'
		});
		expect(views[1]).toMatchObject({ title: 'Credential 2', note: 'Awaiting your verdict' });
		for (const view of views) expect(view.verified).toBeUndefined();
		const text = JSON.stringify(views);
		for (const kind of ['broken-signature', 'schema-problem', 'expired', 'valid']) {
			expect(text).not.toContain(kind);
		}
	});

	it('carries the credential JSON as the copy/download payload', () => {
		const [view] = passArtifactViews({ run, handedCount: 1, attestations: [] });
		expect(JSON.parse(view.json)).toEqual({ name: 'cred-a' });
	});

	it('post-reveal: relabels from the report artifacts and adds verified', () => {
		const report = { artifacts: reportArtifacts, groups: [] } as unknown as VerifierRunnerReport;
		const views = passArtifactViews({
			run,
			handedCount: 4,
			attestations: [rejectedP1],
			report
		});
		expect(views[0]).toMatchObject({
			title: 'Credential 1 — broken signature',
			verified: false
		});
		expect(views[1]).toMatchObject({ title: 'Credential 2 — valid', verified: true });
	});
});

describe('score wiring + checklist derivation', () => {
	const outcome = (id: string, status: 'pass' | 'fail' | 'n/a') => ({
		id,
		level: 'MUST' as const,
		status,
		message: `${id} ${status}`,
		source: 'attested' as const
	});

	it('scoreRequestBody round-trips the run + attestations unchanged', () => {
		const body = scoreRequestBody(run, [rejectedP1]);
		expect(body.run).toBe(run);
		expect(body.attestations).toEqual([rejectedP1]);
	});

	it('indexes report outcomes by id across groups', () => {
		const report = {
			groups: [{ checklist: {}, outcomes: [outcome('row-a', 'pass'), outcome('row-b', 'fail')] }]
		} as unknown as VerifierRunnerReport;
		const byId = outcomesById(report);
		expect(byId['row-a'].status).toBe('pass');
		expect(byId['row-b'].status).toBe('fail');
		expect(outcomesById(undefined)).toEqual({});
	});

	it('resolves id-less capability rows through the unkeyed fallback key', () => {
		const req = { text: 'Handle malformed credentials gracefully, always, without exceptions.' };
		const byId = { [`unkeyed:${req.text.slice(0, 60)}`]: outcome('x', 'n/a') };
		expect(outcomeForRequirement(byId, req)?.status).toBe('n/a');
	});

	it('derives step states: fail beats complete; unresolved rows stay pending', () => {
		const steps = [
			{
				requirements: [
					{ id: 'row-a', text: 'a' },
					{ id: 'row-b', text: 'b' }
				]
			},
			{ requirements: [{ id: 'row-c', text: 'c' }] },
			{ requirements: [{ id: 'row-d', text: 'd' }] }
		];
		const byId = {
			'row-a': outcome('row-a', 'pass'),
			'row-b': outcome('row-b', 'fail'),
			'row-c': outcome('row-c', 'n/a')
		};
		expect(deriveStepStates(steps, byId)).toEqual(['failed', 'complete', 'pending']);
	});
});
