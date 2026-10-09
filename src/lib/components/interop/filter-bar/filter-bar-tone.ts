/**
 * What colour a filter dimension speaks.
 *
 * Roles and Standard Profiles speak **neutral ink**: they narrow which scenario
 * sets show, and a hue on them would borrow a meaning (requirement blue is the
 * Essential tier and requirement levels on the cards). Add-ons keeps `additive`
 * teal, because an add-on **is** a requirement layer — the same one its sections
 * on the cards below are coloured for.
 *
 * Rationale for the add-on token, and the amendment that moved the base
 * dimensions to ink:
 * {@link ../../../../../docs/adr/2026-08-21-additive-requirement-layer-colour.md | ADR 2026-08-21}.
 */

/** A dimension of the filter bar. Each opens one panel. */
export type Dimension = 'roles' | 'profiles' | 'additives';

/** Ink for the base dimensions; teal for the add-on requirement layer. */
export type Tone = 'neutral' | 'additive';

export function toneFor(dimension: Dimension): Tone {
	return dimension === 'additives' ? 'additive' : 'neutral';
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
	/** The soft band behind the panel heading — phones only, where the panel is in flow. */
	softBg: string;
	/** Hover on a closed trigger, and on the panel's close control. */
	softHover: string;
	/** Hover on an unselected card. */
	cardHover: string;
	/** A selected card: border, fill, and ring. */
	selectedCard: string;
	/** A selected card's check pip, and a set dimension's ✓ on its trigger. */
	pip: string;
	/** The panel's primary action: Next, or Show N scenario sets. */
	action: string;
};

const TONES: Record<Tone, ToneClasses> = {
	neutral: {
		text: 'text-foreground',
		rail: 'border-t-foreground',
		notchStroke: 'border-b-foreground',
		underline: 'border-foreground',
		softBg: 'bg-muted',
		softHover: 'hover:bg-muted hover:text-foreground',
		cardHover: 'hover:border-foreground/40 hover:bg-muted/40',
		selectedCard: 'border-foreground bg-muted ring-1 ring-foreground/20',
		pip: 'border-foreground bg-foreground text-background',
		action: 'bg-foreground text-background hover:bg-foreground/85'
	},
	additive: {
		text: 'text-additive',
		rail: 'border-t-additive',
		notchStroke: 'border-b-additive',
		underline: 'border-additive',
		softBg: 'bg-additive-soft',
		softHover: 'hover:bg-additive-soft hover:text-additive',
		cardHover: 'hover:border-additive/60 hover:bg-additive-soft/25',
		selectedCard: 'border-additive bg-additive-soft/60 ring-1 ring-additive/30',
		pip: 'border-additive bg-additive text-additive-foreground',
		action: 'bg-additive text-additive-foreground hover:bg-additive/85'
	}
};

export function toneClasses(tone: Tone): ToneClasses {
	return TONES[tone];
}
