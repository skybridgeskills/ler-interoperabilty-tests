/**
 * Display cap for one trace stage's body.
 *
 * Generous enough for a real error body — the JSON a service returns with a 500
 * is rarely more than a few KB — and small enough that a runaway response does
 * not become a wall of text in the operator's panel or a large payload on the
 * wire back to the browser.
 */
export const TRACE_BODY_LIMIT = 8 * 1024;

/** A stage body prepared for display: the value, plus a note when it was cut. */
export type TraceBody = {
	body?: unknown;
	truncated?: { originalBytes: number };
};

/**
 * Prepare an observed response body for display in a step's Details panel.
 *
 * **This never affects a measurement.** Every `automatic` check reads the
 * transport summaries, which the leaf computes from the *full* body before this
 * is called; the trace is display-only. So cutting a body here costs the
 * operator some detail and costs the score nothing.
 *
 * A body over the cap comes back as a **string** prefix rather than an object:
 * a truncated JSON document is not valid JSON, and handing the panel a
 * half-parsed object would be a lie about what arrived. The `truncated` note
 * carries the original size so the panel can say how much is missing.
 *
 * Never throws. A value that cannot be serialised at all (a cycle, a `BigInt`)
 * yields no body — the stage's own `error` already says what happened, and a
 * trace that crashed the intake it was documenting would be worse than useless.
 */
export function traceBody(value: unknown): TraceBody {
	if (value === undefined) return {};

	let serialised: string | undefined;
	try {
		serialised = JSON.stringify(value);
	} catch {
		return {};
	}
	if (serialised === undefined) return {};

	const originalBytes = Buffer.byteLength(serialised, 'utf8');
	if (originalBytes <= TRACE_BODY_LIMIT) return { body: value };

	return {
		body: serialised.slice(0, TRACE_BODY_LIMIT),
		truncated: { originalBytes }
	};
}
