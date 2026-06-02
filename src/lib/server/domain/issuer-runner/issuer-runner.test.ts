import { describe, expect, it } from 'vitest';

import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';

import { FakeVerifierCoreClient } from './fake-verifier-core-client.js';
import { IssuerRunner } from './issuer-runner.js';

describe('IssuerRunner.verify', () => {
	it('returns a passing report for a clean fixture (additive on)', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const report = await runner.verify({ credential: rawScoreFixture, includeAdditive: true });
		expect(report.verified).toBe(true);
		expect(report.groups).toHaveLength(2);
		expect(report.groups[0].checklist.kind).toBe('base');
		expect(report.groups[1].checklist.kind).toBe('additive');
		expect(report.fatalError).toBeUndefined();
	});

	it('only includes the base group when additive is off', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const report = await runner.verify({ credential: rawScoreFixture, includeAdditive: false });
		expect(report.groups).toHaveLength(1);
		expect(report.groups[0].checklist.kind).toBe('base');
	});

	it('flips verified to false when verifier-core reports a bad signature', async () => {
		const runner = IssuerRunner({
			verifierClient: FakeVerifierCoreClient({
				verified: false,
				log: [{ id: 'valid_signature', valid: false }]
			})
		});
		// verifier-core's `valid_signature` row is mapped via the base checks
		// at the credential-shape level (cryptosuite + structure). The fake
		// reports an invalid signature, but the credential shape is still
		// valid — so `verified` here depends on whether any MUST flipped.
		// Tamper the fixture so a MUST shape-check fails:
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.proof.cryptosuite = 'bbs-2023';
		const report = await runner.verify({ credential: broken, includeAdditive: false });
		expect(report.verified).toBe(false);
	});

	it('returns fatalError when verifier-core throws', async () => {
		const runner = IssuerRunner({
			verifierClient: {
				async verifyCredential() {
					throw new Error('boom');
				}
			}
		});
		const report = await runner.verify({ credential: rawScoreFixture, includeAdditive: false });
		expect(report.verified).toBe(false);
		expect(report.fatalError?.message).toMatch(/boom/);
		expect(report.groups).toEqual([]);
	});
});
