import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { WalletActivity } from '$lib/interop/wallet-activity.js';
import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';
import {
	matchCredential,
	Oid4vpAuthorizationRequest,
	parseAuthorizationRequestLink,
	resolveAuthorizationRequest,
	seedHeldCredential
} from '$lib/server/domain/wallet-client/oid4vp/index.js';
import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import {
	checkActivity,
	diVpFormatCheck,
	floorOutcome,
	interactionActivity,
	nonceFreshness,
	notCheckedOutcomes,
	OID4_FLOOR_ROW_IDS as IDS,
	stepIndexOf,
	summarizeIssues,
	tlsOutcome
} from './inspect-checks.js';

/** How the operator's pasted input carried the authorization request. */
export type Oid4RequestForm = 'inline' | 'by-reference';

/** The automated floor over one pasted OID4VP authorization request. */
export type InspectOid4Result = {
	outcomes: VerifierCheckOutcome[];
	activity: WalletActivity[];
	resolvedRequest?: Oid4vpAuthorizationRequest;
	form?: Oid4RequestForm;
};

/**
 * Run the automated oid4 verifier floor over one pasted authorization request:
 * parse the `openid4vp://` link / URL / JSON, resolve and validate the request,
 * then check matchability against a seeded OB3 credential, the Data Integrity
 * VP format, nonce freshness (by-reference only, via a second fetch), and
 * TLS ≥ 1.2 on the request and response endpoints. Intake failures score only
 * `oid4.verifier-request-endpoint` as `fail` — later rows resolve `n/a`, never
 * cascading fails. Hermetic by construction: `fetchImpl`/`tlsProbe`/`crypto`
 * are injected (the provider wires `fetch`/`probeTls`/`WalletCrypto`).
 */
export async function inspectOid4Request(args: {
	input: string;
	cryptosuite: WalletCryptosuite;
	crypto: WalletCrypto;
	fetchImpl: typeof fetch;
	tlsProbe: (url: string) => Promise<TlsProbeResult>;
}): Promise<InspectOid4Result> {
	const { input, cryptosuite, crypto, fetchImpl, tlsProbe } = args;
	const requestStep = stepIndexOf(IDS.requestEndpoint);
	const responseStep = stepIndexOf(IDS.responseTls);
	const activity: WalletActivity[] = [];
	const laterRows = [IDS.requestMatchable, IDS.requestDiVpFormat, IDS.requestTls, IDS.responseTls];
	const intakeFailed = (message: string): InspectOid4Result => ({
		outcomes: [
			floorOutcome(IDS.requestEndpoint, 'fail', message),
			...notCheckedOutcomes(laterRows, 'Not checked — the authorization request did not resolve.')
		],
		activity
	});

	// 1. Parse the pasted input.
	const parsed = parseAuthorizationRequestLink(input);
	if (parsed.kind === 'invalid') {
		activity.push(
			interactionActivity(
				'read-input',
				'Read the pasted request',
				'fail',
				parsed.reason,
				requestStep
			)
		);
		return intakeFailed(parsed.reason);
	}
	const form: Oid4RequestForm = parsed.kind;
	const readDetail =
		parsed.kind === 'inline'
			? 'The input carried the authorization request inline.'
			: `The input points at a request endpoint (${parsed.requestUri}).`;
	activity.push(
		interactionActivity('read-input', 'Read the pasted request', 'ok', readDetail, requestStep)
	);

	// 2. Resolve (fetch when by-reference) and validate.
	let raw: unknown;
	if (parsed.kind === 'by-reference') {
		try {
			raw = await resolveAuthorizationRequest({ requestUri: parsed.requestUri }, fetchImpl);
			activity.push(
				interactionActivity(
					'fetch-request',
					'Fetched the request object',
					'ok',
					undefined,
					requestStep
				)
			);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			activity.push(
				interactionActivity(
					'fetch-request',
					'Fetched the request object',
					'fail',
					message,
					requestStep
				)
			);
			return intakeFailed(message);
		}
	} else {
		raw = parsed.request;
	}
	const validated = Oid4vpAuthorizationRequest.schema.safeParse(raw);
	if (!validated.success) {
		const message = `The request does not match the expected OID4VP shape — ${summarizeIssues(validated.error.issues)}`;
		activity.push(
			checkActivity(
				floorOutcome(IDS.requestEndpoint, 'fail', message),
				'Request endpoint',
				requestStep
			)
		);
		return intakeFailed(message);
	}
	const request = validated.data;

	// 3. Endpoint row (may downgrade to warn on nonce reuse below).
	let endpoint = floorOutcome(
		IDS.requestEndpoint,
		'pass',
		form === 'inline'
			? 'The authorization request was read from the pasted input.'
			: 'The authorization request resolved from the request endpoint.'
	);
	activity.push(checkActivity(endpoint, 'Request endpoint', requestStep));
	if (parsed.kind === 'by-reference') {
		endpoint = await nonceFreshness(
			endpoint,
			request,
			parsed.requestUri,
			fetchImpl,
			activity,
			requestStep
		);
	} else {
		activity.push(
			interactionActivity(
				'nonce-freshness',
				'Nonce freshness',
				'info',
				'Not assessed — the request was provided inline, so there is no endpoint to fetch a second nonce from.',
				requestStep
			)
		);
	}

	// 4. Matchability against a seeded OB3 credential.
	const held = await seedHeldCredential(crypto, cryptosuite);
	const match = matchCredential(request, held.credential);
	const matchable = match.matches
		? floorOutcome(
				IDS.requestMatchable,
				'pass',
				'The presentation definition matched a seeded OpenBadgeCredential.'
			)
		: floorOutcome(IDS.requestMatchable, 'fail', match.reason);
	activity.push(checkActivity(matchable, 'Presentation definition match', requestStep));

	// 5. Data Integrity VP format.
	const format = diVpFormatCheck(request);
	activity.push(checkActivity(format, 'Data Integrity VP format', requestStep));

	// 6. TLS on the request endpoint (n/a when inline) and the response endpoint.
	const requestTls =
		parsed.kind === 'by-reference'
			? tlsOutcome(IDS.requestTls, 'request endpoint', await tlsProbe(parsed.requestUri))
			: floorOutcome(
					IDS.requestTls,
					'n/a',
					'The request was provided inline — there is no request endpoint to probe.'
				);
	activity.push(checkActivity(requestTls, 'Request endpoint TLS', requestStep));
	const responseTls = tlsOutcome(
		IDS.responseTls,
		'response endpoint',
		await tlsProbe(request.response_uri)
	);
	activity.push(checkActivity(responseTls, 'Response endpoint TLS', responseStep));

	return {
		outcomes: [endpoint, matchable, format, requestTls, responseTls],
		activity,
		resolvedRequest: request,
		form
	};
}
