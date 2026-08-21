<script lang="ts">
	import {
		additiveProfileHref,
		allAdditiveProfiles,
		type AdditiveProfile,
		type AdditiveProfileSlug,
		additiveProfilesForRoles,
		allProfiles,
		allRoles,
		type Profile,
		type ProfileSlug,
		profileHref,
		roleHref,
		type RoleSlug,
		rolesOfAdditiveProfile
	} from '$lib/interop/index.js';

	import type { FilterPanelItem } from './filter-panel-item.js';
	import FilterPanel from './FilterPanel.svelte';

	import { resolve } from '$app/paths';

	/**
	 * The homepage filter bar.
	 *
	 * Replaces the three stacked chooser sections with one compact row whose
	 * **closed state states the whole filter** — `Roles · Wallets, Verifiers`,
	 * `Profiles · OID4`, the match count, and a Clear. Each dimension opens a
	 * full-width {@link FilterPanel} that carries the educational content those
	 * sections used to spend the top half of the page on.
	 *
	 * Two rules the bar exists to make visible:
	 *
	 * 1. **Add-ons appear with a role.** The Add-ons dimension is absent entirely
	 *    until a role some additive declares a checklist for is selected — an
	 *    additive layers on a base profile *in a role*, so offering one earlier
	 *    asks a question with nowhere to put the answer. `selectionStore` prunes a
	 *    stale additive out of state to match; this component only decides what to
	 *    show.
	 * 2. **Filters filter.** The count reads `N of M scenario sets`, and the page
	 *    hides the rest behind an escape hatch rather than reordering them — which
	 *    is what made the old selectors read as broken when a selection matched
	 *    nothing.
	 *
	 * State is owned by the caller, as with every selector this replaces.
	 */
	let {
		roles,
		profiles,
		additives,
		onToggleRole,
		onToggleProfile,
		onToggleAdditive,
		onClear,
		matched,
		hidden,
		open = $bindable(null)
	}: {
		roles: Set<RoleSlug>;
		profiles: Set<ProfileSlug>;
		additives: Set<AdditiveProfileSlug>;
		onToggleRole: (slug: RoleSlug) => void;
		onToggleProfile: (slug: ProfileSlug) => void;
		onToggleAdditive: (slug: AdditiveProfileSlug) => void;
		onClear: () => void;
		/** Scenario sets currently shown. */
		matched: number;
		/** Scenario sets the filter is holding back. */
		hidden: number;
		/** Which panel is open. Bindable so a story can render one open. */
		open?: Dimension | null;
	} = $props();

	type Dimension = 'roles' | 'profiles' | 'additives';

	const triggers: Partial<Record<Dimension, HTMLButtonElement>> = $state({});
	let panel = $state<HTMLDivElement | undefined>(undefined);

	const offeredAdditives = $derived(additiveProfilesForRoles(roles));
	const showAdditives = $derived(offeredAdditives.length > 0);

	// A panel cannot outlive its dimension: deselecting the last relevant role
	// while the Add-ons panel is open would otherwise leave it hanging.
	$effect(() => {
		if (open === 'additives' && !showAdditives) open = null;
	});

	/**
	 * The dimension already handed focus. A plain `let`, deliberately untracked:
	 * the effect below must fire when a panel *opens*, not every time the panel
	 * re-renders — toggling an item rebuilds the cards, and re-focusing the
	 * container there would throw the operator out of the grid mid-selection.
	 */
	let focusedPanel: Dimension | null = null;

	// Opening a panel moves focus into it. The panel is a labelled group, so
	// landing on the container itself announces which filter opened and leaves the
	// next Tab on the first control — rather than dropping the reader onto "Close",
	// which is what focusing the first focusable element would do.
	$effect(() => {
		if (!open) {
			focusedPanel = null;
			return;
		}
		if (focusedPanel === open) return;
		focusedPanel = open;
		panel?.focus();
	});

	function close(returnFocus = true): void {
		const was = open;
		open = null;
		if (returnFocus && was) triggers[was]?.focus();
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && open) {
			event.stopPropagation();
			close();
		}
	}

	/**
	 * Focus leaving the panel closes it — the non-modal counterpart to the
	 * backdrop's click-away. Tab off the last card and the panel gets out of the
	 * way instead of leaving a full-width overlay open behind the page it is
	 * covering; the panel is deliberately **not** a focus trap, because it is not
	 * modal and the page behind it stays usable.
	 *
	 * Three things are not "leaving":
	 *
	 * - **No `relatedTarget`.** Focus went to the browser chrome or another window;
	 *   closing on every Alt-Tab would lose a half-made selection.
	 * - **Somewhere inside the panel.** Clicking a card, tabbing between them.
	 * - **The trigger that owns this panel.** It is the same disclosure widget, and
	 *   closing here would race the trigger's own click — a pointer press moves
	 *   focus *before* the click fires, so we would close and the click would find
	 *   the panel already shut and reopen it.
	 */
	function onFocusOut(event: FocusEvent): void {
		if (!open) return;
		const next = event.relatedTarget;
		if (!(next instanceof HTMLElement)) return;
		if (panel?.contains(next)) return;
		if (next === triggers[open]) return;
		// Focus has already moved where the operator sent it; pulling it back to the
		// trigger would undo their Tab.
		close(false);
	}

	/**
	 * A profile's name without the trailing "Profile" — the bar has one line and
	 * "VCALM Profile, OID4 Profile" spends most of it saying "Profile" twice.
	 */
	function shortProfileName(profile: Profile | AdditiveProfile): string {
		return profile.name.replace(/\s+Profile$/, '');
	}

	/**
	 * What a trigger says about its dimension. Never blank: an unfiltered
	 * dimension reads "Any", because a filter bar that shows nothing where a
	 * selection would go looks broken rather than open.
	 */
	function summarise(
		selected: Set<string>,
		all: { slug: string; label: string }[],
		emptyLabel: 'Any' | 'None'
	): string {
		if (selected.size === 0) return emptyLabel;
		if (selected.size === all.length) return 'All';
		const labels = all.filter((x) => selected.has(x.slug)).map((x) => x.label);
		return labels.length <= 2 ? labels.join(', ') : `${labels[0]}, +${labels.length - 1} more`;
	}

	const roleLabels = $derived(allRoles.map((r) => ({ slug: r.slug as string, label: r.plural })));
	const profileLabels = $derived(
		allProfiles.map((p) => ({ slug: p.slug as string, label: shortProfileName(p) }))
	);
	const additiveLabels = $derived(
		offeredAdditives.map((a) => ({ slug: a.slug as string, label: shortProfileName(a) }))
	);

	const dimensions = $derived<{ key: Dimension; label: string; summary: string }[]>([
		// "Any" for the two filtering dimensions — an empty one admits everything.
		// "None" for add-ons, because an empty add-on selection layers nothing on;
		// it is not a wildcard, and saying "Any" there would claim it was.
		{ key: 'roles', label: 'Roles', summary: summarise(roles, roleLabels, 'Any') },
		{ key: 'profiles', label: 'Profiles', summary: summarise(profiles, profileLabels, 'Any') },
		...(showAdditives
			? [
					{
						key: 'additives' as const,
						label: 'Add-ons',
						summary: summarise(additives, additiveLabels, 'None')
					}
				]
			: [])
	]);

	const anySelected = $derived(roles.size > 0 || profiles.size > 0 || additives.size > 0);

	const roleItems = $derived<FilterPanelItem[]>(
		allRoles.map((role) => ({
			slug: role.slug,
			title: role.plural,
			body: role.blurb,
			docHref: roleHref(role.slug),
			docLabel: `About ${role.plural.toLowerCase()}`,
			selected: roles.has(role.slug)
		}))
	);

	const profileItems = $derived<FilterPanelItem[]>(
		allProfiles.map((profile) => ({
			slug: profile.slug,
			title: profile.name,
			body: profile.description,
			docHref: profileHref(profile.slug),
			docLabel: 'Read the profile',
			selected: profiles.has(profile.slug)
		}))
	);

	/** Where each panel's "read more" goes. Static route ids, resolved once. */
	const profilesOverviewHref = resolve('/profiles');
	const rolesOverviewHref = resolve('/about');

	/**
	 * Named rather than silently omitted: an add-on the reader has heard of and
	 * cannot see here is absent for a reason, and the reason is their role
	 * selection.
	 */
	const unofferedAdditiveNote = $derived.by(() => {
		const missing = allAdditiveProfiles.length - offeredAdditives.length;
		if (missing <= 0) return undefined;
		return missing === 1
			? '1 more add-on applies to roles you have not selected.'
			: `${missing} more add-ons apply to roles you have not selected.`;
	});

	const additiveItems = $derived<FilterPanelItem[]>(
		offeredAdditives.map((additive) => ({
			slug: additive.slug,
			title: additive.name,
			body: additive.description,
			docHref: additiveProfileHref(additive.slug),
			docLabel: 'Read the add-on',
			meta: `For ${rolesOfAdditiveProfile(additive).join(', ')} · layers on ${
				additive.appliesToBaseProfiles.length
			} base profiles`,
			selected: additives.has(additive.slug)
		}))
	);
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!--
	`focusout` is listened for on the whole widget — bar and panel together — rather
	than on the panel alone, so a focus move *between* the two (the trigger, a
	sibling trigger, Clear) is one event this handler can judge as a whole.
-->
<div class="relative" onfocusout={onFocusOut}>
	<div
		class="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur"
	>
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			{#each dimensions as dimension (dimension.key)}
				<button
					bind:this={triggers[dimension.key]}
					type="button"
					aria-haspopup="dialog"
					aria-expanded={open === dimension.key}
					aria-controls="filter-panel"
					onclick={() => (open === dimension.key ? close(false) : (open = dimension.key))}
					class={`flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-label-md transition ${
						open === dimension.key
							? 'bg-secondary text-foreground'
							: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
					}`}
				>
					<span>{dimension.label}</span>
					<span aria-hidden="true" class="opacity-50">·</span>
					<span class="min-w-0 truncate text-foreground">{dimension.summary}</span>
					<span aria-hidden="true" class="text-xs opacity-70">▾</span>
				</button>
			{/each}

			<div class="ml-auto flex items-center gap-3 pl-2">
				<span class="text-label-md text-muted-foreground">
					{#if !anySelected}
						Showing all {matched} scenario sets
					{:else}
						{matched} of {matched + hidden} scenario sets
					{/if}
				</span>
				{#if anySelected}
					<button
						type="button"
						onclick={onClear}
						class="text-label-md text-primary hover:underline"
					>
						Clear
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if open}
		<!--
			The backdrop is a button so a pointer click anywhere dismisses the panel;
			Escape does the same from the keyboard, which is why it is `tabindex="-1"`
			and never a tab stop of its own.
		-->
		<button
			type="button"
			tabindex="-1"
			aria-label="Close filter panel"
			class="fixed inset-0 z-20 cursor-default"
			onclick={() => close(false)}
		></button>
		<!--
			`tabindex="-1"` makes the container programmatically focusable without
			adding a tab stop of its own: opening the panel focuses it once, and from
			there Tab walks the controls inside in DOM order.
		-->
		<div
			bind:this={panel}
			id="filter-panel"
			tabindex="-1"
			role="group"
			aria-label={`${dimensions.find((d) => d.key === open)?.label} filter`}
			class="absolute inset-x-0 top-full z-30 -mx-4 border-b border-border bg-popover px-4 py-6 shadow-lg focus:outline-none"
		>
			{#if open === 'roles'}
				<FilterPanel
					heading="Roles"
					description="A role is the part a product plays in a credential exchange. Wallets play the holder role; the label stays “Wallet.”"
					items={roleItems}
					builderNote="Pick the role(s) your product plays: issuer, wallet, verifier, or some combination."
					evaluatorNote="Pick the role(s) you need a platform, vendor, or implementation to demonstrate."
					overviewHref={rolesOverviewHref}
					overviewLabel="How roles fit together"
					onToggle={(slug) => onToggleRole(slug as RoleSlug)}
					onClose={close}
				/>
			{:else if open === 'profiles'}
				<FilterPanel
					heading="Interoperability profiles"
					description="A profile is a set of standards and options — every parameter you need to do one thing with credentials."
					items={profileItems}
					builderNote="Cover the profiles your product needs to interoperate with."
					evaluatorNote="Pick the profiles your ecosystem requires, then ask the platform or implementation to demonstrate them."
					overviewHref={profilesOverviewHref}
					overviewLabel="All profiles"
					onToggle={(slug) => onToggleProfile(slug as ProfileSlug)}
					onClose={close}
				/>
			{:else}
				<FilterPanel
					heading="Add-on profiles"
					description="Additive profiles layer extra requirements on top of a base profile. They are never run alone — selecting one adds its requirements to every scenario set it applies to."
					items={additiveItems}
					columns={2}
					footnote={unofferedAdditiveNote}
					builderNote="Layer the add-ons your ecosystem mandates on top of the base profiles you already cover."
					evaluatorNote="Add the data or crypto requirements your procurement asks for, and see them inside each scenario set."
					overviewHref={profilesOverviewHref}
					overviewLabel="All add-on profiles"
					onToggle={(slug) => onToggleAdditive(slug as AdditiveProfileSlug)}
					onClose={close}
				/>
			{/if}
		</div>
	{/if}
</div>
