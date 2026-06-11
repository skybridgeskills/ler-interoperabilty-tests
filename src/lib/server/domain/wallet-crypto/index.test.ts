import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from './index.js';

const SUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

describe('WalletCrypto', () => {
	for (const cs of SUITES) {
		describe(cs, () => {
			it('generates an ephemeral did:key holder bound to a verification method', async () => {
				const wc = WalletCrypto();
				const key = await wc.generateKey(cs);
				expect(key.did).toMatch(/^did:key:/);
				expect(key.verificationMethod.startsWith(key.did)).toBe(true);
				expect(key.cryptosuite).toBe(cs);
			});

			it('issues and verifies a credential round-trip; rejects tampering', async () => {
				const wc = WalletCrypto();
				const issuer = await wc.generateKey(cs);
				const holder = await wc.generateKey(cs);
				const credential = {
					'@context': ['https://www.w3.org/ns/credentials/v2'],
					type: ['VerifiableCredential'],
					issuer: issuer.did,
					credentialSubject: { id: holder.did }
				};
				const signed = (await wc.issueCredential({ issuer, credential })) as {
					proof: { cryptosuite: string };
					credentialSubject: unknown;
				};
				expect(signed.proof.cryptosuite).toBe(cs);

				const ok = await wc.verifyCredential(signed);
				expect(ok.verified).toBe(true);
				expect(ok.issuerDid).toBe(issuer.did);
				expect(ok.cryptosuite).toBe(cs);

				const tampered = { ...signed, credentialSubject: { id: 'did:key:zEvilSubject' } };
				const bad = await wc.verifyCredential(tampered);
				expect(bad.verified).toBe(false);
			});

			it('signs and verifies a DIDAuth VP bound to challenge/domain; rejects a wrong challenge', async () => {
				const wc = WalletCrypto();
				const holder = await wc.generateKey(cs);
				const challenge = 'challenge-xyz';
				const domain = 'https://verifier.example';

				const vp = await wc.signPresentation({ holder, challenge, domain });
				const ok = await wc.verifyPresentation(vp, { challenge, domain });
				expect(ok.verified).toBe(true);
				expect(ok.holderDid).toBe(holder.did);

				const wrong = await wc.verifyPresentation(vp, { challenge: 'wrong-challenge', domain });
				expect(wrong.verified).toBe(false);
			});

			it('carries a credential inside a signed VP (OID4VP-style)', async () => {
				const wc = WalletCrypto();
				const issuer = await wc.generateKey(cs);
				const holder = await wc.generateKey(cs);
				const signedVc = await wc.issueCredential({
					issuer,
					credential: {
						'@context': ['https://www.w3.org/ns/credentials/v2'],
						type: ['VerifiableCredential'],
						issuer: issuer.did,
						credentialSubject: { id: holder.did }
					}
				});
				const challenge = 'present-1';
				const domain = 'https://verifier.example';
				const vp = await wc.signPresentation({
					holder,
					challenge,
					domain,
					verifiableCredential: signedVc
				});
				const ok = await wc.verifyPresentation(vp, { challenge, domain });
				expect(ok.verified).toBe(true);
			});
		});
	}
});
