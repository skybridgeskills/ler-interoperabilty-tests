import { profileBySlug, roleBySlug, rolesOfProfile } from '$lib/interop/accessors.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';

/**
 * What the homepage says when a filter matches no scenario set. Only a role ×
 * Standard Profile gap can empty the list (add-ons never filter sets out), so
 * the copy names the gap and what each selected profile does cover — the reader
 * can see which choice to drop instead of being told only that nothing matched.
 */
export function emptyStateCopy(selection: { roles: RoleSlug[]; profiles: ProfileSlug[] }): {
	headline: string;
	coverage: string[];
} {
	const roles = selection.roles.map((r) => roleBySlug(r)?.name ?? r);
	const profiles = selection.profiles.map((p) => profileBySlug(p)?.name ?? p);
	const subject = roles.length ? `${joinNames(roles, 'or')} scenario set` : 'scenario set';
	const scope = profiles.length ? ` for ${joinNames(profiles, 'or')}` : '';
	return {
		headline: `No ${subject}${scope} yet.`,
		coverage: selection.profiles.map((p) => coverageLine(p))
	};
}

/** "OB 3.0 Direct Delivery covers Issuers and Verifiers." */
export function coverageLine(profile: ProfileSlug): string {
	const name = profileBySlug(profile)?.name ?? profile;
	const roles = rolesOfProfile(profile).map((r) => roleBySlug(r)?.plural ?? r);
	return roles.length
		? `${name} covers ${joinNames(roles, 'and')}.`
		: `${name} has no scenario sets yet.`;
}

/**
 * The annotation on a Standard Profile card that has no scenario set for any
 * selected role — "No Wallet scenario set — covers Issuers and Verifiers".
 * `undefined` when no role is selected or the profile covers one of them:
 * mismatches are annotated, never hidden.
 */
export function profileMismatch(profile: ProfileSlug, roles: RoleSlug[]): string | undefined {
	if (roles.length === 0) return undefined;
	const covered = rolesOfProfile(profile);
	if (roles.some((r) => covered.includes(r))) return undefined;
	const missing = joinNames(
		roles.map((r) => roleBySlug(r)?.name ?? r),
		'or'
	);
	const covers = covered.map((r) => roleBySlug(r)?.plural ?? r);
	return covers.length
		? `No ${missing} scenario set — covers ${joinNames(covers, 'and')}`
		: `No ${missing} scenario set`;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[], conjunction: 'and' | 'or'): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
}
