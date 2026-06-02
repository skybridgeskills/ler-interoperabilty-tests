import { additiveProfileBySlug, profileBySlug } from '$lib/interop/accessors.js';
import { openSkillAlignment } from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
import type { WorkflowChecklist } from '$lib/interop/profile-schema.js';

import { CheckRunner, type ChecklistInput } from './check-runner.js';
import type { IssuerRunnerReport } from './issuer-runner-report.js';
import type { VerifierCoreClient } from './verifier-core-client.js';

export type IssuerRunnerVerifyInput = {
	credential: unknown;
	includeAdditive: boolean;
};

/**
 * The user-facing orchestrator wired up to the verify endpoint. Runs
 * `verifier-core` on the pasted credential, then runs the check-runner
 * against the OB 3.0 Direct Delivery issuer checklist plus the
 * Open Skill Alignment additive issuer checklist when opted in, and
 * returns a typed `IssuerRunnerReport`.
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

		const checklists = buildChecklistInputs(input.includeAdditive);
		return checkRunner.run({
			credential: input.credential,
			verifierResult,
			includeAdditive: input.includeAdditive,
			checklists
		});
	}

	return { verify };
}
export type IssuerRunner = ReturnType<typeof IssuerRunner>;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildChecklistInputs(includeAdditive: boolean): ChecklistInput[] {
	const base = profileBySlug('ob3-direct-delivery')!;
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

	if (includeAdditive) {
		const additive = additiveProfileBySlug(openSkillAlignment.slug)!;
		const additiveChecklist = findIssuerDirectIssuance(additive.checklists);
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
