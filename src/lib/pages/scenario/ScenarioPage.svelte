<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { DeliverableCredentialPanel } from '$lib/components/interop/deliverable-credential/index.js';
	import { ExchangeRunnerPanel } from '$lib/components/interop/exchange-runner/index.js';
	import { ScenarioStepCard } from '$lib/components/interop/scenario-step/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { profileHref } from '$lib/interop/checklist-href.js';
	import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
	import {
		baseProfileOf,
		type CannotServe,
		cannotServeMessage,
		type Scenario
	} from '$lib/interop/scenarios/index.js';

	import { transportFor } from './exchange-step.js';
	import PresentField from './PresentField.svelte';
	import ReceiveField from './ReceiveField.svelte';
	import { createScenarioRunController } from './scenario-run-controller.svelte.js';

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

	const profile = $derived(baseProfileOf(scenario.memberships));
	const activeStep = $derived(scenario.steps.find((s) => s.id === run.activeStepId));
	const activeIndex = $derived(run.runSteps.findIndex((s) => s.id === run.activeStepId));
	const deliverableLabel = $derived(activeStep ? run.labelFor(activeStep, activeIndex) : '');
	/**
	 * Per-transport copy for the receive field. One field, three pastes: the
	 * credential itself, a fresh single-use VC-API interaction URL, or a
	 * pre-authorized-code credential offer.
	 */
	const receiveCopy = $derived.by(() => {
		const transport =
			activeStep?.action?.kind === 'receive-from-issuer' ? activeStep.action.transport : 'direct';
		if (transport === 'vcalm') {
			return {
				prompt: 'Paste a fresh interaction URL from your issuer',
				placeholder: 'https://your-issuer.example/exchanges/…'
			};
		}
		if (transport === 'oid4vci') {
			return {
				prompt: 'Paste an openid-credential-offer:// URL from your issuer',
				placeholder: 'openid-credential-offer://?credential_offer_uri=…'
			};
		}
		return {
			prompt: 'Paste the credential your issuer produced',
			placeholder: '{ "@context": […], "type": ["VerifiableCredential", "OpenBadgeCredential"], … }'
		};
	});
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

{#snippet header(status: string, statusClass: string)}
	<header class="space-y-3">
		{#if profile}
			<nav class="text-label-md text-muted-foreground">
				<a href={profileHref(profile)} class="text-primary hover:underline">{profile}</a>
			</nav>
		{/if}
		<div class="flex flex-wrap items-start justify-between gap-3">
			<!-- `text-display-lg` alone took four lines and half the viewport at 375px. -->
			<h1 class="text-headline-md sm:text-display-lg">{scenario.name}</h1>
			<span
				class={`shrink-0 rounded-full border px-2 py-1 text-label-md font-medium ${statusClass}`}
			>
				{status}
			</span>
		</div>
		<p class="max-w-prose text-body-md text-muted-foreground">{scenario.blurb}</p>
	</header>
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
			<p class="text-body-md text-muted-foreground">
				Presented to your verifier. Report what it decided below.
			</p>
		{:else}
			<PresentField
				busy={run.presentBusy}
				note={run.presentNote}
				retry={run.presentRetry}
				canReuse={run.presentCanReuse}
				lastRequest={run.presentLastRequest}
				prompt={activeStep.action.transport === 'oid4vp'
					? 'Paste a presentation request from your verifier'
					: 'Paste a fresh interaction URL from your verifier'}
				placeholder={activeStep.action.transport === 'oid4vp'
					? 'openid4vp://… (or a request_uri URL or the request JSON)'
					: 'https://your-verifier.example/interactions/…'}
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
			<p class="text-body-md text-muted-foreground">
				Received the credential from your issuer. Report what it offered below.
			</p>
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
