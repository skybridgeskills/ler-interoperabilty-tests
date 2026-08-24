/**
 * What colour a filter dimension speaks.
 *
 * The tone marks the **requirement layer**, not the dimension: Roles and Profiles
 * select base-profile requirements and share the `requirement` blue the Essential
 * tier already uses on the cards below the bar; Add-ons layers a different kind of
 * requirement on top and gets `additive`, its own token, rather than borrowing one
 * that already means something else.
 *
 * Rationale, and why the add-on layer has a token at all:
 * {@link ../../../../../docs/adr/2026-08-21-additive-requirement-layer-colour.md | ADR 2026-08-21}.
 */

/** A dimension of the filter bar. Each opens one panel. */
export type Dimension = 'roles' | 'profiles' | 'additives';

/** The requirement layer a dimension selects within. */
export type Tone = 'requirement' | 'additive';

export function toneFor(dimension: Dimension): Tone {
	return dimension === 'additives' ? 'additive' : 'requirement';
}

/**
 * Every surface the tone reaches, as complete class strings.
 *
 * Complete, and never assembled from a template: Tailwind v4 scans source text, so
 * a class name built at runtime is a class name that was never generated.
 */
export type ToneClasses = {
	/** Heading, links, and the open trigger's own label. */
	text: string;
	/** The panel's 2px top rail. */
	rail: string;
	/** The notch's outer triangle — the rail's colour, on the other edge. */
	notchStroke: string;
	/** The open trigger's 2px underline. */
	underline: string;
	/**
	 * The soft band behind the panel heading — phones only. Opaque, not tinted at
	 * an alpha: the notch's inner triangle sits directly above it and is painted
	 * with the same token, and a translucent band would not match a triangle that
	 * hangs outside the panel over a different backdrop.
	 */
	softBg: string;
	/**
	 * The notch's inner triangle below `sm:`, where the soft band is what the panel
	 * paints under the rail. Above `sm:` it is the panel surface, which is the same
	 * for both tones and lives in the component.
	 */
	notchFill: string;
	/** Hover on a closed trigger, and on the panel's close control. */
	softHover: string;
	/** Hover on an unselected card. */
	cardHover: string;
	/** A selected card: border, fill, and ring. */
	selectedCard: string;
	/** A selected card's check pip. */
	pip: string;
};

const TONES: Record<Tone, ToneClasses> = {
	requirement: {
		text: 'text-requirement',
		rail: 'border-t-requirement',
		notchStroke: 'border-b-requirement',
		underline: 'border-requirement',
		softBg: 'bg-requirement-soft',
		notchFill: 'border-b-requirement-soft',
		softHover: 'hover:bg-requirement-soft hover:text-requirement',
		cardHover: 'hover:border-requirement/60 hover:bg-requirement-soft/25',
		selectedCard: 'border-requirement bg-requirement-soft/60 ring-1 ring-requirement/30',
		pip: 'border-requirement bg-requirement text-requirement-foreground'
	},
	additive: {
		text: 'text-additive',
		rail: 'border-t-additive',
		notchStroke: 'border-b-additive',
		underline: 'border-additive',
		softBg: 'bg-additive-soft',
		notchFill: 'border-b-additive-soft',
		softHover: 'hover:bg-additive-soft hover:text-additive',
		cardHover: 'hover:border-additive/60 hover:bg-additive-soft/25',
		selectedCard: 'border-additive bg-additive-soft/60 ring-1 ring-additive/30',
		pip: 'border-additive bg-additive text-additive-foreground'
	}
};

export function toneClasses(tone: Tone): ToneClasses {
	return TONES[tone];
}
