import type { BadgeDefinition } from '$lib/interop/badges/index.js';
import { awardNarrative, badgeFingerprint, criteriaNarrative } from '$lib/interop/badges/index.js';

/** The unversioned achievement id and the versioned criteria id, rooted at the LER Tests domain. */
export function badgeIds(
	badge: BadgeDefinition,
	rootUrl: string
): { achievementId: string; criteriaId: string } {
	const base = `${rootUrl.replace(/\/$/, '')}/badges/${badge.slug}`;
	return { achievementId: base, criteriaId: `${base}?v=${badgeFingerprint(badge)}` };
}

/** The per-award data the credential's narrative is generated from. */
export type BadgeAward = {
	requirementsMet: number;
	requirementsTotal: number;
	scenarioCount: number;
	claimedAt: string; // ISO
};

/**
 * The **unsigned** OB3 badge document. Model the shape on
 * `scenario-runner/recipes/minimal-ob3.ts` for structure only — this module
 * imports nothing from `scenario-runner/recipes/` and nothing there imports it.
 *
 * The signing service **overwrites** `credentialSubject.id`, `credentialStatus`,
 * `issuer.id` and `proof` — it *replaces* those values, it does not inject them,
 * so `issuer.id` must be present as a **placeholder** (exactly as the proven
 * `minimal-ob3` recipe does) or the delivered credential has an issuer with no
 * id and a conformant wallet rejects it. The placeholder is `did:key:placeholder`,
 * a throwaway the tenant seed replaces — this recipe still never names the real
 * `did:web` issuer.
 *
 * The shape mirrors OB3's required fields (matching `minimal-ob3`, which real
 * wallets accept): a top-level `description`, and `Achievement.description` —
 * both required by the OB3 spec; omitting either is what an OID4 wallet refuses.
 *
 * `credentialId` is minted fresh per exchange by the endpoint — never hardcode
 * it. The version rides on `criteria.id` (`?v=<badgeFingerprint(badge)>`), which
 * is server-computed from the catalog and cannot be forged by the client.
 */
export function buildBadgeCredential(args: {
	badge: BadgeDefinition;
	award: BadgeAward;
	credentialId: string;
	rootUrl: string;
}): Record<string, unknown> {
	const { badge, award, credentialId, rootUrl } = args;
	const { achievementId, criteriaId } = badgeIds(badge, rootUrl);
	return {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id: credentialId,
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		name: badge.name,
		description: badge.description,
		// `.id` is a placeholder the signing service REPLACES from the tenant seed
		// (it does not inject one) — so it must exist. Never a real did:web here.
		issuer: {
			id: 'did:key:placeholder',
			type: ['Profile'],
			name: 'LER Interoperability Test Suite'
		},
		validFrom: award.claimedAt,
		credentialSubject: {
			id: '{{HOLDER_DID}}', // overwritten by the transaction service from the DIDAuth presentation
			type: ['AchievementSubject'],
			narrative: awardNarrative({ badge, ...award }),
			achievement: {
				id: achievementId, // stable, unversioned
				type: ['Achievement'],
				name: badge.name,
				description: badge.description, // OB3-required on Achievement
				criteria: { id: criteriaId, narrative: criteriaNarrative(badge) } // version rides here
			}
		}
	};
}
