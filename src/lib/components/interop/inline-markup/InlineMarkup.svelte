<script lang="ts">
	import { parseInlineMarkup } from './inline-markup.js';

	/**
	 * Render checklist copy with backtick spans as styled inline `<code>` chips
	 * (e.g. `QueryByExample` → a small mono chip). Purely presentational and
	 * XSS-safe — the text is split into real escaped text/code DOM nodes, never
	 * `{@html}`. `class` passes through to the wrapping span so callers keep their
	 * existing typography classes.
	 */
	let { text, class: className = '' }: { text: string; class?: string } = $props();
	const segments = $derived(parseInlineMarkup(text));
</script>

<span class={className}
	>{#each segments as segment (segment)}{#if segment.kind === 'code'}<code
				class="rounded-sm bg-muted px-1 py-0.5 text-[0.9em] text-foreground">{segment.value}</code
			>{:else}{segment.value}{/if}{/each}</span
>
