<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { additiveProfilesForBaseProfile } from '$lib/interop/accessors.js';
	import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
	import type { SampleResultType } from '$lib/interop/additive-profiles/open-skill-alignment/index.js';

	let {
		value,
		selectedAdditives,
		status,
		onChange,
		onToggleAdditive,
		onLoadSample,
		onVerify
	}: {
		value: string;
		selectedAdditives: AdditiveProfileSlug[];
		status: 'idle' | 'running' | 'done' | 'error';
		onChange: (next: string) => void;
		onToggleAdditive: (slug: AdditiveProfileSlug, next: boolean) => void;
		onLoadSample: (resultType: SampleResultType) => void;
		onVerify: () => void;
	} = $props();

	const sampleOptions: { label: string; resultType: SampleResultType }[] = [
		{ label: 'RawScore', resultType: 'RawScore' },
		{ label: 'Percent', resultType: 'Percent' },
		{ label: 'Rubric', resultType: 'RubricCriterionLevel' }
	];

	const applicableAdditives = additiveProfilesForBaseProfile('ob3-direct-delivery');

	const busy = $derived(status === 'running');
	const canVerify = $derived(value.trim().length > 0 && !busy);
	const selected = $derived(new Set(selectedAdditives));
</script>

<section class="space-y-4">
	<div class="space-y-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<label for="credential-paste" class="text-label-md font-medium text-foreground"
				>Pasted credential JSON</label
			>
			<div class="flex items-center gap-2 text-label-md text-muted-foreground">
				<span>Load sample:</span>
				{#each sampleOptions as option (option.resultType)}
					<button
						type="button"
						class="rounded-md border border-border px-2 py-1 transition hover:border-primary hover:text-foreground"
						onclick={() => onLoadSample(option.resultType)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>
		<textarea
			id="credential-paste"
			class="text-body-sm w-full rounded-md border border-border bg-background p-3 font-mono text-foreground focus:border-primary focus:outline-none"
			rows="18"
			placeholder="Paste an OpenBadgeCredential JSON document here, or load one of the samples above."
			{value}
			oninput={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
		></textarea>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			{#each applicableAdditives as additive (additive.slug)}
				<label
					class="flex cursor-pointer items-center gap-2 text-body-md text-foreground"
					for={`include-additive-${additive.slug}`}
				>
					<input
						id={`include-additive-${additive.slug}`}
						type="checkbox"
						class="size-4 rounded border-border text-primary"
						checked={selected.has(additive.slug)}
						onchange={(e) =>
							onToggleAdditive(additive.slug, (e.currentTarget as HTMLInputElement).checked)}
					/>
					<span>Include {additive.name} requirements</span>
				</label>
			{/each}
		</div>

		<Button type="button" disabled={!canVerify} onclick={onVerify}>
			{busy ? 'Verifying…' : 'Verify'}
		</Button>
	</div>
</section>
