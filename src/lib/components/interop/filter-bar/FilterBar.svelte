<script lang="ts">
	import {
		additiveProfilesForRoles,
		allProfiles,
		allRoles,
		type AdditiveProfileSlug,
		type ProfileSlug,
		type RoleSlug
	} from '$lib/interop/index.js';

	import { anchorX } from './anchor-x.svelte.js';
	import { type Dimension, toneClasses, toneFor } from './filter-bar-tone.js';
	import {
		additiveItems,
		profileItems,
		roleItems,
		shortProfileName,
		unofferedAdditiveNote
	} from './filter-panel-items.js';
	import FilterPanel from './FilterPanel.svelte';
	import { panelMotion } from './panel-motion.js';

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
	 *    until a role some additive declares a legacy list for is selected — an
	 *    additive layers on a base profile *in a role*, so offering one earlier
	 *    asks a question with nowhere to put the answer. `selectionStore` prunes a
	 *    stale additive out of state to match; this component only decides what to
	 *    show.
	 * 2. **Filters filter.** The count reads `N of M scenario sets`, and the page
	 *    hides the rest behind an escape hatch rather than reordering them — which
	 *    is what made the old selectors read as broken when a selection matched
	 *    nothing.
	 *
	 * **The colour marks the requirement layer, not the dimension.** Roles and
	 * Profiles select base-profile requirements and speak the same `requirement`
	 * blue the Essential tier uses on the cards below; Add-ons layers a different
	 * kind of requirement and speaks `additive` teal. A **closed** dimension that is
	 * filtering keeps its colour, so the bar states its own filter at rest and not
	 * only while open. See `filter-bar-tone.ts`.
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

	const triggers: Partial<Record<Dimension, HTMLButtonElement>> = $state({});
	let panel = $state<HTMLDivElement | undefined>(undefined);
	let wrapper = $state<HTMLDivElement | undefined>(undefined);

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
		// "All" is a summary, and a summary of one item is just that item's name. With
		// a single add-on offered, `Add-ons · All` reads as a claim about a set the
		// reader cannot see; `Add-ons · Data Integrity` reads as what it is.
		if (selected.size === all.length) return all.length === 1 ? all[0].label : 'All';
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

	const dimensions = $derived<
		{ key: Dimension; label: string; summary: string; active: boolean }[]
	>([
		// "Any" for the two filtering dimensions — an empty one admits everything.
		// "None" for add-ons, because an empty add-on selection layers nothing on;
		// it is not a wildcard, and saying "Any" there would claim it was.
		//
		// `active` is what lets a **closed** dimension state its own colour: a bar
		// that only shows its filter while a panel is open is a bar that looks
		// unfiltered at rest.
		{
			key: 'roles',
			label: 'Roles',
			summary: summarise(roles, roleLabels, 'Any'),
			active: roles.size > 0
		},
		{
			key: 'profiles',
			label: 'Profiles',
			summary: summarise(profiles, profileLabels, 'Any'),
			active: profiles.size > 0
		},
		...(showAdditives
			? [
					{
						key: 'additives' as const,
						label: 'Add-ons',
						summary: summarise(additives, additiveLabels, 'None'),
						active: additives.size > 0
					}
				]
			: [])
	]);

	const anySelected = $derived(roles.size > 0 || profiles.size > 0 || additives.size > 0);

	const panelItems = $derived({
		roles: roleItems(roles),
		profiles: profileItems(profiles),
		additives: additiveItems(offeredAdditives, additives)
	});
	const additiveNote = $derived(unofferedAdditiveNote(offeredAdditives));

	/** Where each panel's "read more" goes. Static route ids, resolved once. */
	const profilesOverviewHref = resolve('/profiles');
	const rolesOverviewHref = resolve('/about');

	const openTone = $derived(open ? toneFor(open) : 'requirement');
	const tone = $derived(toneClasses(openTone));

	/**
	 * Where the panel grows from, and where its notch points. Measured live because
	 * a trigger's label is its own summary and therefore changes width underneath an
	 * open panel — see `anchor-x.svelte.ts` for the full failure mode.
	 */
	const anchor = anchorX({
		trigger: () => (open ? triggers[open] : undefined),
		wrapper: () => wrapper,
		track: () => dimensions
	});

	const { reveal, fade } = panelMotion(() => anchor.current);
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!--
	`focusout` is listened for on the whole widget — bar and panel together — rather
	than on the panel alone, so a focus move *between* the two (the trigger, a
	sibling trigger, Clear) is one event this handler can judge as a whole.
-->
<div class="relative" bind:this={wrapper} onfocusout={onFocusOut}>
	<div
		class="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur"
	>
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			{#each dimensions as dimension (dimension.key)}
				{@const isOpen = open === dimension.key}
				{@const dimensionTone = toneClasses(toneFor(dimension.key))}
				<!--
					`relative z-40` puts the trigger above the panel's own top rail, so the
					underline and the rail read as one line the notch detours around rather
					than as two lines stacked.
				-->
				<button
					bind:this={triggers[dimension.key]}
					type="button"
					aria-haspopup="dialog"
					aria-expanded={isOpen}
					aria-controls="filter-panel"
					onclick={() => (isOpen ? close(false) : (open = dimension.key))}
					class={`relative z-40 flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-label-md transition-all duration-150 ${
						isOpen
							? `rounded-b-none border-b-2 bg-transparent ${dimensionTone.text} ${dimensionTone.underline}`
							: `${dimension.active ? dimensionTone.text : 'text-muted-foreground'} ${dimensionTone.softHover}`
					}`}
				>
					<span>{dimension.label}</span>
					<span aria-hidden="true" class="opacity-50">·</span>
					<span class="min-w-0 truncate text-foreground">{dimension.summary}</span>
					<span
						aria-hidden="true"
						class={`text-xs opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
						>▾</span
					>
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
			in:fade
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
			class={`absolute inset-x-0 top-full z-30 -mx-4 border-t-2 border-b border-border bg-popover px-4 py-6 shadow-lg focus:outline-none ${tone.rail}`}
			in:reveal
		>
			<!--
				Points the panel back at the trigger that opened it. Two stacked triangles
				drawn with the transparent-side border trick: an outer 18×9 in the rail's
				colour, and a second 16×8 offset 3px down in whatever the panel paints under
				the rail, leaving an even ~2px stroke that reads as the rail detouring up
				around the trigger. The inner triangle is deliberately 1px taller than the
				offset so its base swallows the 2px rail underneath — otherwise a line is
				drawn straight across the notch's mouth.

				The inner fill has to follow the panel's own surface or the notch reads as a
				floating bracket: the soft header band below `sm:`, `bg-popover` above it.
			-->
			<span
				aria-hidden="true"
				class="pointer-events-none absolute -top-[9px] block"
				style={`left: ${anchor.current}px; transform: translateX(-50%);`}
			>
				<span
					class={`block size-0 border-x-[9px] border-b-[9px] border-x-transparent ${tone.notchStroke}`}
				></span>
				<span
					class={`absolute top-[3px] left-1/2 block size-0 -translate-x-1/2 border-x-[8px] border-b-[8px] border-x-transparent sm:border-b-popover ${tone.notchFill}`}
				></span>
			</span>
			{#if open === 'roles'}
				<FilterPanel
					heading="Roles"
					description="A role is the part a product plays in a credential exchange. Wallets play the holder role; the label stays “Wallet.”"
					items={panelItems.roles}
					builderNote="Pick the role(s) your product plays: issuer, wallet, verifier, or some combination."
					evaluatorNote="Pick the role(s) you need a platform, vendor, or implementation to demonstrate."
					overviewHref={rolesOverviewHref}
					overviewLabel="How roles fit together"
					onToggle={(slug) => onToggleRole(slug as RoleSlug)}
					onClose={() => close()}
					{tone}
				/>
			{:else if open === 'profiles'}
				<FilterPanel
					heading="Interoperability profiles"
					description="A profile is a set of standards and options — every parameter you need to do one thing with credentials."
					items={panelItems.profiles}
					builderNote="Cover the profiles your product needs to interoperate with."
					evaluatorNote="Pick the profiles your ecosystem requires, then ask the platform or implementation to demonstrate them."
					overviewHref={profilesOverviewHref}
					overviewLabel="All profiles"
					onToggle={(slug) => onToggleProfile(slug as ProfileSlug)}
					onClose={() => close()}
					{tone}
				/>
			{:else}
				<FilterPanel
					heading="Add-on profiles"
					description="Additive profiles layer extra requirements on top of a base profile. They are never run alone — selecting one adds its requirements to every scenario set it applies to."
					items={panelItems.additives}
					columns={2}
					footnote={additiveNote}
					builderNote="Layer the add-ons your ecosystem mandates on top of the base profiles you already cover."
					evaluatorNote="Add the data or crypto requirements your procurement asks for, and see them inside each scenario set."
					overviewHref={profilesOverviewHref}
					overviewLabel="All add-on profiles"
					onToggle={(slug) => onToggleAdditive(slug as AdditiveProfileSlug)}
					onClose={() => close()}
					{tone}
				/>
			{/if}
		</div>
	{/if}
</div>
