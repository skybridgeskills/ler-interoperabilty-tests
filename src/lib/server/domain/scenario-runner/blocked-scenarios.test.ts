import { describe, expect, it } from 'vitest';

import { Scenario } from '$lib/interop/scenarios/index.js';

import { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import { blockedScenario, blockedScenarios } from './blocked-scenarios.js';

/**
 * The one answer to "which scenarios can this deployment not serve", shared by
 * the four surfaces that render a scenario.
 *
 * The single-tenant deployment below is the ordinary case: it serves EdDSA over
 * `did:key` and nothing else, so an ECDSA pin is unservable and an absent intent
 * always resolves.
 */
const config = ExchangeRunnerConfig({
	enabled: true,
	transactionServiceUrl: 'http://lits.test:4004',
	tenantName: 'default',
	tenantToken: 'shh',
	exchangeHost: 'http://lits.test:4004',
	cryptosuite: 'eddsa-rdfc-2022',
	didMethod: 'key'
});

function scenarioWith(
	slug: string,
	intents: ({ cryptosuite: string; didMethod: string } | undefined)[]
) {
	return Scenario({
		slug,
		name: 'A scenario',
		blurb: 'One line.',
		role: 'wallet',
		workflow: 'credential-acceptance',
		memberships: [{ profile: 'oid4', level: 'required' }],
		steps: intents.map((intent, i) => ({
			id: `step-${i}`,
			title: 'Offer the credential',
			summary: 'We will offer your wallet a credential.',
			action: { kind: 'issue' as const, credential: 'minimal-ob3', ...(intent ? { intent } : {}) },
			requirements: []
		}))
	});
}

const elective = scenarioWith('elective', [undefined]);
const servablePin = scenarioWith('servable-pin', [
	{ cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' }
]);
const unservablePin = scenarioWith('unservable-pin', [
	{ cryptosuite: 'ecdsa-rdfc-2019', didMethod: 'key' }
]);

describe('blockedScenario', () => {
	it('never blocks a scenario with no pinned intent — elective is always servable', () => {
		expect(blockedScenario(config, elective)).toBeUndefined();
	});

	it('never blocks a pin this deployment advertises', () => {
		expect(blockedScenario(config, servablePin)).toBeUndefined();
	});

	it('blocks an unservable pin with a typed reason naming what the deployment has', () => {
		expect(blockedScenario(config, unservablePin)).toEqual({
			kind: 'cryptosuite-unavailable',
			requested: 'ecdsa-rdfc-2019',
			available: ['eddsa-rdfc-2022']
		});
	});

	it('takes the FIRST unservable intent — a scenario blocked twice is still just blocked', () => {
		const twice = scenarioWith('twice', [
			undefined,
			{ cryptosuite: 'ecdsa-rdfc-2019', didMethod: 'key' },
			{ cryptosuite: 'eddsa-rdfc-2022', didMethod: 'web' }
		]);

		expect(blockedScenario(config, twice)).toEqual({
			kind: 'cryptosuite-unavailable',
			requested: 'ecdsa-rdfc-2019',
			available: ['eddsa-rdfc-2022']
		});
	});

	it('reads no intent off an action kind that carries none — nothing to pin when we mint nothing', () => {
		const presenting = Scenario({
			slug: 'presenting',
			name: 'Present a credential',
			blurb: 'One line.',
			role: 'wallet',
			workflow: 'credential-presentation',
			memberships: [{ profile: 'oid4', level: 'required' }],
			steps: [
				{
					id: 'present',
					title: 'Present a credential',
					summary: 'We will ask your wallet for a credential.',
					action: { kind: 'request-presentation', request: 'ob3-any' },
					requirements: []
				}
			]
		});

		expect(blockedScenario(config, presenting)).toBeUndefined();
	});
});

describe('blockedScenarios', () => {
	it('keys only the unservable ones — presence in the map IS the signal', () => {
		const blocked = blockedScenarios(config, [elective, servablePin, unservablePin]);

		expect(Object.keys(blocked)).toEqual(['unservable-pin']);
		expect(blocked['unservable-pin'].kind).toBe('cryptosuite-unavailable');
	});

	it('is empty for an all-elective catalog, which is every deployment before a pin exists', () => {
		expect(blockedScenarios(config, [elective, servablePin])).toEqual({});
	});
});

describe('what is NOT blockable — only `issue` is tenant-bound', () => {
	/**
	 * The defect M15 P2 fixed, captured. `deliver-direct` and
	 * `present-to-verifier` sign with locally-generated keys that `wallet-crypto`
	 * always produces, so their cryptosuite can never be unservable. Until M15
	 * `deliver-direct` carried an `IssuingIntent` and went through the tenant map,
	 * which rendered a locally-signed ECDSA deliverable *disabled* on a
	 * single-tenant EdDSA deployment that could serve it perfectly well.
	 */
	function locallySigned(
		slug: string,
		action: Parameters<typeof Scenario>[0]['steps'][number]['action']
	) {
		return Scenario({
			slug,
			name: 'A locally-signed scenario',
			blurb: 'One line.',
			role: 'verifier',
			workflow: 'credential-request-and-verification',
			memberships: [{ profile: 'oid4', level: 'required' }],
			steps: [
				{
					id: 'step',
					title: 'Hand it over',
					summary: 'We sign a credential and hand it to your verifier.',
					action,
					requirements: []
				}
			]
		});
	}

	it('never blocks a `deliver-direct` step, whatever suite it signs with', () => {
		const ecdsa = locallySigned('dd-ecdsa', {
			kind: 'deliver-direct',
			credential: 'minimal-ob3',
			cryptosuite: 'ecdsa-rdfc-2019'
		});
		// The deployment above serves EdDSA only. An `issue` step pinned to ECDSA
		// IS blocked (see above); this one must not be.
		expect(blockedScenario(config, ecdsa)).toBeUndefined();
		expect(blockedScenarios(config, [ecdsa])).toEqual({});
	});

	it('never blocks a `present-to-verifier` step, whatever suite it signs with', () => {
		const ecdsa = locallySigned('ptv-ecdsa', {
			kind: 'present-to-verifier',
			credential: 'minimal-ob3',
			transport: 'vcalm',
			cryptosuite: 'ecdsa-rdfc-2019'
		});
		expect(blockedScenario(config, ecdsa)).toBeUndefined();
	});

	it('still blocks the same suite on an `issue` step — the distinction is who mints', () => {
		// Same deployment, same cryptosuite, different action: the transaction
		// service mints an `issue`, so its tenant map decides and it can say no.
		expect(blockedScenario(config, unservablePin)?.kind).toBe('cryptosuite-unavailable');
	});
});
