<script lang="ts">
	import {
		additiveProfilesForRoles,
		allProfiles,
		allRoles,
		type AdditiveProfileSlug,
		type ProfileSlug,
		type RoleSlug
	} from '$lib/interop/index.js';
	import { type Perspective, perspectiveCopy } from '$lib/interop/perspective/index.js';
	import { toSearchParams } from '$lib/interop/selection/index.js';

	import { anchorX } from './anchor-x.svelte.js';
	import { copyLinkLabel } from './copy-link-copy.js';
	import { dimensionCopy, filterPanelNotes } from './filter-bar-copy.js';
	import { setsLabel, summarise } from './filter-bar-summary.js';
	import { type Dimension, toneClasses, toneFor } from './filter-bar-tone.js';
	import {
		additiveItems,
		profileItems,
		roleItems,
		unofferedAdditiveNote
	} from './filter-panel-items.js';
	import FilterBarStatus from './FilterBarStatus.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import FilterTrigger from './FilterTrigger.svelte';
	import { panelMotion } from './panel-motion.js';

	import { resolve } from '$app/paths';

	/**
	 * The homepage filter bar: **① Roles · ② Standard Profiles · ③ Add-ons**.
	 *
	 * One compact row whose **closed state states the whole filter** — each
	 * dimension's number turns to ✓ once it has a selection, the count reads "All
	 * N" or "n of N scenario sets", and Copy link and Clear appear once anything is
	 * selected. Each dimension opens a full-width {@link FilterPanel} that teaches
	 * it, and each panel offers the way on (Next, or Show N scenario sets) without
	 * ever advancing on its own or locking the order.
	 *
	 * Two rules the bar exists to make visible:
	 *
	 * 1. **Add-ons appear with a role.** The Add-ons dimension is absent entirely
	 *    until a role with a scenario naming the additive is selected
	 *    (`rolesOfAdditiveProfile`) — an additive layers on a base profile *in a
	 *    role*, so offering one earlier asks a question with nowhere to put the
	 *    answer. `selectionStore` prunes a stale additive out of state to match;
	 *    this component only decides what to show.
	 * 2. **Filters filter.** The page hides what does not match behind an escape
	 *    hatch rather than reordering it.
	 *
	 * **Two forms of panel.** From `sm:` up a panel is an overlay anchored to its
	 * trigger (backdrop, focus moves in, focus leaving closes it). Below `sm:`, and
	 * while the page runs the **inline first step** (`intro`), a panel opens in the
	 * page flow instead: no backdrop, no notch, no focus theft, no focus-out close.
	 *
	 * **Colour**: Roles and Standard Profiles speak neutral ink; Add-ons speaks
	 * `additive` teal, the requirement layer it is. See `filter-bar-tone.ts`.
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
		perspective,
		intro = false,
		onIntroEnd = () => {},
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
		/** The reader's Perspective, for the panels' notes and example lines. */
		perspective?: Perspective;
		/**
		 * The inline first step: panels open in the page flow, starting at Roles,
		 * until the reader skips, closes or finishes — then `onIntroEnd`.
		 */
		intro?: boolean;
		onIntroEnd?: () => void;
		/** Which panel the reader opened. Bindable so a story can render one open. */
		open?: Dimension | null;
	} = $props();

	const triggers: Partial<Record<Dimension, HTMLButtonElement>> = $state({});
	let panel = $state<HTMLDivElement | undefined>(undefined);
	let wrapper = $state<HTMLDivElement | undefined>(undefined);

	const offeredAdditives = $derived(additiveProfilesForRoles(roles));
	const showAdditives = $derived(offeredAdditives.length > 0);

	/** The panel showing: the one opened, or Roles while the first step runs. */
	const shown = $derived<Dimension | null>(open ?? (intro ? 'roles' : null));
	const inline = $derived(intro);

	// A panel cannot outlive its dimension: deselecting the last relevant role
	// while the Add-ons panel is open would otherwise leave it hanging.
	$effect(() => {
		if (open === 'additives' && !showAdditives) open = null;
	});

	/** The overlay form only exists from `sm:` up; below it, every panel is in flow. */
	const isWide = () =>
		typeof window !== 'undefined' && window.matchMedia?.('(min-width: 40rem)').matches;
	const overlay = () => !inline && isWide();

	/**
	 * The dimension already handed focus. A plain `let`, deliberately untracked:
	 * the effect below must fire when a panel *opens*, not every time the panel
	 * re-renders — toggling an item rebuilds the cards, and re-focusing the
	 * container there would throw the operator out of the grid mid-selection.
	 */
	let focusedPanel: Dimension | null = null;

	// Opening an overlay panel moves focus into it. The panel is a labelled group,
	// so landing on the container itself announces which filter opened and leaves
	// the next Tab on the first control. An in-flow panel never steals focus.
	$effect(() => {
		if (!open) {
			focusedPanel = null;
			return;
		}
		if (focusedPanel === open) return;
		focusedPanel = open;
		if (overlay()) panel?.focus();
	});

	function close(returnFocus = true): void {
		const was = open;
		open = null;
		if (returnFocus && was && overlay()) triggers[was]?.focus();
	}

	/** Close, and end the first step if it is running — ✕, Escape, Show and Skip all do. */
	function finish(): void {
		close();
		if (intro) onIntroEnd();
	}

	function onTrigger(dimension: Dimension): void {
		if (shown !== dimension) open = dimension;
		else if (intro) finish();
		else close(false);
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && shown) {
			event.stopPropagation();
			finish();
		}
	}

	/**
	 * Focus leaving an overlay panel closes it — the non-modal counterpart to the
	 * backdrop's click-away. The panel is deliberately **not** a focus trap,
	 * because it is not modal and the page behind it stays usable.
	 *
	 * Three things are not "leaving": no `relatedTarget` (focus went to the
	 * browser chrome or another window), somewhere inside the panel, and the
	 * trigger that owns this panel (closing here would race its own click). An
	 * in-flow panel is part of the page and never closes on focus-out.
	 */
	function onFocusOut(event: FocusEvent): void {
		if (!open || !overlay()) return;
		const next = event.relatedTarget;
		if (!(next instanceof HTMLElement)) return;
		if (panel?.contains(next)) return;
		if (next === triggers[open]) return;
		close(false);
	}

	const summaries = $derived({
		roles: summarise(
			roles,
			allRoles.map((r) => ({ slug: r.slug as string, label: r.plural })),
			'Any'
		),
		profiles: summarise(
			profiles,
			allProfiles.map((p) => ({ slug: p.slug as string, label: p.name })),
			'Any'
		),
		additives: summarise(
			additives,
			offeredAdditives.map((a) => ({ slug: a.slug as string, label: a.name })),
			'None'
		)
	});
	const selectedCount = $derived({
		roles: roles.size,
		profiles: profiles.size,
		additives: additives.size
	});

	const dimensions = $derived<Dimension[]>([
		'roles',
		'profiles',
		...(showAdditives ? (['additives'] as const) : [])
	]);

	const anySelected = $derived(roles.size > 0 || profiles.size > 0 || additives.size > 0);
	const total = $derived(matched + hidden);

	const panelItems = $derived({
		roles: roleItems(roles, perspective),
		profiles: profileItems(profiles, perspective, roles),
		additives: additiveItems(offeredAdditives, additives, perspective)
	});
	const additiveNote = $derived(unofferedAdditiveNote(offeredAdditives));

	/** Where each panel's "read more" goes. Static route ids, resolved once. */
	const overviewHref = { roles: resolve('/about'), profiles: resolve('/profiles') } as const;

	/** The way on from a panel: the next offered dimension, or Show on the last. */
	function primaryFor(dimension: Dimension): { label: string; onClick: () => void } {
		const next = dimensions[dimensions.indexOf(dimension) + 1];
		return next
			? { label: `Next: ${dimensionCopy[next].label} →`, onClick: () => (open = next) }
			: { label: `Show ${setsLabel(matched)}`, onClick: finish };
	}

	const tone = $derived(toneClasses(shown ? toneFor(shown) : 'neutral'));

	async function copyLink(): Promise<void> {
		const params = toSearchParams({
			roles: [...roles],
			profiles: [...profiles],
			additiveProfiles: [...additives]
		});
		await navigator.clipboard.writeText(`${window.location.origin}${resolve('/')}?${params}`);
	}

	/**
	 * Where the panel grows from, and where its notch points. Measured live because
	 * a trigger's label is its own summary and therefore changes width underneath an
	 * open panel — see `anchor-x.svelte.ts` for the full failure mode.
	 */
	const anchor = anchorX({
		trigger: () => (shown ? triggers[shown] : undefined),
		wrapper: () => wrapper,
		track: () => summaries
	});

	const { reveal, fade } = panelMotion(() => anchor.current);
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!--
	`focusout` is listened for on the whole widget — bar and panel together — so a
	focus move *between* the two is one event the handler can judge as a whole.
-->
<div class="relative" bind:this={wrapper} onfocusout={onFocusOut}>
	<!-- Not sticky below `sm:`: four stacked rows would cost a fifth of the viewport. -->
	<div
		class="z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur sm:sticky sm:top-14"
	>
		<div class="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
			{#each dimensions as dimension (dimension)}
				<FilterTrigger
					bind:ref={triggers[dimension]}
					step={dimensionCopy[dimension].step}
					icon={dimensionCopy[dimension].icon}
					label={dimensionCopy[dimension].label}
					summary={summaries[dimension]}
					active={selectedCount[dimension] > 0}
					open={shown === dimension}
					tone={toneClasses(toneFor(dimension))}
					onclick={() => onTrigger(dimension)}
				/>
			{/each}

			<FilterBarStatus
				{matched}
				{total}
				{anySelected}
				copyLabel={perspectiveCopy(copyLinkLabel, perspective) ?? 'Copy link'}
				onCopyLink={copyLink}
				{onClear}
			/>
		</div>
	</div>

	{#if shown}
		{#if !inline}
			<!--
				The backdrop is a button so a pointer click anywhere dismisses the overlay;
				Escape does the same from the keyboard, which is why it is `tabindex="-1"`.
				Overlay form only: below `sm:` the panel is in flow and needs none.
			-->
			<button
				type="button"
				tabindex="-1"
				aria-label="Close filter panel"
				class="fixed inset-0 z-20 hidden cursor-default sm:block"
				onclick={() => close(false)}
				in:fade
			></button>
		{/if}
		<!--
			`tabindex="-1"` makes the container programmatically focusable without
			adding a tab stop of its own.
		-->
		<div
			bind:this={panel}
			id="filter-panel"
			tabindex="-1"
			role="group"
			aria-label={`${dimensionCopy[shown].label} filter`}
			class={`relative -mx-4 border-t-2 border-b border-border bg-popover px-4 py-6 focus:outline-none ${tone.rail} ${
				inline ? '' : 'sm:absolute sm:inset-x-0 sm:top-full sm:z-30 sm:shadow-lg'
			}`}
			in:reveal
		>
			{#if !inline}
				<!--
					Points the overlay back at the trigger that opened it. Two stacked
					triangles drawn with the transparent-side border trick: an outer 18×9
					in the rail's colour, and a second 16×8 offset 3px down in the panel's
					surface, leaving an even ~2px stroke that reads as the rail detouring up
					around the trigger. Overlay form only.
				-->
				<span
					aria-hidden="true"
					class="pointer-events-none absolute -top-[9px] hidden sm:block"
					style={`left: ${anchor.current}px; transform: translateX(-50%);`}
				>
					<span
						class={`block size-0 border-x-[9px] border-b-[9px] border-x-transparent ${tone.notchStroke}`}
					></span>
					<span
						class="absolute top-[3px] left-1/2 block size-0 -translate-x-1/2 border-x-[8px] border-b-[8px] border-x-transparent border-b-popover"
					></span>
				</span>
			{/if}
			{@render panelFor(shown)}
		</div>
	{/if}
</div>

{#snippet panelFor(dimension: Dimension)}
	{@const copy = dimensionCopy[dimension]}
	<FilterPanel
		heading={intro && copy.introHeading ? copy.introHeading : `${copy.step}. ${copy.label}`}
		icon={copy.icon}
		description={copy.description}
		items={panelItems[dimension]}
		columns={dimension === 'additives' ? 2 : 3}
		footnote={dimension === 'additives' ? additiveNote : undefined}
		note={perspectiveCopy(filterPanelNotes[dimension], perspective) ?? ''}
		noteTag={perspective}
		overviewHref={dimension === 'roles' ? overviewHref.roles : overviewHref.profiles}
		overviewLabel={copy.overviewLabel}
		primary={primaryFor(dimension)}
		skip={intro && dimension === 'roles'
			? { label: `Skip — show all ${total}`, onClick: finish }
			: undefined}
		onToggle={(slug) =>
			dimension === 'roles'
				? onToggleRole(slug as RoleSlug)
				: dimension === 'profiles'
					? onToggleProfile(slug as ProfileSlug)
					: onToggleAdditive(slug as AdditiveProfileSlug)}
		onClose={finish}
		{tone}
	/>
{/snippet}
