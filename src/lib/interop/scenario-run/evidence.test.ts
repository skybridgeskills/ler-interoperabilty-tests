import { describe, expect, it } from 'vitest';

import { allCheckIds, checkById } from './automatic-checks.js';
import {
	artifactForStep,
	emptyEvidence,
	evidenceForStep,
	exchangeForStep,
	exchangeVariable,
	withStepEvidence
} from './evidence.js';

const withOffer = withStepEvidence(emptyEvidence(), {
	stepId: 'offer',
	exchange: { state: 'complete', variables: { holderDid: 'did:key:z6Mk' } },
	artifact: { id: 'urn:uuid:credential' }
});

describe('evidence', () => {
	it('starts empty', () => {
		expect(emptyEvidence()).toEqual({ steps: {} });
	});

	it('keys evidence by step id', () => {
		expect(evidenceForStep(withOffer, 'offer')?.stepId).toBe('offer');
	});

	it('returns undefined for a step that has produced nothing', () => {
		expect(evidenceForStep(withOffer, 'debrief')).toBeUndefined();
	});

	it('replaces a step’s evidence rather than merging it', () => {
		const next = withStepEvidence(withOffer, {
			stepId: 'offer',
			exchange: { state: 'invalid', variables: {} }
		});

		expect(exchangeForStep(next, 'offer')?.state).toBe('invalid');
		expect(artifactForStep(next, 'offer')).toBeUndefined();
	});

	it('does not mutate the evidence it was given', () => {
		withStepEvidence(withOffer, { stepId: 'debrief' });

		expect(Object.keys(withOffer.steps)).toEqual(['offer']);
	});

	it('reads an exchange variable', () => {
		expect(exchangeVariable(withOffer, 'offer', 'holderDid')).toBe('did:key:z6Mk');
	});

	it('returns undefined for an absent variable rather than throwing', () => {
		expect(exchangeVariable(withOffer, 'offer', 'nope')).toBeUndefined();
		expect(exchangeVariable(withOffer, 'no-step', 'holderDid')).toBeUndefined();
	});

	it('holds several steps at once, so a check CAN read a prior step', () => {
		// Nothing shipped crosses steps yet; round-trip will, and the shape has to
		// admit it without a rewrite.
		const twoSteps = withStepEvidence(withOffer, {
			stepId: 'present',
			exchange: { state: 'complete', variables: {} }
		});

		expect(Object.keys(twoSteps.steps).sort()).toEqual(['offer', 'present']);
		expect(exchangeForStep(twoSteps, 'offer')?.state).toBe('complete');
	});
});

describe('automatic check registry', () => {
	it('resolves a registered check', () => {
		expect(checkById('exchange-reached-complete')?.id).toBe('exchange-reached-complete');
	});

	it('returns undefined for an unknown id', () => {
		expect(checkById('no-such-check')).toBeUndefined();
	});

	it('keys every check under its own id', () => {
		for (const id of allCheckIds()) expect(checkById(id)?.id).toBe(id);
	});
});

describe('exchange-reached-complete', () => {
	const check = checkById('exchange-reached-complete')!;

	it('is met by a completed exchange', () => {
		expect(check.run({ stepId: 'offer', evidence: withOffer }).met).toBe(true);
	});

	it('is not met by an invalid one', () => {
		const evidence = withStepEvidence(emptyEvidence(), {
			stepId: 'offer',
			exchange: { state: 'invalid', variables: {} }
		});

		expect(check.run({ stepId: 'offer', evidence }).met).toBe(false);
	});

	it('is not met when the step drove no exchange', () => {
		expect(check.run({ stepId: 'debrief', evidence: withOffer }).met).toBe(false);
	});
});

describe('offer-was-fetched', () => {
	const check = checkById('offer-was-fetched')!;
	const withExchange = (exchange: Parameters<typeof withStepEvidence>[1]['exchange']) =>
		withStepEvidence(emptyEvidence(), { stepId: 'offer', exchange });

	it('is met when a VCALM exchange went active', () => {
		expect(
			check.run({ stepId: 'offer', evidence: withExchange({ state: 'active', variables: {} }) }).met
		).toBe(true);
	});

	it('is met when OID4VCI recorded progress while staying pending', () => {
		const evidence = withExchange({
			state: 'pending',
			variables: { oid4vci: { preAuthorizedCode: 'abc' } }
		});

		expect(check.run({ stepId: 'offer', evidence }).met).toBe(true);
	});

	it('is not met when nothing ever touched the exchange', () => {
		const evidence = withExchange({ state: 'pending', variables: { oid4vci: {} } });

		expect(check.run({ stepId: 'offer', evidence }).met).toBe(false);
	});
});

describe('holder-did-bound', () => {
	const check = checkById('holder-did-bound')!;

	it('is met by `holderDid`', () => {
		expect(check.run({ stepId: 'offer', evidence: withOffer }).met).toBe(true);
	});

	it('is met by the DIDAuth variant `didAuthHolderDid`', () => {
		const evidence = withStepEvidence(emptyEvidence(), {
			stepId: 'offer',
			exchange: { state: 'complete', variables: { didAuthHolderDid: 'did:key:z6Mk' } }
		});

		expect(check.run({ stepId: 'offer', evidence }).met).toBe(true);
	});

	it('is not met when no DID was asserted', () => {
		const evidence = withStepEvidence(emptyEvidence(), {
			stepId: 'offer',
			exchange: { state: 'complete', variables: {} }
		});

		expect(check.run({ stepId: 'offer', evidence }).met).toBe(false);
	});
});
