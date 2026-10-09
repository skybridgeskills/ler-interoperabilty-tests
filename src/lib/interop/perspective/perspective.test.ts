import { describe, expect, it } from 'vitest';

import { PerspectiveCookieValue, PerspectiveCopy, perspectiveCopy } from './perspective.js';

const uiString = PerspectiveCopy({
	builder: 'for builders',
	evaluator: 'for evaluators',
	neutral: 'for everyone'
});
const framing = PerspectiveCopy({ builder: 'for builders', evaluator: 'for evaluators' });

describe('perspectiveCopy', () => {
	it('returns the chosen Perspective’s version', () => {
		expect(perspectiveCopy(uiString, 'builder')).toBe('for builders');
		expect(perspectiveCopy(uiString, 'evaluator')).toBe('for evaluators');
	});

	it('returns neutral when the Perspective is unset', () => {
		expect(perspectiveCopy(uiString, undefined)).toBe('for everyone');
	});

	it('returns undefined when unset and there is no neutral — render nothing', () => {
		expect(perspectiveCopy(framing, undefined)).toBeUndefined();
	});
});

describe('PerspectiveCopy', () => {
	it('rejects an empty builder version', () => {
		expect(() => PerspectiveCopy({ builder: '', evaluator: 'for evaluators' })).toThrow();
	});

	it('rejects a missing evaluator version', () => {
		expect(PerspectiveCopy.schema.safeParse({ builder: 'for builders' }).success).toBe(false);
	});
});

describe('PerspectiveCookieValue', () => {
	it('accepts the two Perspectives and dismissed, nothing else', () => {
		for (const v of ['builder', 'evaluator', 'dismissed']) {
			expect(PerspectiveCookieValue.schema.safeParse(v).success).toBe(true);
		}
		expect(PerspectiveCookieValue.schema.safeParse('neutral').success).toBe(false);
		expect(PerspectiveCookieValue.schema.safeParse(undefined).success).toBe(false);
	});
});
