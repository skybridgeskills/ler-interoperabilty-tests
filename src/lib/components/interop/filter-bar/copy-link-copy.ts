import { PerspectiveCopy } from '$lib/interop/perspective/index.js';

/**
 * The label of the filter bar's Copy link control. An Evaluator copies the
 * selection to send to the vendor they are judging. Rendered by the guided
 * filters' Copy link control.
 */
export const copyLinkLabel = PerspectiveCopy({
	builder: 'Copy link',
	evaluator: 'Copy link for the vendor',
	neutral: 'Copy link'
});
