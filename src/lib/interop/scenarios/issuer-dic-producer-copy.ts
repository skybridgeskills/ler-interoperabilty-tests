import type { PerspectiveCopy } from '$lib/interop/perspective/perspective.js';

/**
 * The copy the six `data-integrity-cryptosuites` issuer producer scenarios
 * share, templated over (suite × protocol). Split from `issuer-dic-producer.ts`
 * to keep the factory short; the scenarios themselves stay there.
 */

type Suite = 'eddsa' | 'ecdsa';

const SUITE_NAME: Record<Suite, string> = { eddsa: 'eddsa-rdfc-2022', ecdsa: 'ecdsa-rdfc-2019' };

const SUITE_LABEL: Record<Suite, string> = { eddsa: 'EdDSA', ecdsa: 'ECDSA' };

/** The whole instruction: configure the issuer to sign with this suite, then deliver over this transport. */
export function summaryFor(suite: Suite, delivery: string): string {
	const name = suite === 'eddsa' ? '`eddsa-rdfc-2022`' : '`ecdsa-rdfc-2019`';
	return `Configure the issuer to sign with ${name}, then ${delivery} We read the cryptosuite off the credential's proof; this is the whole of what the scenario asks.`;
}

/** The blurb every member carries: this scenario belongs to THIS protocol's add-on badge. */
export function blurbFor(suite: Suite, protocol: string): string {
	const name = SUITE_NAME[suite];
	return `Sign a credential with ${name} and deliver it over ${protocol}. It counts toward this protocol's Data Integrity Cryptosuites add-on badge; the other protocols have their own.`;
}

/**
 * The Builder / Evaluator framing, with the same suite and protocol names the
 * blurb interpolates. The Builder line names the sibling suite because this
 * protocol's add-on badge asks for both.
 */
export function framingFor(suite: Suite, protocol: string): PerspectiveCopy {
	const name = SUITE_NAME[suite];
	const other = SUITE_LABEL[suite === 'eddsa' ? 'ecdsa' : 'eddsa'];
	// "a direct paste" is a hand-over, not a channel: "delivered as a direct paste".
	const via = protocol.startsWith('a ') ? `as ${protocol}` : `over ${protocol}`;
	return {
		builder: `You’re testing whether your own issuer can sign with ${name}: have a build with ${name} configured as its signing suite and an issuer identified by a did:web or did:key DID. We read only the cryptosuite and the DID method off the credential you deliver ${via}, so a failure means the proof used another suite or the DID another method. This protocol’s Data Integrity Cryptosuites Add-on needs this scenario and the ${other} one, so plan to run both.`,
		evaluator: `You’re checking whether a vendor’s issuer really signs with ${name}, rather than taking it on trust from a feature list. Ask the vendor to show where the signing suite is set, then have a credential issued and delivered ${via}; we read the suite off the proof itself. A failure means the credential was signed with something else, or its issuer DID is not did:web or did:key, whatever the settings screen says.`
	};
}
