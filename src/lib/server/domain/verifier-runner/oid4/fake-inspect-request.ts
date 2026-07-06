import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import {
	checkActivity,
	floorOutcome,
	interactionActivity,
	OID4_FLOOR_ROW_IDS as IDS
} from './inspect-checks.js';
import type { InspectOid4Result } from './inspect-request.js';

/**
 * Deterministic inspect result for tests + stories: no network, no crypto.
 * Mirrors a healthy by-reference request — all five floor rows resolve
 * `pass` with stable messages and narrated activity, plus a canned
 * resolved request for the route's `requestSummary`.
 */
export async function fakeInspectOid4Request(_args: {
	input: string;
	cryptosuite: WalletCryptosuite;
}): Promise<InspectOid4Result> {
	const outcomes = [
		floorOutcome(
			IDS.requestEndpoint,
			'pass',
			'The authorization request resolved from the request endpoint.'
		),
		floorOutcome(
			IDS.requestMatchable,
			'pass',
			'The presentation definition matched a seeded OpenBadgeCredential.'
		),
		floorOutcome(
			IDS.requestDiVpFormat,
			'pass',
			'The request pins a Data Integrity VP format (`ldp_vp`).'
		),
		floorOutcome(IDS.requestTls, 'pass', 'The request endpoint negotiated TLSv1.3.'),
		floorOutcome(IDS.responseTls, 'pass', 'The response endpoint negotiated TLSv1.3.')
	];
	const [endpoint, matchable, format, requestTls, responseTls] = outcomes;
	return {
		outcomes,
		activity: [
			interactionActivity('read-input', 'Read the pasted request', 'ok', undefined, 0),
			interactionActivity('fetch-request', 'Fetched the request object', 'ok', undefined, 0),
			checkActivity(endpoint, 'Request endpoint', 0),
			interactionActivity(
				'nonce-freshness',
				'Nonce freshness',
				'ok',
				'A second fetch returned a fresh nonce.',
				0
			),
			checkActivity(matchable, 'Presentation definition match', 0),
			checkActivity(format, 'Data Integrity VP format', 0),
			checkActivity(requestTls, 'Request endpoint TLS', 0),
			checkActivity(responseTls, 'Response endpoint TLS', 1)
		],
		resolvedRequest: {
			client_id: 'https://verifier.example',
			response_uri: 'https://verifier.example/direct-post',
			response_mode: 'direct_post',
			nonce: 'fake-nonce-1',
			presentation_definition: {
				id: 'fake-pd-1',
				format: { ldp_vp: {} },
				input_descriptors: [{ id: 'openbadge-credential' }]
			}
		},
		form: 'by-reference'
	};
}
