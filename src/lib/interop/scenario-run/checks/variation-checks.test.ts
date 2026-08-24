import { describe, expect, it } from 'vitest';

import { automaticChecks } from '../automatic-checks.js';
import type { RunEvidence } from '../evidence.js';

/**
 * The variation family: four presence checks over `exchange.variables`, and the
 * wallet-borne discovery check over `exchange.discoveryElections`.
 *
 * Nothing exercises these end to end yet — the scenarios that carry them are the
 * follow-on catalogue effort — so these fixtures are the whole coverage. Two
 * things they have to nail down. First, **presence is the verdict**: any value
 * passes and absence fails, because upstream every one of these variables is
 * optional with no default and this suite is the only party that sets one.
 * Second, **the readers never throw** on a partial exchange, which on a stale
 * deployment is the ordinary case rather than an error.
 */

const STEP = 'present';

const check = (id: string) => {
	const found = automaticChecks[id];
	if (!found) throw new Error(`No check registered under "${id}"`);
	return found;
};

const run = (id: string, evidence: RunEvidence) => check(id).run({ stepId: STEP, evidence });

/** An exchange carrying exactly these variables. */
const withVariables = (variables: Record<string, unknown>): RunEvidence => ({
	steps: { [STEP]: { stepId: STEP, exchange: { state: 'complete', variables } } }
});

/** Each presence check, paired with the wire variable it reads. */
const PRESENCE = [
	{ id: 'oid4vp-query-language-recorded', variable: 'oid4vpQueryLanguage', value: 'pex' },
	{ id: 'limit-disclosure-recorded', variable: 'vprLimitDisclosure', value: 'required' },
	{ id: 'tamper-recorded', variable: 'tamper', value: 'proof' },
	{
		id: 'advertised-cryptosuites-recorded',
		variable: 'vprAdvertiseCryptosuites',
		value: ['ecdsa-sd-2023']
	}
] as const;

describe.each(PRESENCE)('$id', ({ id, variable, value }) => {
	it('passes when the variable is present', () => {
		expect(run(id, withVariables({ [variable]: value })).met).toBe(true);
	});

	it('passes on any value — presence is the proof, not the value', () => {
		expect(run(id, withVariables({ [variable]: 'something-else-entirely' })).met).toBe(true);
	});

	it('fails when the variable is absent', () => {
		expect(run(id, withVariables({ somethingElse: 1 })).met).toBe(false);
	});

	it('names the deployment on failure, never the wallet', () => {
		const { detail } = run(id, withVariables({}));
		expect(detail).toMatch(/this deployment may not support/);
		expect(detail).not.toMatch(/your wallet/i);
	});

	it('does not throw when the exchange carries no variables at all', () => {
		const evidence: RunEvidence = {
			steps: { [STEP]: { stepId: STEP, exchange: { state: 'complete' } } }
		};
		expect(() => run(id, evidence)).not.toThrow();
		expect(run(id, evidence).met).toBe(false);
	});

	it('does not throw when `variables` is not an object', () => {
		const evidence = {
			steps: {
				[STEP]: { stepId: STEP, exchange: { state: 'complete', variables: 'not-an-object' } }
			}
		} as unknown as RunEvidence;
		expect(() => run(id, evidence)).not.toThrow();
		expect(run(id, evidence).met).toBe(false);
	});

	it('does not throw when the step has no exchange at all', () => {
		const evidence: RunEvidence = { steps: { [STEP]: { stepId: STEP } } };
		expect(() => run(id, evidence)).not.toThrow();
		expect(run(id, evidence).met).toBe(false);
	});

	it('does not throw when the step is absent from the evidence', () => {
		expect(() => run(id, { steps: {} })).not.toThrow();
		expect(run(id, { steps: {} }).met).toBe(false);
	});
});

describe('discovery-construction-rfc8414', () => {
	const ID = 'discovery-construction-rfc8414';

	const election = (construction: string) => ({
		construction,
		doc: 'issuer',
		at: '2026-08-22T00:00:00.000Z'
	});

	const withElections = (discoveryElections: unknown): RunEvidence =>
		({
			steps: {
				[STEP]: { stepId: STEP, exchange: { state: 'complete', discoveryElections } }
			}
		}) as RunEvidence;

	it('passes when the wallet used the path-suffix form', () => {
		expect(run(ID, withElections([election('rfc8414-path-suffix')])).met).toBe(true);
	});

	it('passes when the wallet tried both — it found the specified form', () => {
		expect(
			run(ID, withElections([election('oidc-concat'), election('rfc8414-path-suffix')])).met
		).toBe(true);
	});

	it('fails when only the concatenated form was used', () => {
		expect(run(ID, withElections([election('oidc-concat')])).met).toBe(false);
	});

	it('names both URLs concretely on that failure', () => {
		const { detail } = run(ID, withElections([election('oidc-concat')]));
		expect(detail).toContain('.well-known/openid-credential-issuer');
		expect(detail).toContain('RFC 8414 §3.1');
		expect(detail).toContain('We serve both');
	});

	it('fails on an empty election array, saying no discovery was observed', () => {
		const { met, detail } = run(ID, withElections([]));
		expect(met).toBe(false);
		expect(detail).toContain('No metadata discovery was observed');
	});

	it('fails when elections are absent entirely', () => {
		const { met, detail } = run(ID, withVariables({}));
		expect(met).toBe(false);
		expect(detail).toContain('No metadata discovery was observed');
	});

	it('does not throw when elections are not an array', () => {
		expect(() => run(ID, withElections('not-an-array'))).not.toThrow();
		expect(run(ID, withElections('not-an-array')).met).toBe(false);
	});

	it('does not throw on a malformed election entry', () => {
		expect(() => run(ID, withElections([null, undefined, 7]))).not.toThrow();
		expect(run(ID, withElections([null, undefined, 7])).met).toBe(false);
	});

	it('does not throw when the step has no exchange at all', () => {
		const evidence: RunEvidence = { steps: { [STEP]: { stepId: STEP } } };
		expect(() => run(ID, evidence)).not.toThrow();
		expect(run(ID, evidence).met).toBe(false);
	});
});

describe('registration', () => {
	it('resolves every variation check from the registry by id', () => {
		for (const id of [...PRESENCE.map((p) => p.id), 'discovery-construction-rfc8414']) {
			expect(automaticChecks[id]?.id).toBe(id);
		}
	});

	it('gives each one a summary, which is what an author reads', () => {
		for (const id of [...PRESENCE.map((p) => p.id), 'discovery-construction-rfc8414']) {
			expect(check(id).summary.length).toBeGreaterThan(0);
		}
	});
});
