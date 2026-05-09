import { describe, it, expect } from 'vitest';

import { panic, panicLines } from './panic.js';

describe('panic', () => {
	it('throws error with string message', () => {
		expect(() => {
			panic('Test error');
		}).toThrow('Test error');
	});

	it('throws error with Error object', () => {
		const error = new Error('Test error');
		expect(() => {
			panic(error);
		}).toThrow(error);
	});
});

describe('panicLines', () => {
	it('throws error with multiple lines', () => {
		expect(() => {
			panicLines('Line 1', 'Line 2', 'Line 3');
		}).toThrow('Line 1\nLine 2\nLine 3');
	});

	it('throws error with single line', () => {
		expect(() => {
			panicLines('Single line');
		}).toThrow('Single line');
	});
});
