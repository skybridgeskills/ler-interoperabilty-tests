import { describe, expect, it } from 'vitest';

import {
	allStandards,
	citationHref,
	citationText,
	StandardCitation,
	StandardId,
	standardById
} from './standards.js';

describe('the standards register', () => {
	it('has exactly one entry per id', () => {
		expect(allStandards.map((s) => s.id).sort()).toEqual([...StandardId.schema.options].sort());
	});

	it('keeps one https url per standard, never a dated snapshot', () => {
		for (const s of allStandards) {
			expect(s.url).toMatch(/^https:\/\//);
			expect(s.url).not.toMatch(/\/TR\/20\d\d\//);
		}
	});
});

describe('StandardCitation', () => {
	it('accepts a bare anchor and rejects a fragment or a URL', () => {
		expect(
			StandardCitation.schema.safeParse({ standard: 'ob-3', section: 'verification' }).success
		).toBe(true);
		expect(
			StandardCitation.schema.safeParse({ standard: 'ob-3', section: '#verification' }).success
		).toBe(false);
		expect(
			StandardCitation.schema.safeParse({ standard: 'ob-3', section: 'https://x/y' }).success
		).toBe(false);
	});
});

describe('citationHref / citationText', () => {
	it('appends the section and names it', () => {
		const c = { standard: 'oid4vci-1', section: 'section-3.5', label: '§3.5' } as const;
		expect(citationHref(c)).toBe(`${standardById('oid4vci-1').url}#section-3.5`);
		expect(citationText(c)).toBe('OID4VCI 1.0 §3.5');
	});

	it('is the bare document for a document-level citation', () => {
		expect(citationHref({ standard: 'ob-3' })).toBe('https://www.imsglobal.org/spec/ob/v3p0/main/');
		expect(citationText({ standard: 'ob-3' })).toBe('OB 3.0');
	});
});
