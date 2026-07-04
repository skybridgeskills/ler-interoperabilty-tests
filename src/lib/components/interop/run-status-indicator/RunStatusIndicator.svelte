<script lang="ts">
	import {
		runStatusToneClasses,
		type RequirementStatusView
	} from '$lib/components/interop/requirement-status-row/requirement-status-view.js';

	/**
	 * Inline `● LABEL` status indicator — the step-level counterpart to a
	 * {@link RequirementStatusView} row's dot + trailing label. It shares the one
	 * tone source ({@link runStatusToneClasses}) with `RequirementStatusRow`, so the
	 * step header and its requirement rows read as one system and cannot drift.
	 * There is no requirement `level` at the step level, so a `fail` tone is red.
	 */
	let { status }: { status: RequirementStatusView } = $props();

	const toneClasses = $derived(runStatusToneClasses(status.tone));
</script>

<span class="inline-flex items-center gap-1.5 text-label-md">
	<span aria-hidden="true" class={`size-2.5 shrink-0 rounded-full ${toneClasses.dot}`}></span>
	<span class={`font-medium uppercase ${toneClasses.label}`}>{status.label}</span>
</span>
