import type {
	Oid4RequestSummary,
	TlsSummary,
	VerifierPresentResult
} from '$lib/interop/scenario-run/index.js';

import { tamperClaimValue, tamperProofValue } from '../credential-tamper/index.js';
import {
	HttpDirectPost,
	Oid4vpPresentationDriver,
	type SubmitResponse
} from '../wallet-client/drivers/oid4vp-presentation.js';
import type { TlsProbeResult } from '../wallet-client/index.js';
import {
	matchCredential,
	Oid4vpAuthorizationRequest,
	parseAuthorizationRequestLink,
	resolveAuthorizationRequest,
	seedHeldCredential,
	type HeldCredential
} from '../wallet-client/oid4vp/index.js';
import type { WalletCrypto, WalletCryptosuite } from '../wallet-crypto/index.js';

import { PresentInputError } from './present-input-error.js';

/** The request-floor + delivery evidence one OID4VP present produced. Both halves are client-safe. */
export type PresentToOid4Result = {
	request: Oid4RequestSummary;
	present: VerifierPresentResult;
};

/** A submit-transport factory that threads an `onStatus` observer so the HTTP status is captured. */
export type SubmitFactory = (onStatus: (status: number) => void) => SubmitResponse;

/** DI VP format registry keys that count as a Data Integrity presentation. */
const DI_VP_FORMAT_KEYS = ['ldp_vp', 'di_vp'];

/**
 * Present one recipe credential to the operator's verifier over **OID4VP**, all
 * inside one call: parse the pasted authorization request (`openid4vp://` link,
 * `request_uri` URL, or request JSON), **inspect** it for the five floor facts,
 * then sign the recipe credential (fresh ephemeral did:key issuer + holder,
 * optionally tampered) and submit the `vp_token` via `direct_post`.
 *
 * This is the OID4VP sibling of {@link import('./present-to-vcalm-verifier.js')}.
 * Unlike VCALM — whose floor rides on a VC-API fetch — the OID4 floor comes from
 * inspecting the pasted request in the same present; the delivery scenario reads
 * both halves, the acceptance scenario reads only whether the submission landed.
 *
 * The intake boundary resolves the retired engine's throw-vs-score split: a
 * blank / non-link / non-JSON paste throws {@link PresentInputError} (→ 400,
 * operator re-pastes); a paste that reads as a link/JSON but fails the OID4VP
 * shape (or a by-reference fetch that fails) is **scored** — `requestResolved:
 * false`, the present skipped — so the delivery scenario fails the request-endpoint
 * row honestly rather than erroring the run. A verifier that rejects the
 * submission is `present.submitted: false` evidence, never a throw.
 *
 * Independent of `verifier-runner` (it lives under `verifier-present/`, imports
 * only `wallet-client` primitives + `scenario-run` evidence types), which is what
 * lets M13 retire the engine cleanly. Hermetic: `fetchImpl`, `submitFactory`, and
 * `probe` are injected (the provider wires real `fetch` + {@link HttpDirectPost} +
 * `probeTls`; tests pass fakes).
 */
export async function presentToOid4Verifier(args: {
	doc: Record<string, unknown>;
	cryptosuite: WalletCryptosuite;
	tamper?: 'proof' | 'claim';
	/** The operator's pasted authorization request. */
	input: string;
	crypto: WalletCrypto;
	fetchImpl: typeof fetch;
	submitFactory?: SubmitFactory;
	probe: (url: string) => Promise<TlsProbeResult>;
}): Promise<PresentToOid4Result> {
	const { doc, cryptosuite, tamper, input, crypto, fetchImpl, probe } = args;
	const submitFactory: SubmitFactory =
		args.submitFactory ?? ((onStatus) => HttpDirectPost({ fetchImpl, onStatus }));

	// 1. Parse the pasted input. Only a blank / non-link / non-JSON paste throws.
	const parsed = parseAuthorizationRequestLink(input);
	if (parsed.kind === 'invalid') {
		throw new PresentInputError(parsed.reason);
	}
	const requestForm = parsed.kind;

	// 2. Resolve (fetch when by-reference) and validate — a failure here is SCORED, not thrown.
	let raw: unknown;
	if (parsed.kind === 'by-reference') {
		try {
			raw = await resolveAuthorizationRequest({ requestUri: parsed.requestUri }, fetchImpl);
		} catch (e) {
			return unresolved(requestForm, e instanceof Error ? e.message : String(e));
		}
	} else {
		raw = parsed.request;
	}
	const validated = Oid4vpAuthorizationRequest.schema.safeParse(raw);
	if (!validated.success) {
		return unresolved(
			requestForm,
			'The pasted request did not match the expected OID4VP authorization-request shape.'
		);
	}
	const request = validated.data;

	// 3. Floor facts over the resolved request.
	//    Matchability is a request-SHAPE probe (would any OB3 satisfy the
	//    presentation_definition), so it uses a freshly seeded valid OB3 — the
	//    specific pass credential (which may be tampered/defective) never changes
	//    what the request asked for.
	const probeCredential = await seedHeldCredential(crypto, cryptosuite);
	const match = matchCredential(request, probeCredential.credential);
	const requestTls: TlsSummary =
		parsed.kind === 'by-reference'
			? summariseTls(await probe(parsed.requestUri))
			: { atLeastTls12: true, protocol: 'inline (no request endpoint)' };
	const responseTls = summariseTls(await probe(request.response_uri));

	const requestSummary: Oid4RequestSummary = {
		transport: 'oid4vp',
		requestForm,
		requestResolved: true,
		matchable: match.matches,
		...(match.matches ? {} : { matchReason: match.reason }),
		diVpFormat: diVpFormatOf(request),
		requestTls,
		responseTls
	};

	// 4. Present the step's credential (a valid control, or a defect for a pass).
	const held = await buildHeldCredential(crypto, cryptosuite, doc, tamper);
	let transportStatus: number | undefined;
	const submit = submitFactory((status) => {
		transportStatus = status;
	});
	const driver = Oid4vpPresentationDriver({ crypto, submit });
	const result = await driver.runPresentation({ request, cryptosuite, heldCredential: held });

	const present: VerifierPresentResult = {
		submitted: result.submitted,
		...(transportStatus !== undefined ? { transportStatus } : {}),
		...(result.submissionError !== undefined ? { error: { message: result.submissionError } } : {})
	};

	return { request: requestSummary, present };
}

/** The scored "the request did not resolve" result — the present is skipped. */
function unresolved(requestForm: 'inline' | 'by-reference', reason: string): PresentToOid4Result {
	return {
		request: {
			transport: 'oid4vp',
			requestForm,
			requestResolved: false,
			matchable: false,
			matchReason: reason,
			diVpFormat: 'unpinned',
			requestTls: { atLeastTls12: false, error: 'not probed' },
			responseTls: { atLeastTls12: false, error: 'not probed' }
		},
		present: { submitted: false, error: { message: reason } }
	};
}

/**
 * The request's DI VP format posture. A `ldp_vp`/`di_vp` key anywhere (the
 * definition's `format` registry or any input descriptor's `format`) → `di`;
 * every declared key JWT-family → `jwt-only` (a DI-proof OB3 cannot be presented
 * — the check fails); nothing declared, or a mixed non-JWT set → `unpinned` (the
 * check passes — a lenient verifier is not over-failed).
 */
function diVpFormatOf(request: Oid4vpAuthorizationRequest): Oid4RequestSummary['diVpFormat'] {
	const definition = request.presentation_definition;
	const keys = [
		...Object.keys(definition.format ?? {}),
		...definition.input_descriptors.flatMap((d) => Object.keys(d.format ?? {}))
	];
	if (keys.some((k) => DI_VP_FORMAT_KEYS.includes(k))) return 'di';
	if (keys.length > 0 && keys.every((k) => /^jwt/i.test(k))) return 'jwt-only';
	return 'unpinned';
}

/**
 * Sign one recipe document with a fresh ephemeral did:key issuer + holder — the
 * same honesty contract as `build-pass.ts` / the vcalm leaf — returning the held
 * credential and the holder key its `credentialSubject.id` is bound to (the
 * driver signs the VP as that holder). Optional post-signing tamper: `proof`
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
