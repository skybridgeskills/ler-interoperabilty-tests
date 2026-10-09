import { describe, expect, it } from 'vitest';

import { workflowBySlug } from './accessors.js';
import { allWorkflows } from './workflows.js';

describe('allWorkflows', () => {
	it('has exactly 6 workflows', () => {
		expect(allWorkflows).toHaveLength(6);
	});

	it('lists the canonical slug set', () => {
		expect(new Set(allWorkflows.map((w) => w.slug))).toEqual(
			new Set([
				'credential-issuance',
				'credential-acceptance',
				'credential-request-and-verification',
				'credential-presentation',
				'direct-credential-issuance',
				'direct-credential-verification'
			])
		);
	});
});

describe('workflowBySlug', () => {
	it('returns undefined for an unknown slug', () => {
		expect(workflowBySlug('made-up')).toBeUndefined();
	});
});
