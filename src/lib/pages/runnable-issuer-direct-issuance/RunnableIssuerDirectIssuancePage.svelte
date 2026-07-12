<script lang="ts">
	import { onMount } from 'svelte';

	import { recordRun } from '$lib/client/run-history/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveChecklistSection } from '$lib/components/interop/additive-checklist-section/index.js';
	import { MobileWalletDrawer } from '$lib/components/interop/mobile-wallet-drawer/index.js';
	import {
		RequirementStatusRow,
		outcomeToRequirementStatus,
		statusesFromOutcomes
	} from '$lib/components/interop/requirement-status-row/index.js';
	import {
		RunResultCard,
		type RunResultOutcome
	} from '$lib/components/interop/run-result-card/index.js';
	import {
		RunnableChecklist,
		RunStateBadge
	} from '$lib/components/interop/runnable-checklist/index.js';
	import { DirectDeliveryWallet } from '$lib/components/interop/test-wallet/index.js';
	import {
		sampleCredentialsByResultType,
		type SampleResultType
	} from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
	import {
		additiveChecklistsForCombination,
		combinationFor,
		combinedRequirements,
		roleBySlug,
		runChecklistFingerprint,
		statusFromIssuerReport,
		testRunRecord,
		workflowBySlug,
		type ChecklistRunState
	} from '$lib/interop/index.js';
	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';
	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';
	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	/**
	 * Runnable issuer × direct-credential-issuance × OB3 Direct Delivery page. Unlike the vcalm/oid4
	 * pages this is a **paste-and-verify** single request (no live wallet): the user pastes a
	 * delivered credential into the orange right-column surface, one `POST /api/issuer-runner/verify`
	 * runs verifier-core + conformance checks, and each base requirement lights up inline on the left
	 * from the report's `base` group. Selected additives light up from the `additive` group(s).
	 */
	type RunStatus = 'idle' | 'running' | 'done' | 'error';

	/** Number of failed MUST outcomes across all groups (mirrors the retired grouped report). */
	function failingMustCount(r: IssuerRunnerReport): number {
		return r.groups
			.flatMap((g) => g.outcomes)
			.filter((o) => o.level === 'MUST' && o.status === 'fail').length;
	}

	const role = roleBySlug('issuer')!;
	const workflow = workflowBySlug('direct-credential-issuance')!;
	const combo = combinationFor('issuer', 'direct-credential-issuance', 'ob3-direct-delivery')!;
	const additives = additiveChecklistsForCombination(
		'ob3-direct-delivery',
		'issuer',
		'direct-credential-issuance'
	);
	// Combined requirement set (base + applicable additives) — the fingerprint and the
	// persisted `statuses` map are both keyed against these ids.
	const requirements = combinedRequirements(
		'issuer',
		'direct-credential-issuance',
		'ob3-direct-delivery'
	);
	const checklistFingerprint = runChecklistFingerprint(requirements);

	/** The verify endpoint spreads the report and adds the normalized wallet fields. */
	type VerifyResponse = IssuerRunnerReport & {
		walletActivity?: WalletActivity[];
		artifacts?: WalletArtifact[];
	};

	let credentialText = $state<string>('');
	const selectedAdditives = $derived([...selectionStore.additiveProfiles]);
	let status = $state<RunStatus>('idle');
	let report = $state<IssuerRunnerReport | undefined>(undefined);
	let activity = $state<WalletActivity[]>([]);
	let artifacts = $state<WalletArtifact[]>([]);

	/** Overall verdict for the right-column result card; `undefined` before a run completes. */
	const resultOutcome = $derived<RunResultOutcome | undefined>(
		report?.fatalError
			? 'error'
			: status === 'done'
				? report?.verified
					? 'verified'
					: 'not-verified'
				: status === 'error'
					? 'error'
					: undefined
	);

	onMount(() => {
		selectionStore.hydrate();
	});

	// Inline lighting: index each group's outcomes by requirement id.
	const baseGroup = $derived(report?.groups.find((g) => g.checklist.kind === 'base'));
	const outcomesById = $derived<Record<string, CheckOutcome>>(
		baseGroup ? Object.fromEntries(baseGroup.outcomes.map((o) => [o.id, o])) : {}
	);
	const additiveOutcomesById = $derived<Record<string, CheckOutcome>>(
		report
			? Object.fromEntries(
					report.groups
						.filter((g) => g.checklist.kind === 'additive')
						.flatMap((g) => g.outcomes)
						.map((o) => [o.id, o])
				)
			: {}
	);

	// Persisted, presentation-ready per-requirement statuses (keyed by requirement id).
	// The left column renders these live, and the run record persists this exact map.
	const statuses = $derived(
		statusesFromOutcomes(requirements, { ...outcomesById, ...additiveOutcomesById })
	);

	// Paste-and-verify is a single request, not a live wallet flow: never show the
	// "Live · in flight" wallet badge. Stay idle while running (the Verify button reads
	// "Verifying…"); then Run complete / Run failed.
	const runState = $derived<ChecklistRunState>(
		status === 'running'
			? 'idle'
			: report?.fatalError
				? 'error'
				: status === 'done'
					? report?.verified
						? 'complete'
						: 'error'
					: status === 'error'
						? 'error'
						: 'idle'
	);

	async function verify() {
		let parsed: unknown;
		try {
			parsed = JSON.parse(credentialText);
		} catch (e) {
			report = {
				verified: false,
				fatalError: {
					message: 'Pasted text is not valid JSON.',
					hint: e instanceof Error ? e.message : undefined
				},
				groups: []
			};
			activity = [];
			artifacts = [];
			status = 'done';
			return;
		}
		status = 'running';
		try {
			const res = await fetch('/api/issuer-runner/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ credential: parsed, additiveProfiles: selectedAdditives })
			});
			const result = (await res.json()) as VerifyResponse;
			report = result;
			activity = result.walletActivity ?? [];
			artifacts = result.artifacts ?? [];
			status = res.ok ? 'done' : 'error';
			// Record this completed verification (passed iff verified and no fatalError).
			recordRun(
				testRunRecord({
					role: 'issuer',
					workflow: 'direct-credential-issuance',
					profile: 'ob3-direct-delivery',
					status: statusFromIssuerReport({
						verified: result.verified,
						fatalError: result.fatalError
					}),
					checklistFingerprint,
					statuses,
					error: result.fatalError
				})
			);
		} catch (e) {
			report = {
				verified: false,
				fatalError: { message: e instanceof Error ? e.message : String(e) },
				groups: []
			};
			activity = [];
			artifacts = [];
			status = 'error';
		}
	}

	function loadSample(resultType: SampleResultType) {
		credentialText = JSON.stringify(sampleCredentialsByResultType[resultType], null, 2);
		report = undefined;
		activity = [];
		artifacts = [];
		status = 'idle';
	}

	function reset() {
		credentialText = '';
		report = undefined;
		activity = [];
		artifacts = [];
		status = 'idle';
	}
</script>

<RunnableChecklist checklist={combo.checklist} profile={combo.profile} {workflow} {role} {statuses}>
	{#snippet headerBadge()}
		<RunStateBadge {runState} />
	{/snippet}
	{#snippet rightColumn()}
		<MobileWalletDrawer ctaLabel={status === 'idle' ? 'Verify a credential' : undefined}>
			<RunResultCard
				outcome={resultOutcome}
				failingMustCount={report ? failingMustCount(report) : 0}
				message={report?.fatalError?.message}
				hint={report?.fatalError?.hint}
			/>
			<DirectDeliveryWallet
				bind:value={credentialText}
				state={status}
				busy={status === 'running'}
				{activity}
				{artifacts}
				onRun={() => void verify()}
				onReset={reset}
				onLoadSample={() => loadSample('RawScore')}
			/>
		</MobileWalletDrawer>
	{/snippet}

	{#snippet belowSteps()}
		{#if additives.length}
			<section class="space-y-6">
				{#each additives as { additive, checklist: additiveChecklist } (additive.slug)}
					<AdditiveChecklistSection
						{additive}
						checklist={additiveChecklist}
						baseProfileName={combo.profile.name}
						selected={selectionStore.isAdditiveProfileSelected(additive.slug)}
						onToggle={selectionStore.toggleAdditiveProfile}
					>
						{#snippet requirementState({ requirement })}
							<RequirementStatusRow
								{requirement}
								status={outcomeToRequirementStatus(
									requirement.id ? additiveOutcomesById[requirement.id] : undefined
								)}
							/>
						{/snippet}
					</AdditiveChecklistSection>
				{/each}
			</section>
		{/if}
	{/snippet}
</RunnableChecklist>
