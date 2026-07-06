import type {
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletActivity } from '$lib/interop/wallet-activity.js';
import { VcalmVerifierFlowDriver } from '$lib/server/domain/wallet-client/drivers/vcalm-verifier-flow.js';
import type { ExchangeFlowTransport } from '$lib/server/domain/wallet-client/exchange-flow-transport.js';
import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';
import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { buildPassCredential } from '../passes/build-pass.js';
import { PresentInputError } from '../present-error.js';

import { vcalmFloorOutcomes } from './vpr-checks.js';

export { PresentInputError };

/** The per-credential present result: transport evidence, the exchange floor, and wallet activity. */
export type PresentVcalmResult = {
	evidence: PresentEvidence;
	/** The automated floor for this engagement — the client keeps the first pass's. */
	floorOutcomes: VerifierCheckOutcome[];
	activity: WalletActivity[];
};

/**
 * Present one plan entry's credential to the operator's verifier over a FRESH
 * single-use VC-API exchange, all inside this one server request: engage the
 * pasted interaction URL (fetch → `vcapi` → read the VPR), run the automated
 * floor over what the exchange returned, generate the fixture for `entry.kind`
 * (server-only holder key, dropped after signing), sign a VP embedding it, and
 * submit it to the exchange. A verifier that errors on the presentation is
 * evidence (`submitted: false`), never an HTTP error; only a blank / non-URL
 * interaction URL throws {@link PresentInputError} (→ 400). Hermetic:
 * `transport` and `probe` are injected (the provider wires the real HTTP
 * exchange transport + `probeTls`).
 */
export async function presentVcalmCredential(args: {
	entry: VerifierRunPlanEntry;
	interactionUrl: string;
	cryptosuite: WalletCryptosuite;
	crypto: WalletCrypto;
	transport: ExchangeFlowTransport;
	probe: (url: string) => Promise<TlsProbeResult>;
}): Promise<PresentVcalmResult> {
	const { entry, interactionUrl, cryptosuite, crypto, transport, probe } = args;
	const url = interactionUrl.trim();
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

	const held = await buildPassCredential(crypto, cryptosuite, entry.kind);
	const driver = VcalmVerifierFlowDriver({ crypto, transport });
	const result = await driver.runPresentation({
		interactionUrl: url,
		cryptosuite,
		heldCredential: held
	});

	const { outcomes, activity: floorActivity } = await vcalmFloorOutcomes(result, probe);

	const evidence: PresentEvidence = {
		passId: entry.passId,
		submitted: result.submitted,
		...(result.submissionStatus !== undefined ? { transportStatus: result.submissionStatus } : {}),
		...(result.submissionBody !== undefined ? { transportBody: result.submissionBody } : {}),
		...(result.submissionError !== undefined ? { submissionError: result.submissionError } : {}),
		credential: result.credential
	};

	const handoff: WalletActivity = {
		id: `vcalm-present.${entry.passId}.submit`,
		kind: 'interaction',
		label: `Presented ${entry.label} to your verifier`,
		status: result.submitted ? 'ok' : 'fail',
		detail: result.submitted
			? 'The presentation was submitted to the exchange.'
			: (result.submissionError ?? 'The presentation could not be submitted to the exchange.')
	};

	return { evidence, floorOutcomes: outcomes, activity: [...floorActivity, handoff] };
}
