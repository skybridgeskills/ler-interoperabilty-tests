/** One selectable, self-documenting item inside a {@link FilterPanel}. */
export type FilterPanelItem = {
	slug: string;
	title: string;
	/** The item's own blurb — the educational payload the homepage used to inline. */
	body: string;
	/** Link to this item's own page, e.g. `/profiles/oid4`. */
	docHref: string;
	docLabel: string;
	/** Optional dense line above the blurb, e.g. an additive's roles + reach. */
	meta?: string;
	selected: boolean;
};
