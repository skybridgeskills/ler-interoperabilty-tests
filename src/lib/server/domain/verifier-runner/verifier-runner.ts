import type {
	PassAttestation,
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunDefinition,
	VerifierRunnerReport,
	VerifierRunPlan,
	VerifierRunPlanEntry
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import type { InspectOid4Result } from './oid4/inspect-request.js';
import type { PresentOid4Result } from './oid4/present-run.js';
import { scoreOid4Run } from './oid4/score-run-oid4.js';
import { scoreVerifierRun } from './score-run.js';
import type { PresentVcalmResult } from './vcalm/present-run.js';
import { scoreVcalmRun } from './vcalm/score-run-vcalm.js';

/** The injectable seam between Real and Fake runners: run generation. */
export type GenerateRunFn = (args: {
	cryptosuite: WalletCryptosuite;
}) => Promise<VerifierRunDefinition>;

/** The injectable seam for the oid4 request floor: real network + crypto, or canned. */
export type InspectOid4Fn = (args: {
	input: string;
	cryptosuite: WalletCryptosuite;
}) => Promise<InspectOid4Result>;

/** The injectable seam for oid4 plan generation: secure shuffle, or canned ordering. */
export type PlanOid4Fn = (args: { cryptosuite: WalletCryptosuite }) => VerifierRunPlan;

/** The injectable seam for the oid4 present flow: real crypto + `direct_post`, or canned. */
export type PresentOid4Fn = (args: {
	entry: VerifierRunPlanEntry;
	input: string;
	cryptosuite: WalletCryptosuite;
}) => Promise<PresentOid4Result>;

/** The injectable seam for vcalm plan generation: secure shuffle, or canned ordering. */
export type PlanVcalmFn = (args: { cryptosuite: WalletCryptosuite }) => VerifierRunPlan;

/** The injectable seam for the vcalm present flow: real crypto + VC-API exchange, or canned. */
export type PresentVcalmFn = (args: {
	entry: VerifierRunPlanEntry;
	interactionUrl: string;
	cryptosuite: WalletCryptosuite;
}) => Promise<PresentVcalmResult>;

/**
 * The verifier-runner service wired to the verifier-runner API routes:
 * generates acceptance runs (crypto-backed or faked via `generate`),
 * inspects pasted OID4VP authorization requests (`inspectOid4`), plans and
 * presents oid4 acceptance credentials at present time (`planOid4`,
 * `presentOid4`), and scores attested runs. Scoring is pure and shared by
 * Real and Fake wirings, so route tests exercise the real scoring engine.
 */
export function VerifierRunner({
	generate,
	inspectOid4,
	planOid4,
	presentOid4,
	planVcalm,
	presentVcalm
}: {
	generate: GenerateRunFn;
	inspectOid4: InspectOid4Fn;
	planOid4: PlanOid4Fn;
	presentOid4: PresentOid4Fn;
	planVcalm: PlanVcalmFn;
	presentVcalm: PresentVcalmFn;
}) {
	return {
		/** Generate a fresh direct-delivery verifier run. */
		generateRun(args: { cryptosuite: WalletCryptosuite }): Promise<VerifierRunDefinition> {
			return generate(args);
		},

		/** Run the automated oid4 floor over one pasted authorization request. */
		inspectOid4Request(args: {
			input: string;
			cryptosuite: WalletCryptosuite;
		}): Promise<InspectOid4Result> {
			return inspectOid4(args);
		},

		/** Generate a credential-less oid4 verifier run plan (one entry per pass kind). */
		planOid4Run(args: { cryptosuite: WalletCryptosuite }): VerifierRunPlan {
			return planOid4(args);
		},

		/** Present one plan entry's credential to the operator's verifier via `direct_post`. */
		presentOid4Credential(args: {
			entry: VerifierRunPlanEntry;
			input: string;
			cryptosuite: WalletCryptosuite;
		}): Promise<PresentOid4Result> {
			return presentOid4(args);
		},

		/** Score an attested direct-delivery run (throws `VerifierRunMismatchError`). */
		scoreRun(args: {
			run: VerifierRunDefinition;
			attestations: PassAttestation[];
		}): VerifierRunnerReport {
			return scoreVerifierRun(args);
		},

		/** Score an attested oid4 run from plan + present evidence + floor outcomes. */
		scoreOid4Run(args: {
			plan: VerifierRunPlan;
			evidence: PresentEvidence[];
			attestations: PassAttestation[];
			floorOutcomes: VerifierCheckOutcome[];
		}): VerifierRunnerReport {
			return scoreOid4Run(args);
		},

		/** Generate a credential-less vcalm verifier run plan (one entry per pass kind). */
		planVcalmRun(args: { cryptosuite: WalletCryptosuite }): VerifierRunPlan {
			return planVcalm(args);
		},

		/** Present one plan entry's credential to the operator's verifier over a VC-API exchange. */
		presentVcalmCredential(args: {
			entry: VerifierRunPlanEntry;
			interactionUrl: string;
			cryptosuite: WalletCryptosuite;
		}): Promise<PresentVcalmResult> {
			return presentVcalm(args);
		},

		/** Score an attested vcalm run from plan + present evidence + floor outcomes. */
		scoreVcalmRun(args: {
			plan: VerifierRunPlan;
			evidence: PresentEvidence[];
			attestations: PassAttestation[];
			floorOutcomes: VerifierCheckOutcome[];
		}): VerifierRunnerReport {
			return scoreVcalmRun(args);
		}
	};
}
export type VerifierRunner = ReturnType<typeof VerifierRunner>;
