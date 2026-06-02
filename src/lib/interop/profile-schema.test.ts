import { describe, expect, it } from 'vitest';

import {
	ChecklistRequirement,
	ChecklistStep,
	Profile,
	WorkflowChecklist
} from './profile-schema.js';

describe('ChecklistRequirement', () => {
	it('parses a valid MUST clause', () => {
		const r = ChecklistRequirement({ level: 'MUST', text: 'Do the thing.' });
		expect(r).toEqual({ level: 'MUST', text: 'Do the thing.' });
	});

	it('rejects an unknown level', () => {
		expect(() => ChecklistRequirement({ level: 'COULD' as 'MUST', text: 'x' })).toThrow();
	});
});

describe('ChecklistStep', () => {
	it('accepts a step with no requirements', () => {
		const step = ChecklistStep({ title: 'Step', summary: 'Summary.', requirements: [] });
		expect(step.requirements).toEqual([]);
	});
});

describe('WorkflowChecklist', () => {
	it('rejects an unknown role enum', () => {
		expect(() =>
			WorkflowChecklist({
				role: 'not-a-role' as 'issuer',
				workflow: 'credential-issuance',
				profile: 'vcalm',
				steps: []
			})
		).toThrow();
	});
});

describe('Profile', () => {
	it('parses a minimal profile', () => {
		const p = Profile({
			id: 'test-v1',
			slug: 'vcalm',
			name: 'Test',
			version: '0.1',
			status: 'draft',
			lastUpdated: '2026-01-01',
			description: 'A test profile.',
			keyComponents: [{ label: 'Suite', value: 'eddsa' }],
			useCases: ['testing'],
			checklists: []
		});
		expect(p.slug).toBe('vcalm');
		expect(p.notes).toBeUndefined();
	});
});
