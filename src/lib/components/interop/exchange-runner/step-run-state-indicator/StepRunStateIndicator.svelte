<script lang="ts" module>
	import type { StepRunState } from '$lib/interop/index.js';

	type StateConfig = {
		label: string;
		dotClass: string;
		textClass: string;
	};

	const config: Record<StepRunState, StateConfig> = {
		pending: {
			label: 'Pending',
			dotClass: 'bg-muted-foreground/40',
			textClass: 'text-muted-foreground'
		},
		'in-flight': {
			label: 'In progress',
			dotClass: 'bg-live animate-pulse',
			textClass: 'text-live'
		},
		complete: {
			label: 'Done',
			dotClass: 'bg-primary',
			textClass: 'text-primary'
		},
		skipped: {
			label: 'Skipped',
			dotClass: 'bg-muted-foreground/30',
			textClass: 'text-muted-foreground line-through decoration-muted-foreground/40'
		}
	};
</script>

<script lang="ts">
	let { state, label }: { state: StepRunState; label?: string } = $props();
	const c = $derived(config[state]);
</script>

<span class="inline-flex items-center gap-2 text-label-md">
	<span aria-hidden="true" class={`size-2 rounded-full ${c.dotClass}`}></span>
	<span class={c.textClass}>{label ?? c.label}</span>
</span>
