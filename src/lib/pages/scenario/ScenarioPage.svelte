<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { perspectiveStore } from '$lib/client/perspective/index.js';
	import { DeliverableCredentialPanel } from '$lib/components/interop/deliverable-credential/index.js';
	import { ExchangeRunnerPanel } from '$lib/components/interop/exchange-runner/index.js';
	import { InlineMarkup } from '$lib/components/interop/inline-markup/index.js';
	import { ScenarioStepCard } from '$lib/components/interop/scenario-step/index.js';
	import { PageHero } from '$lib/components/page-hero/index.js';
	import { ContextChip } from '$lib/components/perspective/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { additiveProfileBySlug, profileBySlug, roleBySlug } from '$lib/interop/accessors.js';
	import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
	import { additiveProfileHref, profileHref, roleHref } from '$lib/interop/route-hrefs.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
	import {
		baseProfileOf,
		baseProfilesOf,
		type CannotServe,
		isBaseProfile,
		cannotServeMessage,
		type Scenario
	} from '$lib/interop/scenarios/index.js';

	import { transportFor } from './exchange-step.js';
	import { PRESENT_COPY, PRESENT_SETTLED_NOTE } from './present-step.js';
	import PresentField from './PresentField.svelte';
	import { RECEIVE_COPY, RECEIVE_SETTLED_NOTE } from './receive-step.js';
	import ReceiveField from './ReceiveField.svelte';
	import { createScenarioRunController } from './scenario-run-controller.svelte.js';

	import { resolve } from '$app/paths';

	/**
	 * The one generic scenario runner. Turns a `Scenario` into a run: drives the
	 * M3 engine, polls exchanges, collects answers, and records once.
	 *
	 * **It decides nothing about scoring.** Every verdict, roll-up and outcome
	 * comes from the engine — {@link createScenarioRunController} sequences
	 * steps and this component only renders what comes back.
	 *
	 * Parameterised, never location-aware: the route reads the URL and passes
	 * props, so Storybook drives the same component.
	 *
	 * Each step card is handed `run.evidenceOf(step.id)` for its Details panel.
	 * A **stored** run resolves to `undefined` there and shows no panel: evidence
	 * is live-only and never persisted, so there is nothing to render rather than
	 * something missing.
	 */
	let {
		scenario,
		storedRun,
		attachExchangeId,
		blocked
	}: {
		scenario: Scenario;
		storedRun?: ScenarioRunRecord;
		attachExchangeId?: string;
		blocked?: CannotServe;
	} = $props();

	const run = createScenarioRunController(
		() => scenario,
		() => attachExchangeId
	);

	/** The prop wins when given, so Storybook can drive read-only state without a browser store. */
	const stored = $derived(storedRun ?? run.discovered);
	const showingStored = $derived(!!stored && !run.hasActiveRun);
	/**
	 * Attested reveals hold until the run has nothing left to answer, then show
	 * together — a mid-run reveal primes the operator across the remaining
	 * shuffled passes. A stored, read-only run reveals from the start. Automatic
	 * outcomes are unaffected (the row resolves them immediately either way).
	 */
	const revealed = $derived(showingStored || run.unanswered.length === 0);

	onMount(() => {
		if (blocked || storedRun) return;
		// A stored result re-renders read-only, reveals included, plus a retry —
		// rather than silently starting a second run over the top of it.
		if (run.discoverStoredRun()) return;
		run.begin();
	});

	onDestroy(() => run.destroy());

	const perspective = perspectiveStore();

	const profile = $derived(baseProfileOf(scenario.memberships));
	const role = $derived(roleBySlug(scenario.role));
	/** The hero's context chips: the Standard Profiles it runs over, then every Add-on it counts toward. */
	const profileChips = $derived(
		baseProfilesOf(scenario.memberships).map((slug) => ({
			slug,
			name: profileBySlug(slug)?.name ?? slug
		}))
	);
	const addOnChips = $derived(
		scenario.memberships
			.filter((m) => !isBaseProfile(m.profile))
			.map((m) => m.profile as AdditiveProfileSlug)
			.filter((slug, i, all) => all.indexOf(slug) === i)
			.map((slug) => ({ slug, name: additiveProfileBySlug(slug)?.name ?? slug }))
	);
	const activeStep = $derived(scenario.steps.find((s) => s.id === run.activeStepId));
	const activeIndex = $derived(run.runSteps.findIndex((s) => s.id === run.activeStepId));
	const deliverableLabel = $derived(activeStep ? run.labelFor(activeStep, activeIndex) : '');
	/** Per-transport copy for the receive field — see {@link RECEIVE_COPY}. */
	const receiveCopy = $derived(
		RECEIVE_COPY[
			activeStep?.action?.kind === 'receive-from-issuer' ? activeStep.action.transport : 'direct'
		]
	);
	const panelData = $derived({
		intent: (activeStep?.action?.kind === 'request-presentation' ? 'verification' : 'issuance') as
			| 'issuance'
			| 'verification',
		protocol: activeStep ? transportFor(scenario, activeStep).protocol : ('vcalm' as const),
		run: 'awaiting-wallet' as const,
		perStep: ['in-flight' as const],
		interactionUrl: run.link?.interactionUrl,
		exchangeId: run.link?.exchangeId
	});
</script>

{#snippet header(statusLabel: string, statusClass: string)}
	<PageHero perspective={perspective.current} onPerspectiveChange={(p) => perspective.choose(p)}>
		{#snippet breadcrumb()}
			<a href={resolve('/')} class="text-primary hover:underline">Home</a>
			{#if profile}
				<span aria-hidden="true">›</span>
				<a href={profileHref(profile)} class="text-primary hover:underline">
					{profileBySlug(profile)?.name ?? profile}
				</a>
			{/if}
		{/snippet}
		{#snippet eyebrow()}Scenario{/snippet}
		{#snippet title()}{scenario.name}{/snippet}
		{#snippet status()}
			<span
				class={`shrink-0 rounded-full border px-2 py-1 text-label-md font-medium ${statusClass}`}
			>
				{statusLabel}
			</span>
		{/snippet}
		{#snippet lede()}<InlineMarkup text={scenario.blurb} />{/snippet}
		{#snippet chips()}
			{#if role}
				<ContextChip kind="role" label={role.name} href={roleHref(role.slug)} />
			{/if}
			{#each profileChips as chip (chip.slug)}
				<ContextChip kind="profile" label={chip.name} href={profileHref(chip.slug)} />
			{/each}
			{#each addOnChips as chip (chip.slug)}
				<ContextChip kind="addon" label={chip.name} href={additiveProfileHref(chip.slug)} />
			{/each}
		{/snippet}
	</PageHero>
{/snippet}

{#snippet actionPanel()}
	<!--
		The action slot of the live step. A `deliver-direct` step renders the signed
		credential to download and hand over; the exchange kinds render the runner
		panel — repositioned, not redesigned, and passed no actions so nothing can
		mint out of band. "Start over" is the only route to another exchange.
	-->
	{#if activeStep?.action?.kind === 'deliver-direct'}
		{#if run.deliverable !== undefined}
			<DeliverableCredentialPanel credential={run.deliverable} label={deliverableLabel} />
		{:else}
			<p class="text-body-md text-muted-foreground">Preparing the credential…</p>
		{/if}
	{:else if activeStep?.action?.kind === 'present-to-verifier'}
		<!--
			The operator pastes their verifier's fresh interaction URL; the suite
			presents the step's credential to it. Once submitted the step settles, so
			the field gives way to a confirmation and the questions (if any) take over.
		-->
		{#if run.engineStateOf(activeStep.id) === 'settled'}
			<p class="text-body-md text-muted-foreground">{PRESENT_SETTLED_NOTE}</p>
		{:else}
			<PresentField
				busy={run.presentBusy}
				note={run.presentNote}
				retry={run.presentRetry}
				canReuse={run.presentCanReuse}
				lastRequest={run.presentLastRequest}
				prompt={PRESENT_COPY[activeStep.action.transport].prompt}
				placeholder={PRESENT_COPY[activeStep.action.transport].placeholder}
				onPresent={(request) => run.present(request)}
			/>
		{/if}
	{:else if activeStep?.action?.kind === 'receive-from-issuer'}
		<!--
			The inverse of the present field: the operator's issuer produces the
			credential and they hand the suite whatever leads to it. Once a credential
			arrives the step settles, so the field gives way to a confirmation and the
			questions (if any) take over.
		-->
		{#if run.engineStateOf(activeStep.id) === 'settled'}
			<p class="text-body-md text-muted-foreground">{RECEIVE_SETTLED_NOTE}</p>
		{:else}
			<ReceiveField
				busy={run.receiveBusy}
				note={run.receiveNote}
				retry={run.receiveRetry}
				prompt={receiveCopy.prompt}
				placeholder={receiveCopy.placeholder}
				onReceive={(input) => run.receive(input)}
			/>
		{/if}
	{:else if run.link}
		<ExchangeRunnerPanel data={panelData} actions={{}} />
	{:else}
		<p class="text-body-md text-muted-foreground">Creating the exchange…</p>
	{/if}
{/snippet}

{#snippet spine()}
	<ol class="space-y-3">
		{#each run.runSteps as step, index (step.id)}
			<ScenarioStepCard
				index={index + 1}
				label={run.labelFor(step, index)}
				state={showingStored
					? 'settled'
					: step.id === run.activeStepId
						? 'in-flight'
						: run.engineStateOf(step.id)}
				setup={step.summary}
				requirements={step.requirements}
				outcomes={run.outcomes}
				{revealed}
				onAnswer={run.answerableNow(step.id) ? run.answer : undefined}
				action={!showingStored && step.id === run.activeStepId && step.action
					? actionPanel
					: undefined}
				error={run.engineStateOf(step.id) === 'errored' ? run.stepError?.message : undefined}
				evidence={run.evidenceOf(step.id)}
			/>
		{/each}
	</ol>
{/snippet}

{#if blocked}
	<div class="space-y-6">
		{@render header('Unavailable here', 'border-border bg-muted/40 text-muted-foreground')}
		<div class="space-y-3 rounded-md border border-border bg-muted/30 p-5">
			<p class="text-label-md font-medium text-muted-foreground">
				This deployment cannot run this scenario
			</p>
			<p class="text-body-md text-foreground">{cannotServeMessage(blocked)}</p>
			<p class="text-body-md text-muted-foreground">
				Its requirements still count toward the badge, so the badge stays blocked rather than
				becoming easier to earn. Point the suite at a deployment that serves this pair to run it.
			</p>
		</div>
	</div>
{:else if showingStored && stored}
	<div class="space-y-6">
		{@render header(
			stored.status === 'passed' ? 'Passed' : 'Failed',
			stored.status === 'passed'
				? 'border-result-pass-border bg-result-pass-soft text-result-pass'
				: 'border-result-fail-border bg-result-fail-soft text-result-fail'
		)}
		{@render spine()}
		<div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
			<p class="text-body-md text-muted-foreground">
				Recorded {stored.ranAt} · attempt {stored.attempts}
			</p>
			<Button type="button" onclick={run.begin}>Run it again</Button>
		</div>
	</div>
{:else}
	<div class="space-y-6">
		{@render header('In progress', 'border-live-border bg-live-soft text-live')}
		{#if attachExchangeId !== undefined && !run.attachable}
			<p class="rounded-md border border-border bg-muted/30 p-4 text-body-md text-muted-foreground">
				Attach mode is not available for a scenario with more than one action step — step 1 is
				chosen by the shuffle, so adopting into it would be both meaningless and a leak of which
				pass you are on. The normal run is below.
			</p>
		{/if}
		{@render spine()}
		<div class="space-y-3 border-t border-border pt-4">
			{#if run.errored}
				<!--
					An errored step leaves its automatic requirements unresolved by design
					— D2 — so this run can never be completed, and can never be recorded.
					Offering anything but "Start over" would imply a path that does not exist.
				-->
				<p class="text-body-md text-foreground">
					The harness failed on one of the steps, so this run cannot be recorded. Start over to try
					again.
				</p>
				{#if run.stepError?.hint}
					<p class="text-body-md text-muted-foreground">{run.stepError.hint}</p>
				{/if}
				<Button type="button" variant="outline" onclick={run.begin}>Start over</Button>
			{:else if run.recorded}
				<p class="text-body-md text-foreground">Recorded. You can run it again any time.</p>
				<Button type="button" onclick={run.begin}>Run it again</Button>
			{:else}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<!--
						Disabled with a count, never hidden: a hidden button reads as a
						missing feature, a disabled one with a reason teaches.
					-->
					<p class="text-body-md text-muted-foreground">
						{run.unanswered.length === 0
							? 'Every requirement answered.'
							: `${run.unanswered.length} requirement${run.unanswered.length === 1 ? '' : 's'} still to answer`}
						· nothing is recorded until you finish
					</p>
					<div class="flex flex-wrap gap-2">
						<Button type="button" variant="outline" onclick={run.begin}>Start over</Button>
						<Button type="button" disabled={run.unanswered.length > 0} onclick={run.finish}>
							Finish
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
