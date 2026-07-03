import { describe, expect, it } from 'vitest';

import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';
import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';
import { FakeVcalmIssuerFlow } from '$lib/server/domain/wallet-client/index.js';

import {
	credCtx as vcalmCredentialCtx,
	vcalmIssuerFlowChecks
} from './checks/vcalm-issuer-flow.js';
import { runIssuerFlowChecks, type IssuerFlowCheckCtx } from './issuer-flow-check.js';

const P = 'vcalm.issuer.credential-issuance.';
const vcalmOpts = { profile: 'vcalm' as const, registry: vcalmIssuerFlowChecks };
const runVcalm = (ctx: IssuerFlowCheckCtx) => runIssuerFlowChecks(ctx, vcalmOpts);
const outcome = (id: string, ctx: IssuerFlowCheckCtx) =>
	runVcalm(ctx).outcomes.find((o) => o.id === `${P}${id}`);

describe('runIssuerFlowChecks', () => {
	it('passes every MUST for a fully-successful run (fake flow observations)', async () => {
		const { observations } = await FakeVcalmIssuerFlow().runIssuerFlow(
			'https://issuer.test/interactions/ex-1'
		);
		const { report, outcomes } = runVcalm(observations);

		expect(report.verified).toBe(true);
		expect(outcomes.filter((o) => o.level === 'MUST' && o.status === 'fail')).toHaveLength(0);
		expect(outcome('tls', observations)?.status).toBe('pass');
		expect(outcome('interaction-url-fetchable', observations)?.status).toBe('pass');
		expect(outcome('vcapi-in-protocols', observations)?.status).toBe('pass');
		expect(outcome('didauth-requested', observations)?.status).toBe('pass');
		expect(outcome('binds-verified-holder', observations)?.status).toBe('pass');
		expect(outcome('di-proof', observations)?.status).toBe('pass');
		expect(outcome('issuer-did', observations)?.status).toBe('pass');
		// The two ProblemDetails clauses resolve n/a (needs a negative probe).
		expect(outcome('participation-problemdetails', observations)?.status).toBe('n/a');
		expect(outcome('didauth-problemdetails', observations)?.status).toBe('n/a');
	});

	it('omits step 2+ requirements (pending) and fails MUSTs when blocked at step 1', () => {
		const ctx: IssuerFlowCheckCtx = {
			interaction: {
				ok: false,
				status: 502,
				rawBody: null,
				error: 'Interaction URL responded 502.'
			}
		};
		const { report, outcomes } = runVcalm(ctx);

		expect(report.verified).toBe(false);
		expect(outcome('interaction-url-fetchable', ctx)?.status).toBe('fail');
		expect(outcome('tls', ctx)?.status).toBe('fail'); // no https/tls probe → MUST fail
		expect(outcome('vcapi-in-protocols', ctx)?.status).toBe('fail');
		// Everything downstream of the interaction step is pending → omitted.
		expect(outcomes.some((o) => o.id === `${P}didauth-requested`)).toBe(false);
		expect(outcomes.some((o) => o.id === `${P}binds-verified-holder`)).toBe(false);
	});

	it('fails the TLS MUST when the endpoint negotiates below TLS 1.2', () => {
		const ctx: IssuerFlowCheckCtx = {
			interaction: {
				ok: true,
				status: 200,
				protocols: { vcapi: 'https://issuer.test/vcapi' },
				vcapiUrl: 'https://issuer.test/vcapi',
				tls: { ok: true, protocol: 'TLSv1.1', atLeastTls12: false },
				rawBody: { protocols: { vcapi: 'https://issuer.test/vcapi' } }
			}
		};
		expect(outcome('tls', ctx)?.status).toBe('fail');
		expect(outcome('interaction-url-fetchable', ctx)?.status).toBe('pass');
		expect(runVcalm(ctx).report.verified).toBe(false);
	});

	it('fails holder binding when the subject id does not match the authenticated holder', () => {
		const ctx: IssuerFlowCheckCtx = {
			delivery: {
				status: 200,
				credential: { credentialSubject: { id: 'did:key:zSomeoneElse' } },
				holderDid: 'did:key:zHolder'
			},
			holder: { did: 'did:key:zHolder', cryptosuite: 'eddsa-rdfc-2022' }
		};
		expect(outcome('binds-verified-holder', ctx)?.status).toBe('fail');
	});

	it('warns (does not fail) when SHOULD validUntil is absent', () => {
		const ctx: IssuerFlowCheckCtx = {
			delivery: { status: 200, credential: { credentialSubject: { id: 'x' } } }
		};
		const vu = outcome('valid-until', ctx);
		expect(vu?.level).toBe('SHOULD');
		expect(vu?.status).toBe('warn');
	});

	it('is profile-parametric: resolves the oid4 combo (empty registry → all pending)', () => {
		const { report, outcomes } = runIssuerFlowChecks({}, { profile: 'oid4', registry: {} });
		expect(outcomes).toHaveLength(0);
		expect(report.verified).toBe(true);
		expect(report.groups[0]?.checklist.profileSlug).toBe('oid4');
	});
});

describe('runIssuerFlowChecks — additive evaluation', () => {
	const osaOpts = {
		...vcalmOpts,
		additiveProfiles: ['open-skill-alignment' as const],
		toCredentialCtx: vcalmCredentialCtx
	};
	const additiveGroup = (report: IssuerRunnerReport) =>
		report.groups.find((g) => g.checklist.kind === 'additive');

	it('emits no additive group when none is selected (response unchanged)', async () => {
		const { observations } = await FakeVcalmIssuerFlow().runIssuerFlow(
			'https://issuer.test/interactions/ex-1'
		);
		const { report, additiveOutcomes } = runVcalm(observations);
		expect(additiveOutcomes).toHaveLength(0);
		expect(report.groups).toHaveLength(1);
		expect(report.groups[0]?.checklist.kind).toBe('base');
	});

	it('emits a passing OSA additive group for a conformant delivered credential', () => {
		const ctx = { delivery: { status: 200, credential: rawScoreFixture } } as IssuerFlowCheckCtx;
		const { report, additiveOutcomes } = runIssuerFlowChecks(ctx, osaOpts);

		const group = additiveGroup(report);
		expect(group?.checklist.profileSlug).toBe('open-skill-alignment');
		expect(additiveOutcomes.length).toBeGreaterThan(0);
		expect(
			additiveOutcomes.find((o) => o.id === 'open-skill-alignment.result.present')?.status
		).toBe('pass');
		// No OSA MUST failed → the additive group does not drag `verified` down.
		expect(group?.outcomes.some((o) => o.level === 'MUST' && o.status === 'fail')).toBe(false);
	});

	it('fails a selected-additive MUST and flips combined verified for a non-conformant credential', () => {
		const credential = { credentialSubject: { id: 'did:key:zHolder' } }; // no result[]/resultDescription[]
		const ctx = { delivery: { status: 200, credential } } as IssuerFlowCheckCtx;
		const { report, additiveOutcomes } = runIssuerFlowChecks(ctx, osaOpts);

		const present = additiveOutcomes.find(
			(o) => o.id === 'open-skill-alignment.result-description.present'
		);
		expect(present?.level).toBe('MUST');
		expect(present?.status).toBe('fail');
		expect(report.verified).toBe(false);
	});

	it('skips additive evaluation (pending) when no credential has been delivered yet', () => {
		const ctx = { interaction: { ok: true, status: 200 } } as IssuerFlowCheckCtx;
		const { report, additiveOutcomes } = runIssuerFlowChecks(ctx, osaOpts);
		expect(additiveOutcomes).toHaveLength(0);
		expect(additiveGroup(report)).toBeUndefined();
	});
});
