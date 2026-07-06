import { describe, expect, it } from 'vitest';

import type {
	PassAttestation,
	PassKind,
	RejectionReason,
	VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';

import { fakeGenerateRun } from './fake-generate-run.js';
import {
	ACCEPTANCE_ROW_ID,
	REVOKED_DEFERRED_MESSAGE,
	REVOKED_ROW_ID,
	scoreVerifierRun,
	VerifierRunMismatchError
} from './score-run.js';

async function fakeRun() {
	return fakeGenerateRun({ cryptosuite: 'eddsa-rdfc-2022' });
}

/** Correct attestations: accept the valid pass, reject the rest with the right reason. */
const CORRECT: Record<PassKind, PassAttestation['verdict']> = {
	valid: 'accepted',
	'broken-signature': 'rejected',
	'schema-problem': 'rejected',
	expired: 'rejected'
};
const CORRECT_REASON: Partial<Record<PassKind, RejectionReason>> = {
	'broken-signature': 'signature',
	'schema-problem': 'schema',
	expired: 'expiry'
};

async function score(overrides: Partial<Record<PassKind, Partial<PassAttestation>>> = {}) {
	const run = await fakeRun();
	const attestations = run.passes.map((pass): PassAttestation => {
		const reason = CORRECT_REASON[pass.kind];
		return {
			passId: pass.passId,
			verdict: CORRECT[pass.kind],
			...(reason ? { reason } : {}),
			...overrides[pass.kind]
		};
	});
	return { run, report: scoreVerifierRun({ run, attestations }) };
}

function rowById(report: VerifierRunnerReport, id: string) {
	return report.groups[0].outcomes.find((o) => o.id === id);
}

describe('scoreVerifierRun', () => {
	it('passes every acceptance row for a fully correct attestation set', async () => {
		const { report } = await score();
		expect(report.verified).toBe(true);
		expect(report.failingMustCount).toBe(0);
		for (const id of Object.values(ACCEPTANCE_ROW_ID)) {
			expect(rowById(report, id)).toMatchObject({ status: 'pass', source: 'attested' });
		}
	});

	it('carries the attestation detail (label, kind, verdict, reason) on scored rows', async () => {
		const { report } = await score();
		const row = rowById(report, ACCEPTANCE_ROW_ID.expired);
		expect(row?.attestation).toEqual({
			passLabel: 'Credential 4',
			kind: 'expired',
			verdict: 'rejected',
			reason: 'expiry'
		});
	});

	it('fails the valid row when the valid credential is rejected', async () => {
		const { report } = await score({ valid: { verdict: 'rejected', reason: 'other' } });
		expect(rowById(report, ACCEPTANCE_ROW_ID.valid)).toMatchObject({
			status: 'fail',
			message: 'Your verifier rejected a valid credential.'
		});
		expect(report.verified).toBe(false);
		expect(report.failingMustCount).toBe(1);
	});

	it.each<PassKind>(['broken-signature', 'schema-problem', 'expired'])(
		'fails the %s row when the defective credential is accepted',
		async (kind) => {
			const { report } = await score({ [kind]: { verdict: 'accepted' } });
			expect(rowById(report, ACCEPTANCE_ROW_ID[kind])?.status).toBe('fail');
			expect(report.verified).toBe(false);
		}
	);

	it.each<[PassKind, RejectionReason]>([
		['broken-signature', 'schema'],
		['schema-problem', 'expiry'],
		['expired', 'signature']
	])('warns (not fails) on %s rejected for the wrong reason %s', async (kind, wrong) => {
		const { report } = await score({ [kind]: { reason: wrong } });
		const row = rowById(report, ACCEPTANCE_ROW_ID[kind]);
		expect(row?.status).toBe('warn');
		expect(row?.message).toContain(`"${wrong}"`);
		expect(row?.message).toContain(`"${CORRECT_REASON[kind]}"`);
		// Warns never flip verified.
		expect(report.verified).toBe(true);
	});

	it.each<PassKind>(['broken-signature', 'schema-problem', 'expired'])(
		'passes %s rejected with an absent or `other` reason',
		async (kind) => {
			const absent = await score({ [kind]: { reason: undefined } });
			expect(rowById(absent.report, ACCEPTANCE_ROW_ID[kind])?.status).toBe('pass');

			const other = await score({ [kind]: { reason: 'other' } });
			expect(rowById(other.report, ACCEPTANCE_ROW_ID[kind])?.status).toBe('pass');
		}
	);

	it('resolves the revoked row as a deferred automated n/a', async () => {
		const { report } = await score();
		expect(rowById(report, REVOKED_ROW_ID)).toEqual({
			id: REVOKED_ROW_ID,
			level: 'MUST',
			status: 'n/a',
			source: 'automated',
			message: REVOKED_DEFERRED_MESSAGE
		});
	});

	it('resolves id-less checklist rows as n/a, like the issuer check-runner', async () => {
		const { report } = await score();
		const unkeyed = report.groups[0].outcomes.filter((o) => o.id.startsWith('unkeyed:'));
		expect(unkeyed.length).toBeGreaterThan(0);
		expect(unkeyed.every((o) => o.status === 'n/a' && o.source === 'automated')).toBe(true);
	});

	it('builds reveal activity per pass in run order with mapped statuses', async () => {
		const { run, report } = await score({ 'broken-signature': { verdict: 'accepted' } });
		expect(report.activity).toHaveLength(4);
		expect(report.activity.map((a) => a.id)).toEqual(
			run.passes.map((p) => `verifier-pass.${p.passId}`)
		);
		const broken = report.activity[1];
		expect(broken.kind).toBe('check');
		expect(broken.label).toBe('Credential 2 — broken signature');
		expect(broken.status).toBe('fail');
		expect(report.activity[0].status).toBe('ok');
	});

	it('builds one artifact per pass, titled with the revealed kind', async () => {
		const { report } = await score();
		expect(report.artifacts.map((a) => a.title)).toEqual([
			'Credential 1 — valid',
			'Credential 2 — broken signature',
			'Credential 3 — schema problem',
			'Credential 4 — expired'
		]);
		expect(report.artifacts.map((a) => a.verified)).toEqual([true, false, true, false]);
	});

	it('rejects a missing attestation', async () => {
		const run = await fakeRun();
		const attestations = run.passes
			.slice(1)
			.map((p): PassAttestation => ({ passId: p.passId, verdict: 'rejected' }));
		expect(() => scoreVerifierRun({ run, attestations })).toThrow(VerifierRunMismatchError);
	});

	it('rejects duplicate and unknown attestation pass ids', async () => {
		const run = await fakeRun();
		const good = run.passes.map(
			(p): PassAttestation => ({ passId: p.passId, verdict: 'rejected' })
		);
		expect(() => scoreVerifierRun({ run, attestations: [...good, good[0]] })).toThrow(
			VerifierRunMismatchError
		);
		expect(() =>
			scoreVerifierRun({
				run,
				attestations: [...good.slice(1), { passId: 'nope', verdict: 'rejected' }]
			})
		).toThrow(VerifierRunMismatchError);
	});

	it('rejects a run that does not carry each pass kind exactly once', async () => {
		const run = await fakeRun();
		run.passes[1] = { ...run.passes[0], passId: 'dup-kind' };
		const attestations = run.passes.map(
			(p): PassAttestation => ({ passId: p.passId, verdict: 'rejected' })
		);
		expect(() => scoreVerifierRun({ run, attestations })).toThrow(VerifierRunMismatchError);
	});

	it('rejects a run for a different profile × workflow', async () => {
		const run = { ...(await fakeRun()), workflow: 'credential-presentation' as const };
		const attestations = run.passes.map(
			(p): PassAttestation => ({ passId: p.passId, verdict: 'rejected' })
		);
		expect(() => scoreVerifierRun({ run, attestations })).toThrow(VerifierRunMismatchError);
	});
});
