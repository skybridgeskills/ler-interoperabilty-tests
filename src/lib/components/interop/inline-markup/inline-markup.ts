/** One ordered piece of parsed inline copy: literal text or an inline-code span. */
export type InlineSegment = { kind: 'text'; value: string } | { kind: 'code'; value: string };

/**
 * Split `input` on paired backticks into ordered text/code segments so callers
 * can render inline-code spans without `{@html}`. A trailing unpaired backtick
 * (and the text after it) is emitted as literal text so no copy is ever
 * dropped; an empty span (``) is emitted literally so no empty chip renders.
 */
export function parseInlineMarkup(input: string): InlineSegment[] {
	const segments: InlineSegment[] = [];
	let rest = input;
	while (rest.length > 0) {
		const open = rest.indexOf('`');
		if (open === -1) {
			segments.push({ kind: 'text', value: rest });
			break;
		}
		const close = rest.indexOf('`', open + 1);
		if (close === -1) {
			// Unpaired backtick: keep everything literal.
			segments.push({ kind: 'text', value: rest });
			break;
		}
		if (open > 0) segments.push({ kind: 'text', value: rest.slice(0, open) });
		const code = rest.slice(open + 1, close);
		// Treat empty `` as literal so we never render an empty chip.
		segments.push(code.length > 0 ? { kind: 'code', value: code } : { kind: 'text', value: '``' });
		rest = rest.slice(close + 1);
	}
	return segments;
}
