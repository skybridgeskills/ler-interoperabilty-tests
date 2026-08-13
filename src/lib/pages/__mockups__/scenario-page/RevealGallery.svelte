<!--
	Temporary UX exploration. Delete after production implementation.

	The per-requirement reveal: what an operator sees the instant they answer an
	attested requirement. Four concepts × three outcomes (correct / wrong /
	can't tell), because the wrong and can't-tell cases are the ones that carry
	the teaching and the ones most easily got wrong.
-->
<script lang="ts">
	let { show }: { show: 'gallery' | 'phone' } = $props();
	import { Badge } from '$lib/components/ui/badge/index.js';

	type Outcome = 'correct' | 'wrong' | 'cant-tell';

	const QUESTION = 'What did your wallet do with this credential?';
	const OPTIONS = [
		{ value: 'accepted', label: 'Accepted it' },
		{ value: 'refused', label: 'Refused it' },
		{ value: 'warned', label: 'Accepted it, with a visible warning' }
	];
	const CORRECT = 'refused';

	const CHOSEN: Record<Outcome, string | undefined> = {
		correct: 'refused',
		wrong: 'accepted',
		'cant-tell': undefined
	};

	const labelOf = (value?: string) => OPTIONS.find((o) => o.value === value)?.label ?? '';

	/** Tone classes per outcome. `cant-tell` fails, but is not styled as a mistake. */
	const TONE: Record<Outcome, { dot: string; text: string; edge: string; soft: string }> = {
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
			dot: 'bg-result-fail',
			text: 'text-result-fail',
			edge: 'border-result-fail-border',
			soft: 'bg-result-fail-soft'
		}
	};

	const OUTCOMES: Outcome[] = ['correct', 'wrong', 'cant-tell'];
	const OUTCOME_CAPTION: Record<Outcome, string> = {
		correct: 'Answered correctly',
		wrong: 'Answered wrongly — the teaching moment',
		'cant-tell': '“I couldn’t tell” — fails, but is a finding'
	};
</script>

<!-- ─── shared chrome ─────────────────────────────────────────────────────── -->

{#snippet questionHead()}
	<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
		<Badge variant="requirement" class="bg-requirement text-requirement-foreground">MUST</Badge>
		<span class="min-w-0 flex-1 text-body-md text-foreground">{QUESTION}</span>
	</div>
{/snippet}

{#snippet grid(concept: import('svelte').Snippet<[Outcome]>, name: string, note: string)}
	<section class="space-y-3">
		<header class="space-y-1">
			<h3 class="text-headline-md text-foreground">{name}</h3>
			<p class="text-body-sm max-w-prose text-muted-foreground">{note}</p>
		</header>
		<div class="grid gap-4 lg:grid-cols-3">
			{#each OUTCOMES as outcome (outcome)}
				<div class="space-y-2">
					<p class="text-label-md text-muted-foreground">{OUTCOME_CAPTION[outcome]}</p>
					<div class="rounded-md border border-border bg-card p-4">
						{@render concept(outcome)}
					</div>
				</div>
			{/each}
		</div>
	</section>
{/snippet}

<!-- ─── A · inline swap ───────────────────────────────────────────────────── -->

{#snippet conceptA(outcome: Outcome)}
	{@const tone = TONE[outcome]}
	<div class="flex items-start gap-3">
		<span aria-hidden="true" class={`mt-1.5 size-3 shrink-0 rounded-full ${tone.dot}`}></span>
		<div class="min-w-0 flex-1 space-y-1">
			{@render questionHead()}
			<p class="text-body-sm text-foreground">
				{#if outcome === 'cant-tell'}
					<span class="text-muted-foreground">You couldn’t tell.</span>
				{:else}
					<span class={tone.text}>{labelOf(CHOSEN[outcome])}</span>
				{/if}
				<span class="text-muted-foreground"> · correct answer: </span>
				<span class="text-foreground">{labelOf(CORRECT)}</span>
			</p>
		</div>
	</div>
{/snippet}

<!-- ─── B · verdict strip ─────────────────────────────────────────────────── -->

{#snippet conceptB(outcome: Outcome)}
	{@const tone = TONE[outcome]}
	<div class="space-y-2">
		{@render questionHead()}
		<div class={`space-y-1 rounded-sm border-l-2 ${tone.edge} ${tone.soft} px-3 py-2`}>
			<p class={`text-label-md font-medium uppercase ${tone.text}`}>
				{#if outcome === 'correct'}Correct{:else if outcome === 'wrong'}Not what happened{:else}
					That’s a finding, not a mistake
				{/if}
			</p>
			<p class="text-body-sm text-foreground">
				{#if outcome === 'correct'}
					Your wallet refused it, and you saw that it did.
				{:else if outcome === 'wrong'}
					You answered <em>{labelOf(CHOSEN.wrong)}</em>. Your wallet refused it — it just didn’t
					tell you clearly enough for you to know.
				{:else}
					Your wallet refused it. It gave you nothing to judge by, which is exactly the failure this
					scenario measures.
				{/if}
			</p>
		</div>
	</div>
{/snippet}

<!-- ─── C · two-line ledger ───────────────────────────────────────────────── -->

{#snippet conceptC(outcome: Outcome)}
	{@const tone = TONE[outcome]}
	<div class="space-y-2">
		{@render questionHead()}
		<dl class="text-body-sm space-y-1">
			<div class="flex gap-2">
				<dt class="w-24 shrink-0 text-label-md text-muted-foreground">You said</dt>
				<dd class={outcome === 'cant-tell' ? 'text-muted-foreground italic' : tone.text}>
					{outcome === 'cant-tell' ? 'I couldn’t tell' : labelOf(CHOSEN[outcome])}
				</dd>
			</div>
			<div class="flex gap-2">
				<dt class="w-24 shrink-0 text-label-md text-muted-foreground">Actually</dt>
				<dd class="text-foreground">{labelOf(CORRECT)}</dd>
			</div>
		</dl>
	</div>
{/snippet}

<!-- ─── D · annotated options ─────────────────────────────────────────────── -->

{#snippet conceptD(outcome: Outcome)}
	{@const chosen = CHOSEN[outcome]}
	<div class="space-y-2">
		{@render questionHead()}
		<ul class="space-y-1">
			{#each OPTIONS as option (option.value)}
				{@const isCorrect = option.value === CORRECT}
				{@const isChosen = option.value === chosen}
				<li
					class={`text-body-sm flex items-center gap-2 rounded-sm px-2 py-1 ${
						isCorrect ? 'bg-result-pass-soft' : isChosen ? 'bg-result-fail-soft' : ''
					}`}
				>
					<span
						aria-hidden="true"
						class={`size-2 shrink-0 rounded-full ${
							isCorrect ? 'bg-result-pass' : isChosen ? 'bg-result-fail' : 'bg-border'
						}`}
					></span>
					<span class="min-w-0 flex-1 text-foreground">{option.label}</span>
					{#if isCorrect}
						<span class="text-label-sm shrink-0 font-medium text-result-pass uppercase">
							what happened
						</span>
					{:else if isChosen}
						<span class="text-label-sm shrink-0 font-medium text-result-fail uppercase">
							you said
						</span>
					{/if}
				</li>
			{/each}
			{#if outcome === 'cant-tell'}
				<li class="text-body-sm flex items-center gap-2 rounded-sm bg-result-fail-soft px-2 py-1">
					<span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-result-fail"></span>
					<span class="min-w-0 flex-1 text-muted-foreground italic">I couldn’t tell</span>
					<span class="text-label-sm shrink-0 font-medium text-result-fail uppercase">you said</span
					>
				</li>
			{/if}
		</ul>
		{#if outcome === 'cant-tell'}
			<p class="text-label-md text-muted-foreground">
				That’s a finding, not a mistake — it is the failure this scenario measures.
			</p>
		{/if}
	</div>
{/snippet}

{#snippet gallery()}
	<div class="min-h-screen space-y-10 bg-background p-8">
		<header class="max-w-prose space-y-2">
			<h2 class="text-display-lg">The per-requirement reveal</h2>
			<p class="text-body-md text-muted-foreground">
				Shown the instant an attested requirement is answered — not deferred to the end of the run,
				because there is no score to protect and the teaching beat should land immediately.
			</p>
		</header>

		{@render grid(
			conceptA,
			'A · Inline swap',
			'One extra line under the question. Densest; the reveal reads as metadata rather than as a moment.'
		)}
		{@render grid(
			conceptB,
			'B · Verdict strip',
			'A tinted, left-ruled strip with a verdict word and a sentence of explanation. Most room to teach; costs the most vertical space.'
		)}
		{@render grid(
			conceptC,
			'C · Two-line ledger',
			'“You said / Actually”, as a labelled pair. Maximally explicit and neutral in tone; says nothing about WHY.'
		)}
		{@render grid(
			conceptD,
			'D · Annotated options',
			'Keep every option on screen and mark both the chosen and the true one. Natural for `choose`; has no obvious `affirm` form.'
		)}
	</div>
{/snippet}

{#snippet phone()}
	<div class="min-h-screen space-y-8 bg-background p-4" style="max-width: 375px;">
		<p class="text-label-md text-muted-foreground">375px — the real reading width.</p>
		{#each OUTCOMES as outcome (outcome)}
			<div class="space-y-3">
				<p class="text-label-md text-muted-foreground">{OUTCOME_CAPTION[outcome]}</p>
				<div class="rounded-md border border-border bg-card p-4">{@render conceptB(outcome)}</div>
				<div class="rounded-md border border-border bg-card p-4">{@render conceptD(outcome)}</div>
			</div>
		{/each}
	</div>
{/snippet}

{#if show === 'gallery'}{@render gallery()}
{:else if show === 'phone'}{@render phone()}
{/if}
