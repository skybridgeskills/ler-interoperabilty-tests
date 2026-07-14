/**
 * The slice of a VCALM issuer run's `raw` payload. Mirrors the inline `RunRaw`
 * the page holds in `$state`; kept here so the evidence mapper is a pure,
 * framework-free, unit-testable module.
 */
export type RunRaw = {
	interaction?: unknown;
	didAuth?: unknown;
	delivery?: unknown;
	verify?: unknown;
};

const P = 'vcalm.issuer.credential-issuance.';

/**
 * Map a base VCALM issuer requirement id to the slice of the run `raw` that is
 * the relevant evidence for that check's Details panel:
 *
 * - interaction-endpoint checks → `raw.interaction`
 * - DID-Auth checks → `raw.didAuth`
 * - credential/proof checks → `raw.delivery.credential`
 * - `issuer-did` → the credential plus `raw.verify`
 *
 * Returns `undefined` when there is no useful evidence for the id (the row then
 * shows no raw block). The caller only supplies `raw` once the run is `done`.
 */
export function evidenceForRequirement(id: string, raw: RunRaw): unknown {
	const credential = (raw.delivery as { credential?: unknown } | undefined)?.credential;
	switch (id) {
		case `${P}interaction-url-fetchable`:
		case `${P}participation-endpoint`:
		case `${P}tls`:
		case `${P}participation-problemdetails`:
		case `${P}vcapi-in-protocols`:
			return raw.interaction;
		case `${P}didauth-requested`:
		case `${P}didauth-problemdetails`:
			return raw.didAuth;
		case `${P}issuer-did`:
			return { credential, verify: raw.verify };
		case `${P}binds-verified-holder`:
		case `${P}vcdm-2`:
		case `${P}openbadge-3`:
		case `${P}di-proof`:
		case `${P}status-list`:
		case `${P}valid-until`:
			return credential;
		default:
			return undefined;
	}
}
