<script lang="ts">
	import { onMount } from 'svelte';

	import { recordRun } from '$lib/client/run-history/index.js';
	import { selectionStore } from '$lib/client/selection/index.js';
	import { AdditiveChecklistSection } from '$lib/components/interop/additive-checklist-section/index.js';
	import { CredentialPasteForm } from '$lib/components/interop/issuer-runner/credential-paste-form/index.js';
	import {
		RequirementStatusRow,
		outcomeToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
	import {
		sampleCredentialsByResultType,
		type SampleResultType
	} from '$lib/interop/additive-profiles/open-skill-alignment/index.js';
	import {
		additiveChecklistsForCombination,
		combinationFor,
		issuerReportRunRecord,
		roleBySlug,
		workflowBySlug,
		type ChecklistRunState,
		type StepRunState
	} from '$lib/interop/index.js';
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
	const stepCount = combo.checklist.steps.length;
	const additives = additiveChecklistsForCombination(
		'ob3-direct-delivery',
		'issuer',
		'direct-credential-issuance'
	);

	let credentialText = $state<string>('');
	const selectedAdditives = $derived([...selectionStore.additiveProfiles]);
	let status = $state<RunStatus>('idle');
	let report = $state<IssuerRunnerReport | undefined>(undefined);

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

	function deriveStepStates(): StepRunState[] {
		return combo.checklist.steps.map((step) => {
			const outs = step.requirements
				.map((r) => (r.id ? outcomesById[r.id] : undefined))
				.filter((o): o is CheckOutcome => !!o);
			if (outs.some((o) => o.status === 'fail')) return 'failed';
			if (step.requirements.length > 0 && outs.length === step.requirements.length)
				return 'complete';
			if (outs.length > 0) return 'in-flight';
			return 'pending';
		});
	}

	const perStep = $derived<StepRunState[]>(
		status === 'done' || status === 'error'
			? deriveStepStates()
			: Array.from({ length: stepCount }, () => 'pending')
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
			const result = (await res.json()) as IssuerRunnerReport;
			report = result;
			status = res.ok ? 'done' : 'error';
			// Record this completed verification (passed iff verified and no fatalError).
			recordRun(
				issuerReportRunRecord({
					role: 'issuer',
					workflow: 'direct-credential-issuance',
					profile: 'ob3-direct-delivery',
					verified: result.verified,
					failingMustCount: failingMustCount(result),
					fatalError: result.fatalError
				})
			);
		} catch (e) {
			report = {
				verified: false,
				fatalError: { message: e instanceof Error ? e.message : String(e) },
				groups: []
			};
			status = 'error';
		}
	}

	function loadSample(resultType: SampleResultType) {
		credentialText = JSON.stringify(sampleCredentialsByResultType[resultType], null, 2);
		report = undefined;
		status = 'idle';
	}

	function onCredentialChange(next: string) {
		credentialText = next;
		// Don't auto-clear the report — let the user keep the prior result visible
		// until they re-Verify.
	}

	function onToggleAdditive(slug: AdditiveProfileSlug) {
		selectionStore.toggleAdditiveProfile(slug);
	}

	function reset() {
		credentialText = '';
		report = undefined;
		status = 'idle';
	}
</script>

<RunnableChecklist
	checklist={combo.checklist}
	profile={combo.profile}
	{workflow}
	{role}
	{runState}
	{perStep}
>
	{#snippet rightColumn()}
		<div class="space-y-4 rounded-md border border-live-border bg-live-soft p-5">
			<p class="text-label-md text-live">Built-in verifier</p>
			<h3 class="text-headline-md text-foreground">Verify a credential against the profile</h3>
			<p class="text-body-md text-foreground">
				Paste an OpenBadgeCredential JSON (or load a sample) and the suite runs
				<code>@digitalcredentials/verifier-core</code>
				plus structural conformance checks, lighting up each requirement on the left.
			</p>

			<CredentialPasteForm
				value={credentialText}
				{selectedAdditives}
				{status}
				onChange={onCredentialChange}
				{onToggleAdditive}
				onLoadSample={loadSample}
				onVerify={() => void verify()}
			/>

			{#if credentialText || report}
				<button
					type="button"
					class="text-label-md text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					onclick={reset}
				>
					Reset
				</button>
			{/if}

			{#if report}
				{#if report.fatalError}
					<div class="rounded-md border border-destructive bg-destructive/10 p-3">
						<p class="text-label-md text-destructive uppercase">Verification could not complete</p>
						<p class="mt-1 text-body-md text-foreground">{report.fatalError.message}</p>
						{#if report.fatalError.hint}
							<p class="mt-1 text-label-md text-muted-foreground">{report.fatalError.hint}</p>
						{/if}
					</div>
				{:else if report.verified}
					<div class="rounded-md border border-success-border bg-success-soft p-3">
						<p class="text-label-md text-success uppercase">Verified</p>
						<p class="mt-1 text-body-md text-foreground">No MUST requirements failed.</p>
					</div>
				{:else}
					<div class="rounded-md border border-destructive bg-destructive/10 p-3">
						<p class="text-label-md text-destructive uppercase">Not verified</p>
						<p class="mt-1 text-body-md text-foreground">
							{failingMustCount(report)} MUST requirement{failingMustCount(report) === 1 ? '' : 's'} failed.
						</p>
					</div>
				{/if}
			{/if}
		</div>
	{/snippet}

	{#snippet requirementState({ requirement })}
		<RequirementStatusRow
			{requirement}
			status={outcomeToRequirementStatus(requirement.id ? outcomesById[requirement.id] : undefined)}
		/>
	{/snippet}
</RunnableChecklist>

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
