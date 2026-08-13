<!--
	Temporary UX exploration. Delete after production implementation.

	The step-as-spine page. Shown mid-run on a three-pass discrimination
	scenario — step 1 settled and answered, step 2 live with its QR, step 3
	pending — because that is the state that has to carry the whole
	choreography at once.
-->
<script lang="ts">
	let { show }: { show: 'openDesktop' | 'collapsingDesktop' | 'openPhone' | 'collapsingPhone' } =
		$props();
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	type StepState = 'settled' | 'live' | 'pending';

	const STEPS = [
		{
			id: 'pass-a',
			label: 'Credential 1',
			state: 'settled' as StepState,
			setup:
				'We will offer your wallet an Open Badges credential. Everything about this one is well-formed.',
			auto: { met: true, text: 'Something on the other end picked the offer up.' },
			answered: { chosen: 'accepted', correct: 'accepted' }
		},
		{
			id: 'pass-b',
			label: 'Credential 2',
			state: 'live' as StepState,
			setup:
				'We will offer your wallet an Open Badges credential whose validity period ended in 2024. Everything else about it is well-formed.',
			auto: undefined,
			answered: undefined
		},
		{
			id: 'pass-c',
			label: 'Credential 3',
			state: 'pending' as StepState,
			setup: undefined,
			auto: undefined,
			answered: undefined
		}
	];

	const OPTIONS = [
		{ value: 'accepted', label: 'Accepted it' },
		{ value: 'refused', label: 'Refused it' },
		{ value: 'warned', label: 'Accepted it, with a visible warning' }
	];
	const labelOf = (v: string) => OPTIONS.find((o) => o.value === v)?.label ?? '';
</script>

<!-- ─── pieces shared by both concepts ────────────────────────────────────── -->

{#snippet pageHead()}
	<header class="space-y-3">
		<nav class="text-label-md text-muted-foreground">
			<a href="#/" class="text-primary hover:underline">OID4 Profile</a> · Wallet · Credential Acceptance
		</nav>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<h1 class="text-display-lg">Tell a good credential from a bad one</h1>
			<span
				class="shrink-0 rounded-full border border-live-border bg-live-soft px-2 py-1 text-label-md font-medium text-live uppercase"
			>
				In progress · 1 of 3
			</span>
		</div>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Three credentials, one after another, in a random order. Some are fine and some are not. After
			each one we ask what your wallet did — and then tell you what actually happened.
		</p>
	</header>
{/snippet}

{#snippet setupCallout(text: string)}
	<div class="rounded-sm border-l-2 border-requirement-border bg-requirement-soft px-3 py-2">
		<p class="text-label-md font-medium text-requirement uppercase">What we are sending</p>
		<p class="text-body-sm mt-1 text-foreground">{text}</p>
	</div>
{/snippet}

{#snippet autoRow(met: boolean, text: string)}
	<div class="flex items-start gap-3">
		<span
			aria-hidden="true"
			class={`mt-1.5 size-3 shrink-0 rounded-full ${met ? 'bg-result-pass' : 'bg-result-fail'}`}
		></span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<Badge variant="requirement" class="bg-requirement text-requirement-foreground">MUST</Badge>
				<span class="min-w-0 flex-1 text-body-md text-foreground">{text}</span>
				<span
					class={`text-label-sm shrink-0 font-medium uppercase ${met ? 'text-result-pass' : 'text-result-fail'}`}
				>
					{met ? 'Pass' : 'Fail'}
				</span>
			</div>
			<p class="text-label-md text-muted-foreground">From the wire — checked automatically.</p>
		</div>
	</div>
{/snippet}

{#snippet answeredRow(chosen: string, correct: string)}
	{@const right = chosen === correct}
	<div class="flex items-start gap-3">
		<span
			aria-hidden="true"
			class={`mt-1.5 size-3 shrink-0 rounded-full ${right ? 'bg-result-pass' : 'bg-result-fail'}`}
		></span>
		<div class="min-w-0 flex-1 space-y-1">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<Badge variant="requirement" class="bg-requirement text-requirement-foreground">MUST</Badge>
				<span class="min-w-0 flex-1 text-body-md text-foreground">
					What did your wallet do with this credential?
				</span>
				<span
					class="text-label-sm shrink-0 rounded-full border border-live-border bg-live-soft px-1.5 py-0.5 font-medium text-live uppercase"
				>
					Attested
				</span>
			</div>
			<div
				class={`space-y-1 rounded-sm border-l-2 px-3 py-2 ${
					right
						? 'border-result-pass bg-result-pass-soft'
						: 'border-result-fail-border bg-result-fail-soft'
				}`}
			>
				<p
					class={`text-label-md font-medium uppercase ${right ? 'text-result-pass' : 'text-result-fail'}`}
				>
					{right ? 'Correct' : 'Not what happened'}
				</p>
				<p class="text-body-sm text-foreground">
					{#if right}
						Your wallet accepted it, and you saw that it did.
					{:else}
						You answered <em>{labelOf(chosen)}</em>. Your wallet {labelOf(correct).toLowerCase()}.
					{/if}
				</p>
			</div>
		</div>
	</div>
{/snippet}

{#snippet askRow()}
	<div class="flex items-start gap-3">
		<span aria-hidden="true" class="mt-1.5 size-3 shrink-0 rounded-full bg-muted-foreground/40"
		></span>
		<div class="min-w-0 flex-1 space-y-2">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<Badge variant="requirement" class="bg-requirement text-requirement-foreground">MUST</Badge>
				<span class="min-w-0 flex-1 text-body-md text-foreground">
					What did your wallet do with this credential?
				</span>
			</div>
			<div class="flex flex-col gap-2">
				{#each OPTIONS as option (option.value)}
					<Button type="button" variant="outline" class="justify-start text-left">
						{option.label}
					</Button>
				{/each}
				<Button type="button" variant="ghost" class="justify-start text-left text-muted-foreground">
					I couldn’t tell
				</Button>
			</div>
			<p class="text-label-md text-muted-foreground">
				“I couldn’t tell” counts as a failure — and it is a finding worth recording, not a mistake.
			</p>
		</div>
	</div>
{/snippet}

{#snippet liveQr()}
	<div class="space-y-3 rounded-md border border-live-border bg-live-soft p-4">
		<p class="text-label-md font-medium text-live uppercase">Live · OID4VCI offer</p>
		<div class="flex flex-wrap items-center gap-4">
			<div
				class="grid size-32 shrink-0 place-items-center rounded-sm bg-foreground/90 text-label-md text-background"
			>
				QR
			</div>
			<div class="min-w-0 flex-1 space-y-2">
				<p class="text-body-sm text-foreground">
					Scan with the wallet under test, or open the link on this device.
				</p>
				<p class="text-label-md font-mono break-all text-muted-foreground">
					openid-credential-offer://?credential_offer_uri=…
				</p>
				<div class="flex gap-2">
					<Button type="button" variant="outline" size="sm">Copy</Button>
					<Button type="button" variant="outline" size="sm">Open</Button>
				</div>
			</div>
		</div>
	</div>
{/snippet}

<!-- ─── concept 1 · open spine ────────────────────────────────────────────── -->

{#snippet openSpine()}
	<ol class="space-y-6">
		{#each STEPS as step, i (step.id)}
			<li
				class={`rounded-md border p-4 ${
					step.state === 'live'
						? 'border-live-border bg-card'
						: step.state === 'pending'
							? 'border-border bg-card/40'
							: 'border-border bg-card'
				}`}
			>
				<header class="flex flex-wrap items-baseline gap-2">
					<span class="text-headline-md font-mono text-primary">{i + 1}.</span>
					<h2 class="text-headline-md text-foreground">{step.label}</h2>
					<span class="ml-auto text-label-md text-muted-foreground uppercase">
						{step.state === 'settled'
							? 'Answered'
							: step.state === 'live'
								? 'In flight'
								: 'Waiting'}
					</span>
				</header>

				{#if step.state === 'pending'}
					<p class="text-body-sm mt-2 text-muted-foreground">
						Starts when you finish the credential above.
					</p>
				{:else}
					<div class="mt-3 space-y-4">
						{#if step.setup}{@render setupCallout(step.setup)}{/if}
						{#if step.state === 'live'}{@render liveQr()}{/if}
						<div class="space-y-4">
							{#if step.auto}{@render autoRow(step.auto.met, step.auto.text)}{/if}
							{#if step.answered}
								{@render answeredRow(step.answered.chosen, step.answered.correct)}
							{:else if step.state === 'live'}
								{@render autoRow(true, 'Something on the other end picked the offer up.')}
								{@render askRow()}
							{/if}
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

<!-- ─── concept 2 · collapsing spine ──────────────────────────────────────── -->

{#snippet collapsingSpine()}
	<ol class="space-y-3">
		{#each STEPS as step, i (step.id)}
			<li class="rounded-md border border-border bg-card">
				{#if step.state === 'settled'}
					<details class="group">
						<summary class="flex cursor-pointer flex-wrap items-center gap-2 p-3 hover:bg-muted/40">
							<span aria-hidden="true" class="size-3 shrink-0 rounded-full bg-result-pass"></span>
							<span class="text-label-md font-mono text-muted-foreground">{i + 1}.</span>
							<span class="text-body-md text-foreground">{step.label}</span>
							<span class="ml-auto text-label-md text-result-pass uppercase">
								Correct · 2 of 2
							</span>
							<span
								aria-hidden="true"
								class="text-muted-foreground transition-transform group-open:rotate-90"
							>
								›
							</span>
						</summary>
						<div class="space-y-4 border-t border-border p-4">
							{#if step.setup}{@render setupCallout(step.setup)}{/if}
							{#if step.auto}{@render autoRow(step.auto.met, step.auto.text)}{/if}
							{#if step.answered}
								{@render answeredRow(step.answered.chosen, step.answered.correct)}
							{/if}
						</div>
					</details>
				{:else if step.state === 'live'}
					<div class="space-y-4 p-4">
						<header class="flex flex-wrap items-center gap-2">
							<span aria-hidden="true" class="size-3 shrink-0 animate-pulse rounded-full bg-live"
							></span>
							<span class="text-label-md font-mono text-muted-foreground">{i + 1}.</span>
							<h2 class="text-headline-md text-foreground">{step.label}</h2>
							<span class="ml-auto text-label-md text-live uppercase">In flight</span>
						</header>
						{#if step.setup}{@render setupCallout(step.setup)}{/if}
						{@render liveQr()}
						{@render autoRow(true, 'Something on the other end picked the offer up.')}
						{@render askRow()}
					</div>
				{:else}
					<div class="flex flex-wrap items-center gap-2 p-3 opacity-60">
						<span aria-hidden="true" class="size-3 shrink-0 rounded-full bg-border"></span>
						<span class="text-label-md font-mono text-muted-foreground">{i + 1}.</span>
						<span class="text-body-md text-muted-foreground">{step.label}</span>
						<span class="ml-auto text-label-md text-muted-foreground uppercase">Waiting</span>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet footer()}
	<div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
		<p class="text-label-md text-muted-foreground">
			2 of 6 requirements answered · nothing is recorded until you finish
		</p>
		<Button type="button" variant="outline">Start over</Button>
	</div>
{/snippet}

{#snippet openDesktop()}
	<div class="min-h-screen bg-background p-8">
		<div class="mx-auto max-w-3xl space-y-8">
			{@render pageHead()}
			{@render openSpine()}
			{@render footer()}
		</div>
	</div>
{/snippet}

{#snippet collapsingDesktop()}
	<div class="min-h-screen bg-background p-8">
		<div class="mx-auto max-w-3xl space-y-8">
			{@render pageHead()}
			{@render collapsingSpine()}
			{@render footer()}
		</div>
	</div>
{/snippet}

{#snippet openPhone()}
	<div class="min-h-screen bg-background p-4" style="max-width: 375px;">
		<div class="space-y-6">
			{@render pageHead()}
			{@render openSpine()}
			{@render footer()}
		</div>
	</div>
{/snippet}

{#snippet collapsingPhone()}
	<div class="min-h-screen bg-background p-4" style="max-width: 375px;">
		<div class="space-y-6">
			{@render pageHead()}
			{@render collapsingSpine()}
			{@render footer()}
		</div>
	</div>
{/snippet}

{#if show === 'openDesktop'}{@render openDesktop()}
{:else if show === 'collapsingDesktop'}{@render collapsingDesktop()}
{:else if show === 'openPhone'}{@render openPhone()}
{:else if show === 'collapsingPhone'}{@render collapsingPhone()}
{/if}
