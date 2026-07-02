import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { SampleResultType } from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

export type IssuerRunnerStatus = 'idle' | 'running' | 'done' | 'error';

export type IssuerRunnerPanelData = {
	credentialText: string;
	/** Additive profile slugs currently toggled on. */
	selectedAdditives: AdditiveProfileSlug[];
	status: IssuerRunnerStatus;
	report?: IssuerRunnerReport;
};

export type IssuerRunnerPanelActions = {
	onCredentialChange: (next: string) => void;
	onToggleAdditive: (slug: AdditiveProfileSlug, next: boolean) => void;
	onLoadSample: (resultType: SampleResultType) => void;
	onVerify: () => void | Promise<void>;
};
