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
