<!--
	Temporary UX exploration. Delete after production implementation.

	The chosen direction: collapsing spine + verdict-strip reveal + `can't tell`
	in the warning family. Three views — mid-run, finished, and the blocked
	state — because those are the three an operator actually lands on.
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { show }: { show: 'midRun' | 'finished' | 'blocked' } = $props();

	type Verdict = 'correct' | 'wrong' | 'cant-tell';

	const OPTIONS = [
		{ value: 'accepted', label: 'Accepted it' },
		{ value: 'refused', label: 'Refused it' },
		{ value: 'warned', label: 'Accepted it, with a visible warning' }
	];
	const labelOf = (v: string) => OPTIONS.find((o) => o.value === v)?.label ?? '';

	/**
	 * `can't tell` gets the warning family, not red: it fails, and it must look
	 * like it failed, but it is the honest answer and must not be visually
	 * indistinguishable from getting it wrong. There is no `--warning-soft`
	 * token yet — `bg-warning/10` stands in. Worth adding one in production.
	 */
	const TONE: Record<Verdict, { dot: string; text: string; edge: string; soft: string }> = {
		correct: {
			dot: 'bg-result-pass',
			text: 'text-result-pass',
			edge: 'border-result-pass',
			soft: 'bg-result-pass-soft'
		},
		wrong: {
			dot: 'bg-result-fail',
			text: 'text-result-fail',
			edge: 'border-result-fail-border',
			soft: 'bg-result-fail-soft'
		},
		'cant-tell': {
			dot: 'bg-warning',
			text: 'text-warning',
			edge: 'border-warning/50',
			soft: 'bg-warning/10'
		}
	};

	const VERDICT_WORD: Record<Verdict, string> = {
		correct: 'Correct',
		wrong: 'Not what happened',
		'cant-tell': 'That’s a finding, not a mistake'
	};
</script>

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
			<p class="text-body-sm text-muted-foreground">From the wire — checked automatically.</p>
		</div>
	</div>
{/snippet}

{#snippet revealedRow(verdict: Verdict, chosen: string | undefined, correct: string, why: string)}
	{@const tone = TONE[verdict]}
	<div class="flex items-start gap-3">
		<span aria-hidden="true" class={`mt-1.5 size-3 shrink-0 rounded-full ${tone.dot}`}></span>
		<div class="min-w-0 flex-1 space-y-1">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<Badge variant="requirement" class="bg-requirement text-requirement-foreground">MUST</Badge>
				<span
					class="order-last w-full text-body-md text-foreground sm:order-none sm:w-auto sm:min-w-0 sm:flex-1"
				>
					What did your wallet do with this credential?
				</span>
				<span
					class="text-label-sm ml-auto shrink-0 rounded-full border border-live-border bg-live-soft px-1.5 py-0.5 font-medium text-live uppercase sm:ml-0"
				>
					Attested
				</span>
			</div>
			<div class={`space-y-1 rounded-sm border-l-2 ${tone.edge} ${tone.soft} px-3 py-2`}>
				<p class={`text-label-md font-medium uppercase ${tone.text}`}>{VERDICT_WORD[verdict]}</p>
				<p class="text-body-sm text-foreground">
					{#if chosen}
						You answered <em>{labelOf(chosen)}</em>.
					{/if}
					{why}
				</p>
				{#if verdict !== 'correct'}
					<p class="text-body-sm text-muted-foreground">
						What actually happened: <span class="text-foreground">{labelOf(correct)}</span>
					</p>
				{/if}
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
					<Button type="button" variant="outline" class="h-auto justify-start py-2 text-left">
						{option.label}
					</Button>
				{/each}
				<Button
					type="button"
					variant="outline"
					class="h-auto justify-start border-dashed py-2 text-left text-muted-foreground"
				>
					I couldn’t tell
				</Button>
			</div>
			<p class="text-body-sm text-muted-foreground">
				“I couldn’t tell” counts against you — and it is a finding worth recording, not a mistake.
			</p>
		</div>
	</div>
{/snippet}

<!--
	QR above the link, never beside it. The beside-layout measured 261px inside a
	243px box at 375px and squeezed the Copy/Open pair; this is the production
	fix for `InteractionQrCard`.
-->
{#snippet liveQr()}
	<div class="space-y-3 rounded-md border border-live-border bg-live-soft p-4">
		<p class="text-label-md font-medium text-live uppercase">Live · OID4VCI offer</p>
		<div
			class="grid size-32 place-items-center rounded-sm bg-foreground/90 text-label-md text-background"
		>
			QR
		</div>
		<p class="text-body-sm text-foreground">
			Scan with the wallet under test, or open the link on this device.
		</p>
		<p class="text-label-md font-mono break-all text-muted-foreground">
			openid-credential-offer://?credential_offer_uri=…
		</p>
		<div class="flex flex-wrap gap-2">
			<Button type="button" variant="outline" size="sm">Copy</Button>
			<Button type="button" variant="outline" size="sm">Open</Button>
		</div>
	</div>
{/snippet}

{#snippet settledStep(
	n: number,
	label: string,
	verdict: Verdict,
	summary: string,
	setup: string,
	chosen: string | undefined,
	correct: string,
	why: string,
	open: boolean
)}
	{@const tone = TONE[verdict]}
	<li class="rounded-md border border-border bg-card">
		<details class="group" {open}>
			<summary class="flex cursor-pointer flex-wrap items-center gap-2 p-3 hover:bg-muted/40">
				<span aria-hidden="true" class={`size-3 shrink-0 rounded-full ${tone.dot}`}></span>
				<span class="text-label-md font-mono text-muted-foreground">{n}.</span>
				<span class="text-body-md text-foreground">{label}</span>
				<span class={`ml-auto text-label-md uppercase ${tone.text}`}>{summary}</span>
				<span
					aria-hidden="true"
					class="text-muted-foreground transition-transform group-open:rotate-90"
				>
					›
				</span>
			</summary>
			<div class="space-y-4 border-t border-border p-4">
				{@render setupCallout(setup)}
				{@render autoRow(true, 'Something on the other end picked the offer up.')}
				{@render revealedRow(verdict, chosen, correct, why)}
			</div>
		</details>
	</li>
{/snippet}

{#snippet liveStep(n: number, label: string, setup: string)}
	<li class="rounded-md border border-live-border bg-card">
		<div class="space-y-4 p-4">
			<header class="flex flex-wrap items-center gap-2">
				<span aria-hidden="true" class="size-3 shrink-0 animate-pulse rounded-full bg-live"></span>
				<span class="text-label-md font-mono text-muted-foreground">{n}.</span>
				<h2 class="text-headline-md text-foreground">{label}</h2>
				<span class="ml-auto text-label-md text-live uppercase">In flight</span>
			</header>
			{@render setupCallout(setup)}
			{@render liveQr()}
			{@render autoRow(true, 'Something on the other end picked the offer up.')}
			{@render askRow()}
		</div>
	</li>
{/snippet}

{#snippet pendingStep(n: number, label: string)}
	<li class="rounded-md border border-border bg-card">
		<div class="flex flex-wrap items-center gap-2 p-3 opacity-60">
			<span aria-hidden="true" class="size-3 shrink-0 rounded-full bg-border"></span>
			<span class="text-label-md font-mono text-muted-foreground">{n}.</span>
			<span class="text-body-md text-muted-foreground">{label}</span>
			<span class="ml-auto text-label-md text-muted-foreground uppercase">Waiting</span>
		</div>
	</li>
{/snippet}

{#snippet head(status: string, statusClass: string)}
	<header class="space-y-3">
		<nav class="text-label-md text-muted-foreground">
			<a href="#/" class="text-primary hover:underline">OID4 Profile</a> · Wallet · Credential Acceptance
		</nav>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<h1 class="text-headline-md sm:text-display-lg">Tell a good credential from a bad one</h1>
			<span
				class={`shrink-0 rounded-full border px-2 py-1 text-label-md font-medium uppercase ${statusClass}`}
			>
				{status}
			</span>
		</div>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Three credentials, one after another, in a random order. Some are fine and some are not. After
			each one we ask what your wallet did — then tell you what actually happened.
		</p>
	</header>
{/snippet}

{#if show === 'midRun'}
	<div class="space-y-6">
		{@render head('In progress · 1 of 3', 'border-live-border bg-live-soft text-live')}
		<ol class="space-y-3">
			{@render settledStep(
				1,
				'Credential 1',
				'correct',
				'Correct · 2 of 2',
				'We will offer your wallet an Open Badges credential. Everything about this one is well-formed.',
				'accepted',
				'accepted',
				'Your wallet accepted it, and you saw that it did.',
				false
			)}
			{@render liveStep(
				2,
				'Credential 2',
				'We will offer your wallet an Open Badges credential whose validity period ended in 2024. Everything else about it is well-formed.'
			)}
			{@render pendingStep(3, 'Credential 3')}
		</ol>
		<div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
			<p class="text-body-sm text-muted-foreground">
				2 of 6 requirements answered · nothing is recorded until you finish
			</p>
			<Button type="button" variant="outline">Start over</Button>
		</div>
	</div>
{:else if show === 'finished'}
	<div class="space-y-6">
		{@render head(
			'Failed · 4 of 6',
			'border-result-fail-border bg-result-fail-soft text-result-fail'
		)}
		<ol class="space-y-3">
			{@render settledStep(
				1,
				'Credential 1',
				'correct',
				'Correct · 2 of 2',
				'We will offer your wallet an Open Badges credential. Everything about this one is well-formed.',
				'accepted',
				'accepted',
				'Your wallet accepted it, and you saw that it did.',
				false
			)}
			{@render settledStep(
				2,
				'Credential 2',
				'wrong',
				'Missed · 1 of 2',
				'We offered your wallet an Open Badges credential whose validity period ended in 2024. Everything else about it was well-formed.',
				'accepted',
				'refused',
				'Your wallet refused it — it just didn’t tell you clearly enough for you to know.',
				true
			)}
			{@render settledStep(
				3,
				'Credential 3',
				'cant-tell',
				'Couldn’t tell · 1 of 2',
				'We offered your wallet an Open Badges credential whose proof had been corrupted after signing.',
				undefined,
				'refused',
				'Your wallet refused it. It gave you nothing to judge by, which is exactly the failure this scenario measures.',
				false
			)}
		</ol>
		<div class="space-y-3 rounded-md border border-border bg-card p-4">
			<p class="text-body-md text-foreground">
				Your wallet behaved correctly all three times. It told you so once.
			</p>
			<p class="text-body-sm text-muted-foreground">
				Every credential was handled the way it should have been — but on two of the three you could
				not tell that from the wallet alone. That gap is what this scenario measures.
			</p>
			<div class="flex flex-wrap gap-2">
				<Button type="button">Run it again</Button>
				<Button type="button" variant="outline">Back to OID4 Profile</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="space-y-6">
		{@render head('Unavailable here', 'border-border bg-muted/40 text-muted-foreground')}
		<div class="space-y-3 rounded-md border border-border bg-muted/30 p-5">
			<p class="text-label-md font-medium text-muted-foreground uppercase">
				This deployment cannot run this scenario
			</p>
			<p class="text-body-md text-foreground">
				It asks for a credential signed with <code class="font-mono">bbs-2023</code>. This
				deployment issues with <code class="font-mono">eddsa-rdfc-2022</code> only.
			</p>
			<p class="text-body-sm text-muted-foreground">
				Its 2 requirements still count toward the OID4 Wallet badge, so the badge stays blocked
				rather than becoming easier to earn. Point the suite at a deployment that serves this
				cryptosuite to run it.
			</p>
			<Button type="button" variant="outline" disabled>Start the run</Button>
		</div>
	</div>
{/if}
