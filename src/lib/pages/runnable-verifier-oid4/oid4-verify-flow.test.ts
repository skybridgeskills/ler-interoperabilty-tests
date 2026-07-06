import { describe, expect, it } from 'vitest';

import type {
	PassAttestation,
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunnerReport,
	VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';

import {
	currentOutcomesById,
	defaultReuseRequest,
	passArtifactViews,
	presentedActivity,
	replaceEvidence,
	requestForPresent,
	scoreRequestBody,
	startedActivity,
	stepStatesFor
} from './oid4-verify-flow.js';

const plan: VerifierRunPlan = {
	runId: 'run-1',
	profile: 'oid4',
	workflow: 'credential-request-and-verification',
	cryptosuite: 'eddsa-rdfc-2022',
	entries: [
		{ passId: 'p1', label: 'Credential 1', kind: 'broken-signature' },
		{ passId: 'p2', label: 'Credential 2', kind: 'valid' },
		{ passId: 'p3', label: 'Credential 3', kind: 'expired' },
		{ passId: 'p4', label: 'Credential 4', kind: 'schema-problem' }
	]
};

function evidence(passId: string, submitted = true): PresentEvidence {
	return {
		passId,
		submitted,
		...(submitted ? { transportStatus: 200 } : { transportStatus: 400 }),
		credential: { type: ['VerifiableCredential', 'OpenBadgeCredential'], name: passId }
	};
}

const floor: VerifierCheckOutcome[] = [
	{
		id: 'oid4.verifier-request-endpoint',
		level: 'MUST',
		status: 'pass',
		message: 'resolved',
		source: 'automated'
	},
	{
		id: 'oid4.verifier-request-tls',
		level: 'MUST',
		status: 'fail',
		message: 'no tls',
		source: 'automated'
	}
];

describe('narration', () => {
	it('announces the started run with the credential count', () => {
		expect(startedActivity(4)).toMatchObject({
			id: 'run.started',
			label: 'Started verifying — 4 credentials in a randomized order',
			status: 'ok'
		});
	});

	it('narrates a submitted present neutrally (info, no fail note)', () => {
		const a = presentedActivity(plan.entries[0], 0, 4, true);
		expect(a).toMatchObject({
			id: 'present-p1.handed',
			label: 'Presented credential 1 of 4 to your verifier — over to you',
			status: 'info'
		});
		expect(a.detail).toBeUndefined();
	});

	it('flags a non-submitted present as warn with a note', () => {
		const a = presentedActivity(plan.entries[1], 1, 4, false);
		expect(a.status).toBe('warn');
		expect(a.detail).toMatch(/not accepted/i);
	});

	it('never leaks a pass kind into present narration', () => {
		const text = JSON.stringify(plan.entries.map((e, i) => presentedActivity(e, i, 4, true)));
		for (const kind of ['broken-signature', 'schema-problem', 'expired', 'valid']) {
			expect(text).not.toContain(kind);
		}
	});
});

describe('request reuse + retry', () => {
	it('defaults to reuse only when the previous present reached the endpoint', () => {
		expect(defaultReuseRequest(evidence('p1', true))).toBe(true);
		expect(defaultReuseRequest(evidence('p1', false))).toBe(false);
		expect(defaultReuseRequest(undefined)).toBe(false);
	});

	it('picks the reused request or the freshly pasted one', () => {
		expect(requestForPresent(true, 'fresh', 'last')).toBe('last');
		expect(requestForPresent(false, 'fresh', 'last')).toBe('fresh');
	});

	it('replaces only the target credential evidence, leaving others intact', () => {
		const before = [evidence('p1'), evidence('p2', false), evidence('p3')];
		const after = replaceEvidence(before, 1, evidence('p2', true));
		expect(after[1].submitted).toBe(true);
		expect(after[0]).toBe(before[0]);
		expect(after[2]).toBe(before[2]);
		expect(before[1].submitted).toBe(false); // original untouched
	});
});

describe('scoreRequestBody', () => {
	it('round-trips plan + evidence + attestations + floor outcomes', () => {
		const attestations: PassAttestation[] = [
			{ passId: 'p1', verdict: 'rejected', reason: 'signature' }
		];
		const body = scoreRequestBody({
			plan,
			evidence: [evidence('p1')],
			attestations,
			floorOutcomes: floor
		});
		expect(body.plan).toBe(plan);
		expect(body.attestations).toBe(attestations);
		expect(body.floorOutcomes).toBe(floor);
	});
});

describe('checklist derivation', () => {
	it('lights the floor rows before scoring and the full report after', () => {
		const preScore = currentOutcomesById(undefined, floor);
		expect(preScore['oid4.verifier-request-endpoint'].status).toBe('pass');
		expect(preScore['oid4.verifier-request-tls'].status).toBe('fail');

		const report = {
			artifacts: [],
			groups: [
				{
					checklist: {},
					outcomes: [
						{
							id: 'oid4.verifier-accepts-valid-credential',
							level: 'MUST',
							status: 'pass',
							message: 'ok',
							source: 'attested'
						}
					]
				}
			]
		} as unknown as VerifierRunnerReport;
		const postScore = currentOutcomesById(report, floor);
		expect(postScore['oid4.verifier-accepts-valid-credential'].status).toBe('pass');
	});

	it('marks the last step in-flight while busy and none before the report', () => {
		const steps = [
			{ requirements: [{ id: 'a', text: 'a' }] },
			{ requirements: [{ id: 'b', text: 'b' }] }
		];
		expect(stepStatesFor({ steps, report: undefined, busy: true })).toEqual([
			'pending',
			'in-flight'
		]);
		expect(stepStatesFor({ steps, report: undefined, busy: false })).toEqual([
			'pending',
			'pending'
		]);
	});
});

describe('passArtifactViews', () => {
	it('pre-reveal: opaque titles from evidence, no verified chip, no kind leak', () => {
		const views = passArtifactViews({
			plan,
			evidence: [evidence('p1'), evidence('p2')],
			attestations: [{ passId: 'p1', verdict: 'rejected', reason: 'signature' }]
		});
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

	it('carries the present-response credential JSON as the copy/download payload', () => {
		const [view] = passArtifactViews({ plan, evidence: [evidence('p1')], attestations: [] });
		expect(JSON.parse(view.json).name).toBe('p1');
	});

	it('post-reveal: relabels from the report artifacts and adds verified', () => {
		const report = {
			artifacts: [
				{ kind: 'credential', title: 'Credential 1 — broken signature', verified: false },
				{ kind: 'credential', title: 'Credential 2 — valid', verified: true }
			],
			groups: []
		} as unknown as VerifierRunnerReport;
		const views = passArtifactViews({
			plan,
			evidence: [evidence('p1'), evidence('p2')],
			attestations: [
				{ passId: 'p1', verdict: 'rejected', reason: 'signature' },
				{ passId: 'p2', verdict: 'accepted' }
			],
			report
		});
		expect(views[0]).toMatchObject({ title: 'Credential 1 — broken signature', verified: false });
		expect(views[1]).toMatchObject({ title: 'Credential 2 — valid', verified: true });
	});
});
