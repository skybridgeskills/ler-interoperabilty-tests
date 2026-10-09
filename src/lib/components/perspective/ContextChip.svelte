<script lang="ts">
	import AppWindow from '@lucide/svelte/icons/app-window';
	import Layers from '@lucide/svelte/icons/layers';
	import SquarePlus from '@lucide/svelte/icons/square-plus';

	/**
	 * A context marker in a hero's chips row: what kind of thing this page is
	 * about, and which one, linking to it. Role, Standard Profile and Add-on are
	 * told apart by **icon and label**, never by hue — Perspective is the only
	 * chip with colour.
	 */
	let {
		kind,
		label,
		href
	}: {
		kind: 'role' | 'profile' | 'addon';
		/** The thing's own name: "Wallet", "VCALM", "Data Integrity Cryptosuites". */
		label: string;
		href: string;
	} = $props();

	const kinds = {
		role: { name: 'Role', icon: AppWindow },
		profile: { name: 'Standard Profile', icon: Layers },
		addon: { name: 'Add-on', icon: SquarePlus }
	} as const;

	const meta = $derived(kinds[kind]);
</script>

<a
	{href}
	class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-foreground transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
>
	<meta.icon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
	<span class="text-label-md text-muted-foreground">{meta.name}</span>
	<span class="truncate text-body-md">{label}</span>
</a>
