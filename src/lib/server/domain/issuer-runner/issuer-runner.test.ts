import { describe, expect, it } from 'vitest';

import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';

import { FakeVerifierCoreClient } from './fake-verifier-core-client.js';
import { IssuerRunner } from './issuer-runner.js';

const DI_CRYPTOSUITE_ID =
	'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.cryptosuite-supported';
const BASE_EDDSA_ID = 'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022';

function outcomeFor(
	report: { groups: { outcomes: { id: string; status: string }[] }[] },
	id: string
) {
	return report.groups.flatMap((g) => g.outcomes).find((o) => o.id === id);
}

describe('IssuerRunner.verify', () => {
	it('returns a passing report for a clean fixture (open-skill selected)', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const report = await runner.verify({
			credential: rawScoreFixture,
			additiveProfiles: ['open-skill-alignment']
		});
		expect(report.verified).toBe(true);
		expect(report.groups).toHaveLength(2);
		expect(report.groups[0].checklist.kind).toBe('base');
		expect(report.groups[1].checklist.kind).toBe('additive');
		expect(report.fatalError).toBeUndefined();
	});

	it('only includes the base group when no additives are selected', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const report = await runner.verify({ credential: rawScoreFixture, additiveProfiles: [] });
		expect(report.groups).toHaveLength(1);
		expect(report.groups[0].checklist.kind).toBe('base');
	});

	it('includes the data-integrity group and passes cryptosuite-supported for an eddsa credential', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const report = await runner.verify({
			credential: rawScoreFixture,
			additiveProfiles: ['data-integrity-cryptosuites']
		});
		expect(report.groups).toHaveLength(2);
		const diGroup = report.groups.find(
			(g) => g.checklist.profileSlug === 'data-integrity-cryptosuites'
		);
		expect(diGroup).toBeDefined();
		expect(outcomeFor(report, DI_CRYPTOSUITE_ID)?.status).toBe('pass');
		expect(report.verified).toBe(true);
	});

	it('can include both additive groups at once', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const report = await runner.verify({
			credential: rawScoreFixture,
			additiveProfiles: ['open-skill-alignment', 'data-integrity-cryptosuites']
		});
		expect(report.groups).toHaveLength(3);
		const slugs = report.groups.map((g) => g.checklist.profileSlug);
		expect(slugs).toContain('open-skill-alignment');
		expect(slugs).toContain('data-integrity-cryptosuites');
	});

	it('passes the DI cryptosuite check for an ecdsa credential but FAILS the base eddsa MUST', async () => {
		// Documents the intended base/additive tension: the base profile is
		// EdDSA-only, while the data-integrity additive accepts either bundle
		// suite. An ecdsa-rdfc-2019 credential is valid under the additive but
		// not under the base direct-delivery requirement.
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const ecdsa = JSON.parse(JSON.stringify(rawScoreFixture));
		ecdsa.proof.cryptosuite = 'ecdsa-rdfc-2019';
		const report = await runner.verify({
			credential: ecdsa,
			additiveProfiles: ['data-integrity-cryptosuites']
		});
		expect(outcomeFor(report, DI_CRYPTOSUITE_ID)?.status).toBe('pass');
		expect(outcomeFor(report, BASE_EDDSA_ID)?.status).toBe('fail');
		expect(report.verified).toBe(false);
	});

	it('fails both the base eddsa MUST and the DI cryptosuite check for a non-bundle suite', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const bbs = JSON.parse(JSON.stringify(rawScoreFixture));
		bbs.proof.cryptosuite = 'bbs-2023';
		const report = await runner.verify({
			credential: bbs,
			additiveProfiles: ['data-integrity-cryptosuites']
		});
		expect(outcomeFor(report, DI_CRYPTOSUITE_ID)?.status).toBe('fail');
		expect(outcomeFor(report, BASE_EDDSA_ID)?.status).toBe('fail');
		expect(report.verified).toBe(false);
	});

	it('flips verified to false when a base MUST shape-check fails', async () => {
		const runner = IssuerRunner({ verifierClient: FakeVerifierCoreClient() });
		const broken = JSON.parse(JSON.stringify(rawScoreFixture));
		broken.proof.cryptosuite = 'bbs-2023';
		const report = await runner.verify({ credential: broken, additiveProfiles: [] });
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
		const report = await runner.verify({ credential: rawScoreFixture, additiveProfiles: [] });
		expect(report.verified).toBe(false);
		expect(report.fatalError?.message).toMatch(/boom/);
		expect(report.groups).toEqual([]);
	});
});
