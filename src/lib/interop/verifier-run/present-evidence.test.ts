import { describe, expect, it } from 'vitest';

import { PresentEvidence } from './present-evidence.js';

describe('PresentEvidence', () => {
	it('round-trips a successful submission with transport detail', () => {
		const evidence = PresentEvidence({
			passId: 'pass-1',
			submitted: true,
			transportStatus: 200,
			transportBody: { redirect_uri: 'https://verifier.example/done' },
			credential: { '@context': [] }
		});
		expect(PresentEvidence.schema.parse(evidence)).toEqual(evidence);
	});

	it('round-trips a failed submission carrying only an error', () => {
		const evidence = PresentEvidence({
			passId: 'pass-2',
			submitted: false,
			submissionError: 'fetch failed: ECONNREFUSED',
			credential: { '@context': [] }
		});
		expect(evidence.transportStatus).toBeUndefined();
		expect(evidence.submissionError).toBe('fetch failed: ECONNREFUSED');
	});

	it('rejects a missing submitted flag', () => {
		expect(() => PresentEvidence.schema.parse({ passId: 'pass-1', credential: {} })).toThrow();
	});

	it('rejects an empty pass id', () => {
		expect(() =>
			PresentEvidence.schema.parse({ passId: '', submitted: true, credential: {} })
		).toThrow();
	});
});
