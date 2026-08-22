import { describe, expect, it } from 'vitest';

import { checkById } from '../automatic-checks.js';
import type { IssuerFlowSummary, RunEvidence } from '../evidence.js';

/**
 * The shared `credential-*` family, ported from
 * `issuer-runner/checks/ob3-direct-delivery-issuer.ts` and the `di-proof` /
 * `status-list` / `issuer-did` / `valid-until` rows of the two live issuer
 * engines. Every case those engines' tests protected is carried over here, plus
 * the four `warn`/`n/a` branches M11 resolved.
 */

/** A conforming OB 3.0 credential — every payload row satisfied. */
function goodCredential(): Record<string, unknown> {
	return {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: { id: 'did:web:issuer.example' },
		validUntil: '2027-01-01T00:00:00Z',
		credentialSubject: {
			// `id` stays a `mailto:` URI deliberately: the identifier check ignores it
			// entirely, and leaving it here is what proves that.
			id: 'mailto:learner@example.edu',
			type: ['AchievementSubject'],
			identifier: [
				{
					type: 'IdentityObject',
					identityType: 'emailAddress',
					hashed: false,
					identityHash: 'learner@example.edu'
				}
			]
		},
		credentialStatus: {
			type: 'BitstringStatusListEntry',
			statusListCredential: 'https://issuer.example/status/1',
			statusListIndex: '7'
		},
		proof: {
			type: 'DataIntegrityProof',
			cryptosuite: 'eddsa-rdfc-2022',
			created: '2026-01-01T00:00:00Z',
			verificationMethod: 'did:web:issuer.example#key-1'
		}
	};
}

const verifiedFlow: IssuerFlowSummary = { transport: 'direct', verified: true };

function evidence(
	artifact?: unknown,
	flow: IssuerFlowSummary | undefined = verifiedFlow
): RunEvidence {
	return {
		steps: {
			s1: {
				stepId: 's1',
				...(artifact !== undefined ? { artifact } : {}),
				...(flow ? { issuerFlow: flow } : {})
			}
		}
	};
}

function run(id: string, ev: RunEvidence) {
	const check = checkById(id);
	expect(check, `check "${id}" is registered`).toBeDefined();
	return check!.run({ stepId: 's1', evidence: ev });
}

/** Every check in the family, so the missing-artifact contract is asserted once for all of them. */
const ALL = [
	'credential-vcdm2',
	'credential-ob3-type',
	'credential-subject-identifier-email',
	'credential-di-proof-eddsa',
	'credential-di-proof-ecdsa',
	'credential-di-proof-bundle',
	'credential-status-list',
	'credential-issuer-did',
	'credential-issuer-did-method',
	'credential-valid-until'
];

describe('the shared credential-* checks', () => {
	it('all pass on a conforming credential (bar the ECDSA pin, which is the other suite)', () => {
		const ev = evidence(goodCredential());
		for (const id of ALL) {
			const expected = id === 'credential-di-proof-ecdsa' ? false : true;
			expect(run(id, ev).met, id).toBe(expected);
		}
	});

	it('every one fails legibly with no credential, rather than throwing', () => {
		const ev = evidence(undefined);
		for (const id of ALL) {
			const result = run(id, ev);
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toBeTruthy();
		}
	});

	it('every one fails legibly on a non-object artifact', () => {
		for (const artifact of ['not json', 42, [], null]) {
			const ev = evidence(artifact);
			for (const id of ALL) expect(run(id, ev).met, `${id} / ${String(artifact)}`).toBe(false);
		}
	});
});

describe('credential-vcdm2', () => {
	it('fails without the v2 context', () => {
		const cred = { ...goodCredential(), '@context': ['https://example.test/v1'] };
		expect(run('credential-vcdm2', evidence(cred))).toMatchObject({ met: false });
	});

	it('fails without the VerifiableCredential type', () => {
		const cred = { ...goodCredential(), type: ['OpenBadgeCredential'] };
		expect(run('credential-vcdm2', evidence(cred))).toMatchObject({ met: false });
	});
});

describe('credential-ob3-type', () => {
	it('fails without the OpenBadgeCredential type', () => {
		const cred = { ...goodCredential(), type: ['VerifiableCredential'] };
		expect(run('credential-ob3-type', evidence(cred))).toMatchObject({ met: false });
	});
});

describe('credential-subject-identifier-email', () => {
	/** A conforming credential whose subject is replaced wholesale. */
	function withSubject(subject: unknown) {
		return { ...goodCredential(), credentialSubject: subject };
	}
	const emailIdentifier = {
		type: 'IdentityObject',
		identityType: 'emailAddress',
		hashed: false,
		identityHash: 'learner@example.edu'
	};
	const check = 'credential-subject-identifier-email';

	it('passes on an unhashed emailAddress IdentityObject', () => {
		expect(run(check, evidence(goodCredential())).met).toBe(true);
	});

	it('passes with NO credentialSubject.id at all — the whole point of the M11 reversal', () => {
		const cred = withSubject({ type: ['AchievementSubject'], identifier: [emailIdentifier] });
		expect(run(check, evidence(cred)).met).toBe(true);
	});

	it('does not accept a mailto: credentialSubject.id on its own', () => {
		const cred = withSubject({ id: 'mailto:learner@example.edu' });
		expect(run(check, evidence(cred)).met).toBe(false);
	});

	it('passes when a conforming entry sits among non-matching ones', () => {
		const cred = withSubject({
			identifier: [
				{ type: 'IdentityObject', identityType: 'sourcedId', hashed: false, identityHash: 'A-1' },
				emailIdentifier
			]
		});
		expect(run(check, evidence(cred)).met).toBe(true);
	});

	it('tolerates the single-object identifier form and the array type form', () => {
		const cred = withSubject({ identifier: { ...emailIdentifier, type: ['IdentityObject'] } });
		expect(run(check, evidence(cred)).met).toBe(true);
	});

	it('FAILS a hashed identifier, and says why the profile wants plaintext', () => {
		const cred = withSubject({
			identifier: [{ ...emailIdentifier, hashed: true, identityHash: 'a1b2c3', salt: 's' }]
		});
		const result = run(check, evidence(cred));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/not published/);
		expect(result.detail).toMatch(/case-insensitive/);
	});

	it('fails when `hashed` is absent — it is required, and absent must not read as false', () => {
		const cred = withSubject({
			identifier: [{ type: 'IdentityObject', identityType: 'emailAddress', identityHash: 'a@b.co' }]
		});
		const result = run(check, evidence(cred));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/hashed/);
	});

	it('fails on a non-emailAddress identityType, naming what was found instead', () => {
		const cred = withSubject({
			identifier: [
				{ type: 'IdentityObject', identityType: 'sourcedId', hashed: false, identityHash: 'A-1' }
			]
		});
		const result = run(check, evidence(cred));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/sourcedId/);
	});

	it('fails when no entry declares type IdentityObject', () => {
		const cred = withSubject({
			identifier: [{ identityType: 'emailAddress', hashed: false, identityHash: 'a@b.co' }]
		});
		expect(run(check, evidence(cred)).met).toBe(false);
	});

	it('fails when the identityHash is not an address', () => {
		for (const identityHash of ['learner', 42, undefined]) {
			const cred = withSubject({ identifier: [{ ...emailIdentifier, identityHash }] });
			expect(run(check, evidence(cred)).met, String(identityHash)).toBe(false);
		}
	});

	it('fails on an absent, empty or unreadable identifier', () => {
		for (const subject of [{}, { identifier: [] }, { identifier: ['learner@example.edu'] }]) {
			expect(run(check, evidence(withSubject(subject))).met).toBe(false);
		}
		expect(run(check, evidence({ ...goodCredential(), credentialSubject: 42 })).met).toBe(false);
	});

	it('reads the first entry of an array-form credentialSubject', () => {
		const cred = withSubject([{ identifier: [emailIdentifier] }]);
		expect(run(check, evidence(cred)).met).toBe(true);
	});

	it('retires the old id rather than shadowing it', () => {
		expect(checkById('credential-subject-email')).toBeUndefined();
	});
});

describe('the three di-proof checks', () => {
	it('pin their suites: eddsa passes eddsa, ecdsa passes ecdsa, bundle passes either', () => {
		const eddsa = goodCredential();
		const ecdsa = {
			...goodCredential(),
			proof: { ...(goodCredential().proof as object), cryptosuite: 'ecdsa-rdfc-2019' }
		};
		expect(run('credential-di-proof-eddsa', evidence(eddsa)).met).toBe(true);
		expect(run('credential-di-proof-eddsa', evidence(ecdsa)).met).toBe(false);
		expect(run('credential-di-proof-ecdsa', evidence(ecdsa)).met).toBe(true);
		expect(run('credential-di-proof-ecdsa', evidence(eddsa)).met).toBe(false);
		expect(run('credential-di-proof-bundle', evidence(eddsa)).met).toBe(true);
		expect(run('credential-di-proof-bundle', evidence(ecdsa)).met).toBe(true);
	});

	it('fails an out-of-bundle suite', () => {
		const cred = {
			...goodCredential(),
			proof: { ...(goodCredential().proof as object), cryptosuite: 'bbs-2023' }
		};
		expect(run('credential-di-proof-bundle', evidence(cred)).met).toBe(false);
	});

	it('fails a missing proof, a wrong proof type, a bad `created` and a missing method', () => {
		const base = goodCredential();
		const cases: Record<string, unknown>[] = [
			{ ...base, proof: undefined },
			{ ...base, proof: { ...(base.proof as object), type: 'Ed25519Signature2020' } },
			{ ...base, proof: { ...(base.proof as object), created: 'not-a-date' } },
			{ ...base, proof: { ...(base.proof as object), verificationMethod: undefined } }
		];
		for (const cred of cases) {
			expect(run('credential-di-proof-eddsa', evidence(cred)).met).toBe(false);
		}
	});
});

describe('credential-status-list', () => {
	it('accepts an array-form `type`', () => {
		const cred = {
			...goodCredential(),
			credentialStatus: {
				type: ['BitstringStatusListEntry'],
				statusListCredential: 'https://issuer.example/status/1',
				statusListIndex: '7'
			}
		};
		expect(run('credential-status-list', evidence(cred)).met).toBe(true);
	});

	it('says plainly that the list itself is not fetched', () => {
		expect(run('credential-status-list', evidence(goodCredential())).detail).toMatch(
			/not fetched/i
		);
	});

	it('fails a missing entry, a wrong type, and either missing field', () => {
		const base = goodCredential();
		const cases: Record<string, unknown>[] = [
			{ ...base, credentialStatus: undefined },
			{ ...base, credentialStatus: { type: 'StatusList2021Entry' } },
			{
				...base,
				credentialStatus: { type: 'BitstringStatusListEntry', statusListIndex: '7' }
			},
			{
				...base,
				credentialStatus: {
					type: 'BitstringStatusListEntry',
					statusListCredential: 'https://issuer.example/status/1'
				}
			}
		];
		for (const cred of cases) expect(run('credential-status-list', evidence(cred)).met).toBe(false);
	});
});

describe('credential-issuer-did and credential-issuer-did-method', () => {
	it('both accept did:web and did:key, and both reject anything else', () => {
		for (const id of ['did:web:issuer.example', 'did:key:zAbc']) {
			const cred = { ...goodCredential(), issuer: { id } };
			expect(run('credential-issuer-did', evidence(cred)).met).toBe(true);
			expect(run('credential-issuer-did-method', evidence(cred)).met).toBe(true);
		}
		const bad = { ...goodCredential(), issuer: { id: 'https://issuer.example' } };
		expect(run('credential-issuer-did', evidence(bad)).met).toBe(false);
		expect(run('credential-issuer-did-method', evidence(bad)).met).toBe(false);
	});

	it('accepts the string form of `issuer`', () => {
		const cred = { ...goodCredential(), issuer: 'did:key:zAbc' };
		expect(run('credential-issuer-did-method', evidence(cred)).met).toBe(true);
	});

	it('fails both when `issuer.id` is missing', () => {
		const cred = { ...goodCredential(), issuer: {} };
		expect(run('credential-issuer-did', evidence(cred)).met).toBe(false);
		expect(run('credential-issuer-did-method', evidence(cred)).met).toBe(false);
	});

	it('only `credential-issuer-did` reads the verification result', () => {
		const unverified: IssuerFlowSummary = {
			transport: 'direct',
			verified: false,
			verifyErrors: ['signature invalid']
		};
		const ev = evidence(goodCredential(), unverified);
		const withVerify = run('credential-issuer-did', ev);
		expect(withVerify.met).toBe(false);
		expect(withVerify.detail).toMatch(/signature invalid/);
		// The method-only check is deliberately silent about verification, so the
		// DIC producer scenarios do not re-report the base scenario's failure.
		expect(run('credential-issuer-did-method', ev).met).toBe(true);
	});

	it('`credential-issuer-did` fails when the step recorded no intake at all', () => {
		const ev: RunEvidence = { steps: { s1: { stepId: 's1', artifact: goodCredential() } } };
		expect(run('credential-issuer-did', ev).met).toBe(false);
	});
});

describe('credential-valid-until', () => {
	it('passes on a parseable date', () => {
		expect(run('credential-valid-until', evidence(goodCredential())).met).toBe(true);
	});

	it('FAILS when absent — the engine’s `n/a`/`warn` branch, resolved (M11)', () => {
		const cred = { ...goodCredential(), validUntil: undefined };
		const result = run('credential-valid-until', evidence(cred));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/no expiration/i);
	});

	it('fails on an unparseable date', () => {
		const cred = { ...goodCredential(), validUntil: 'whenever' };
		expect(run('credential-valid-until', evidence(cred)).met).toBe(false);
	});
});
