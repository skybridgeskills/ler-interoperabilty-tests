/**
 * Display model for one acceptance-pass credential in the wallet's artifact
 * list. Built client-side by the runnable verifier page: before the reveal the
 * `title` is the opaque pass label ("Credential 2") and `verified` stays undefined so
 * nothing about the ground-truth kind leaks; after scoring the page relabels
 * the views from the report's revealed artifacts.
 */
export type PassArtifactView = {
	/** Card title — opaque pass label pre-reveal, revealed kind title after. */
	title: string;
	/** Pretty-printed credential JSON: the copy/download payload. */
	json: string;
	/** Download filename, e.g. `pass-2.json`. */
	fileName: string;
	/**
	 * Suite-verification chip. `undefined` pre-reveal (no chip — showing one
	 * would leak ground truth); boolean once the reveal has happened.
	 */
	verified?: boolean;
	/** Quiet status line, e.g. "Awaiting your verdict" or "You reported: rejected". */
	note?: string;
};
