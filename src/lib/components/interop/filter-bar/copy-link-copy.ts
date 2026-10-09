import { PerspectiveCopy } from '$lib/interop/perspective/index.js';

/**
 * The filter bar's Copy link control and its confirmation. An Evaluator copies
 * the selection to send to the vendor they are judging; a Builder, to share
 * with a colleague. The link carries the filter, never the Perspective.
 */
export const copyLinkLabel = PerspectiveCopy({
	builder: 'Copy link to share',
	evaluator: 'Copy link for the vendor',
	neutral: 'Copy link'
});

export const copyLinkConfirmation = PerspectiveCopy({
	builder:
		'Link copied — it opens with this filter for whoever you share it with, not your Perspective.',
	evaluator:
		'Link copied — send it to the vendor; it opens with this filter, not your Perspective.',
	neutral: 'Link copied — it opens with this filter, not your Perspective.'
});
