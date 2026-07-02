import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

/** Outcome of a completed `POST /api/wallet-runner/present` run. */
export type PresentResult = {
	matched: boolean;
	vpToken?: unknown;
	presentationSubmission?: unknown;
	verify: { verified: boolean; errors?: string[] };
	submitted: boolean;
	submissionResult?: unknown;
	submissionError?: string;
	report: IssuerRunnerReport;
	failingMustCount: number;
};

/** Error affordance shown when the request can't be parsed or the runner fails. */
export type PresentError = { message: string; hint?: string };
