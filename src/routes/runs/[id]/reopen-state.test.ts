import { describe, expect, it } from 'vitest';

import {
	combinedRequirements,
	runChecklistFingerprint,
	testRunRecord,
	type FingerprintRequirement
} from '$lib/interop/index.js';

import { reopenStateFor } from './reopen-state.js';

const requirements = combinedRequirements('wallet', 'credential-acceptance', 'vcalm');
const fingerprint = runChecklistFingerprint(requirements);

const currentRun = testRunRecord({
	role: 'wallet',
	workflow: 'credential-acceptance',
	profile: 'vcalm',
	status: 'passed',
	checklistFingerprint: fingerprint,
	statuses: {}
});

describe('reopenStateFor', () => {
	it('returns not-found when there is no record', () => {
		expect(reopenStateFor(undefined, requirements)).toBe('not-found');
	});

	it('returns outdated when the record fingerprint no longer matches', () => {
		const drifted: FingerprintRequirement[] = [
			...requirements,
			{ id: 'new-req', level: 'MUST', text: 'A requirement added after the run.' }
		];
		expect(reopenStateFor(currentRun, drifted)).toBe('outdated');
	});

	it('returns render for a valid, current run', () => {
		expect(reopenStateFor(currentRun, requirements)).toBe('render');
	});

	it('prefers not-found over outdated when the record is absent', () => {
		// Even with a mismatching (empty) requirement set, an absent record is not-found.
		expect(reopenStateFor(undefined, [])).toBe('not-found');
	});
});
