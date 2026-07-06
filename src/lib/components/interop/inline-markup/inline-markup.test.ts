import { describe, expect, it } from 'vitest';

import { parseInlineMarkup } from './inline-markup.js';

describe('parseInlineMarkup', () => {
	it('returns a single text segment when there are no backticks', () => {
		expect(parseInlineMarkup('plain text')).toEqual([{ kind: 'text', value: 'plain text' }]);
	});

	it('splits a single code span from surrounding text', () => {
		expect(parseInlineMarkup('use `QueryByExample` here')).toEqual([
			{ kind: 'text', value: 'use ' },
			{ kind: 'code', value: 'QueryByExample' },
			{ kind: 'text', value: ' here' }
		]);
	});

	it('handles multiple code spans', () => {
		expect(parseInlineMarkup('`a` and `b`')).toEqual([
			{ kind: 'code', value: 'a' },
			{ kind: 'text', value: ' and ' },
			{ kind: 'code', value: 'b' }
		]);
	});

	it('renders a leading and trailing code span', () => {
		expect(parseInlineMarkup('`di_vp`')).toEqual([{ kind: 'code', value: 'di_vp' }]);
	});

	it('keeps an unpaired trailing backtick and its text literal', () => {
		expect(parseInlineMarkup('a `code` and a lone ` backtick')).toEqual([
			{ kind: 'text', value: 'a ' },
			{ kind: 'code', value: 'code' },
			{ kind: 'text', value: ' and a lone ` backtick' }
		]);
	});

	it('treats an empty span as literal text (no empty chip)', () => {
		expect(parseInlineMarkup('empty `` span')).toEqual([
			{ kind: 'text', value: 'empty ' },
			{ kind: 'text', value: '``' },
			{ kind: 'text', value: ' span' }
		]);
	});

	it('returns nothing for an empty string', () => {
		expect(parseInlineMarkup('')).toEqual([]);
	});
});
