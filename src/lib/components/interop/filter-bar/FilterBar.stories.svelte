<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SvelteSet } from 'svelte/reactivity';

	import type { AdditiveProfileSlug, ProfileSlug, RoleSlug } from '$lib/interop/index.js';

	import FilterBar from './FilterBar.svelte';

	const { Story } = defineMeta({
		title: 'Components/Interop/FilterBar',
		component: FilterBar
	});

	/**
	 * A story-local selection. The bar owns no state — the homepage passes the
	 * persisted `selectionStore` sets and its togglers — so each story supplies a
	 * live stand-in that behaves the same way.
	 */
	function selection(
		roles: RoleSlug[] = [],
		profiles: ProfileSlug[] = [],
		additives: AdditiveProfileSlug[] = []
	) {
		const roleSet = new SvelteSet<RoleSlug>(roles);
		const profileSet = new SvelteSet<ProfileSlug>(profiles);
		const additiveSet = new SvelteSet<AdditiveProfileSlug>(additives);
		const toggle = <T,>(set: SvelteSet<T>, value: T) =>
			set.has(value) ? set.delete(value) : set.add(value);
		return {
			roles: roleSet,
			profiles: profileSet,
			additives: additiveSet,
			onToggleRole: (slug: RoleSlug) => toggle(roleSet, slug),
			onToggleProfile: (slug: ProfileSlug) => toggle(profileSet, slug),
			onToggleAdditive: (slug: AdditiveProfileSlug) => toggle(additiveSet, slug),
			onClear: () => {
				roleSet.clear();
				profileSet.clear();
				additiveSet.clear();
			}
		};
	}

	const unfiltered = selection();
	const filtered = selection(['wallet', 'verifier'], ['oid4'], ['data-integrity-cryptosuites']);
	const rolesOpen = selection(['wallet'], ['oid4']);
	const profilesOpen = selection(['wallet'], ['oid4']);
	const addOnsOpen = selection(['wallet'], ['oid4'], ['data-integrity-cryptosuites']);
</script>

<!--
	Every story reserves space below the bar: the panel is absolutely positioned
	against it, so a story with no room under the bar renders the panel off-canvas.

	The panel's entry animation runs on mount, so a screenshot taken the instant a
	story loads can catch it mid-flight — scaled by 0.98 and partly transparent.
	Measurements taken then are skewed by exactly that; wait for it to settle, or
	call `element.getAnimations().forEach((a) => a.finish())` first.
-->
<Story name="Unfiltered" asChild>
	<div class="min-h-[36rem] bg-background px-4 py-6">
		<FilterBar {...unfiltered} matched={4} hidden={0} />
	</div>
</Story>

<Story name="Filtered" asChild>
	<div class="min-h-[36rem] bg-background px-4 py-6">
		<FilterBar {...filtered} matched={2} hidden={2} />
	</div>
</Story>

<Story name="Roles panel open" asChild>
	<div class="min-h-[40rem] bg-background px-4 py-6">
		<FilterBar {...rolesOpen} matched={1} hidden={3} open="roles" />
	</div>
</Story>

<Story name="Profiles panel open" asChild>
	<div class="min-h-[40rem] bg-background px-4 py-6">
		<FilterBar {...profilesOpen} matched={1} hidden={3} open="profiles" />
	</div>
</Story>

<Story name="Add-ons panel open" asChild>
	<div class="min-h-[40rem] bg-background px-4 py-6">
		<FilterBar {...addOnsOpen} matched={1} hidden={3} open="additives" />
	</div>
</Story>
