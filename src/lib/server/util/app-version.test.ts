import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { appVersion } from './app-version.js';

describe('appVersion', () => {
	it('reads name and version from the working-directory package.json', () => {
		const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
			name: string;
			version: string;
		};

		const version = appVersion();

		expect(version.name).toBe(pkg.name);
		expect(version.version).toBe(pkg.version);
	});
});
