import type {
	TlsSummary,
	VerifierPresentResult,
	VerifierRequestSummary
} from '$lib/interop/scenario-run/index.js';

import { tamperClaimValue, tamperProofValue } from '../credential-tamper/index.js';
import type { HeldCredential } from '../wallet-client/drivers/vcalm-verifier-flow.js';
import { VcalmVerifierFlowDriver } from '../wallet-client/drivers/vcalm-verifier-flow.js';
import type { ExchangeFlowTransport, TlsProbeResult } from '../wallet-client/index.js';
import type { WalletCrypto, WalletCryptosuite } from '../wallet-crypto/index.js';

import { PresentInputError } from './present-input-error.js';

/** The request + delivery evidence one VCALM present produced. Both halves are client-safe. */
export type PresentToVcalmResult = {
	request: VerifierRequestSummary;
	present: VerifierPresentResult;
};

/**
 * Present one recipe credential to the operator's verifier over a **fresh
 * single-use VC-API exchange**, all inside one call: validate the pasted
 * interaction URL, sign the credential (fresh ephemeral did:key issuer + holder,
 * optionally tampered), engage the exchange as holder, submit, and summarise
 * what the request asked for and whether the submission landed.
 *
 * This is the reusable holder-side present primitive the `present-to-verifier`
 * scenario action drives. It knows nothing of scenarios or the old
 * `verifier-runner` row model: it returns a **client-safe** `{ request, present }`
 * summary, and the scenario floor/delivery `automatic` checks derive pass/fail
 * from it. A verifier that errors on the submission is `present.submitted:
 * false`, never a throw; only a blank / non-URL interaction URL throws
 * {@link PresentInputError} (→ 400 at the route).
 *
 * Hermetic: `transport` and `probe` are injected (the provider wires the real
 * HTTP exchange transport + `probeTls`; tests pass fakes).
 */
export async function presentToVcalmVerifier(args: {
	doc: Record<string, unknown>;
	cryptosuite: WalletCryptosuite;
	tamper?: 'proof' | 'claim';
	interactionUrl: string;
	crypto: WalletCrypto;
	transport: ExchangeFlowTransport;
	probe: (url: string) => Promise<TlsProbeResult>;
}): Promise<PresentToVcalmResult> {
	const url = args.interactionUrl.trim();
	if (url === '') {
		throw new PresentInputError('Paste the interaction URL from your verifier.');
	}
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new PresentInputError('The interaction URL must be an absolute http(s) URL.');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new PresentInputError('The interaction URL must use http or https.');
	}

	const held = await buildHeldCredential(args.crypto, args.cryptosuite, args.doc, args.tamper);
	const driver = VcalmVerifierFlowDriver({ crypto: args.crypto, transport: args.transport });
	const result = await driver.runPresentation({
		interactionUrl: url,
		cryptosuite: args.cryptosuite,
		heldCredential: held
	});

	// The exchange endpoint's TLS is probed here — the interaction host's was
	// probed by the transport during the fetch. No `vcapi` host → an undeterminable
	// TLS summary, which the response-tls check reads as a fail (the model has no
	// `n/a`; an intake failure fails the floor cleanly rather than cascading).
	const vcapiAdvertised = result.fetch.ok && !!result.fetch.vcapiUrl;
	const responseTls: TlsProbeResult =
		vcapiAdvertised && result.fetch.vcapiUrl
			? await args.probe(result.fetch.vcapiUrl)
			: { ok: false, atLeastTls12: false, error: 'The exchange advertised no endpoint to probe.' };

	const request: VerifierRequestSummary = {
		transport: 'vcalm',
		vcapiAdvertised,
		vprReceived: result.vprReceived,
		vprMatched: result.matched,
		...(result.matchReason !== undefined ? { matchReason: result.matchReason } : {}),
		didAuth: result.didAuth,
		requestTls: summariseTls(result.fetch.tls),
		responseTls: summariseTls(responseTls)
	};

	const present: VerifierPresentResult = {
		submitted: result.submitted,
		...(result.submissionStatus !== undefined ? { transportStatus: result.submissionStatus } : {}),
		...(result.submissionError !== undefined ? { error: { message: result.submissionError } } : {})
	};

	return { request, present };
}

/**
 * Sign one recipe document with a fresh ephemeral did:key issuer + holder — the
 * same honesty contract as `build-pass.ts` / `sign-deliverable.ts` — returning
 * the held credential and the holder key its `credentialSubject.id` is bound to
 * (the driver signs the VP as that holder). Optional post-signing tamper: `proof`
 * breaks the signature, `claim` mutates a covered value, both leaving the holder
 * binding intact.
 */
async function buildHeldCredential(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	doc: Record<string, unknown>,
	tamper?: 'proof' | 'claim'
): Promise<HeldCredential> {
	const issuer = await crypto.generateKey(cryptosuite);
	const holder = await crypto.generateKey(cryptosuite);
	bindIssuer(doc, issuer.did);
	bindSubject(doc, holder.did);
	const signed = await crypto.issueCredential({ issuer, credential: doc });
	const credential =
		tamper === 'proof'
			? tamperProofValue(signed)
			: tamper === 'claim'
				? tamperClaimValue(signed)
				: signed;
	return { credential, holder };
}

/** Replace the recipe's placeholder `issuer.id`; tolerate a string issuer too. */
function bindIssuer(doc: Record<string, unknown>, did: string): void {
	const issuer = doc.issuer;
	if (issuer && typeof issuer === 'object') {
		(issuer as { id?: unknown }).id = did;
	} else {
		doc.issuer = did;
	}
}

/** Replace the recipe's placeholder `credentialSubject.id`. */
function bindSubject(doc: Record<string, unknown>, did: string): void {
	const subject = doc.credentialSubject;
	if (subject && typeof subject === 'object' && !Array.isArray(subject)) {
		(subject as { id?: unknown }).id = did;
		return;
	}
	throw new Error('Recipe document has no `credentialSubject` object to bind a holder DID onto.');
}

/** Collapse a TLS probe result to the client-safe summary the checks read. */
function summariseTls(tls?: TlsProbeResult): TlsSummary {
	return {
		atLeastTls12: tls?.atLeastTls12 ?? false,
		...(tls?.protocol !== undefined ? { protocol: tls.protocol } : {}),
		...(tls?.error !== undefined ? { error: tls.error } : {})
	};
}
