import { additiveProfilesForBaseProfile, profileBySlug } from '$lib/interop/accessors.js';
import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { WorkflowChecklist } from '$lib/interop/profile-schema.js';

import { CheckRunner, type ChecklistInput } from './check-runner.js';
import type { IssuerRunnerReport } from './issuer-runner-report.js';
import type { VerifierCoreClient } from './verifier-core-client.js';

export type IssuerRunnerVerifyInput = {
	credential: unknown;
	/** Additive profiles selected for inclusion in the report. */
	additiveProfiles: AdditiveProfileSlug[];
};

const BASE_PROFILE_SLUG = 'ob3-direct-delivery';

/**
 * The user-facing orchestrator wired up to the verify endpoint. Runs
 * `verifier-core` on the pasted credential, then runs the check-runner
 * against the OB 3.0 Direct Delivery issuer checklist plus an additive
 * issuer checklist for each selected additive that declares an
 * issuer × direct-credential-issuance checklist, and returns a typed
 * `IssuerRunnerReport`.
 *
 * If `verifier-core` throws, the runner returns a report with
 * `fatalError` set and an empty `groups` array — the UI renders the
 * fatal banner only in that case.
 */
export function IssuerRunner({ verifierClient }: { verifierClient: VerifierCoreClient }) {
	const checkRunner = CheckRunner();

	async function verify(input: IssuerRunnerVerifyInput): Promise<IssuerRunnerReport> {
		let verifierResult: Awaited<ReturnType<VerifierCoreClient['verifyCredential']>>;
		try {
			verifierResult = await verifierClient.verifyCredential({ credential: input.credential });
		} catch (e) {
			return {
				verified: false,
				fatalError: {
					message:
						e instanceof Error
							? `verifier-core threw: ${e.message}`
							: 'verifier-core threw an unexpected error',
					hint: 'Inspect the credential JSON for structural issues and try again.'
				},
				groups: []
			};
		}

		const checklists = buildChecklistInputs(input.additiveProfiles);
		return checkRunner.run({
			credential: input.credential,
			verifierResult,
			// Legacy flag: true when ANY additive is selected. Open-skill checks
			// gate on it; newer additive checks ignore it (group-level inclusion).
			includeAdditive: input.additiveProfiles.length > 0,
			checklists
		});
	}

	return { verify };
}
export type IssuerRunner = ReturnType<typeof IssuerRunner>;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildChecklistInputs(selected: AdditiveProfileSlug[]): ChecklistInput[] {
	const base = profileBySlug(BASE_PROFILE_SLUG)!;
	const baseChecklist = findIssuerDirectIssuance(base.checklists);
	const inputs: ChecklistInput[] = [
		{
			groupRef: {
				kind: 'base',
				profileSlug: base.slug,
				profileName: base.name,
				workflow: 'direct-credential-issuance',
				role: 'issuer'
			},
			checklist: baseChecklist
		}
	];

	const selectedSet = new Set<AdditiveProfileSlug>(selected);
	for (const additive of additiveProfilesForBaseProfile(BASE_PROFILE_SLUG)) {
		if (!selectedSet.has(additive.slug)) continue;
		const additiveChecklist = additive.checklists.find(
			(c) => c.role === 'issuer' && c.workflow === 'direct-credential-issuance'
		);
		if (!additiveChecklist) continue;
		inputs.push({
			groupRef: {
				kind: 'additive',
				profileSlug: additive.slug,
				profileName: additive.name,
				workflow: 'direct-credential-issuance',
				role: 'issuer'
			},
			checklist: additiveChecklist
		});
	}

	return inputs;
}

function findIssuerDirectIssuance(checklists: WorkflowChecklist[]): WorkflowChecklist {
	const found = checklists.find(
		(c) => c.role === 'issuer' && c.workflow === 'direct-credential-issuance'
	);
	if (!found) {
		throw new Error(
			'No issuer × direct-credential-issuance checklist found on the requested profile.'
		);
	}
	return found;
}
