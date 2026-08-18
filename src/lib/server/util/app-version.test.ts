import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

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

// appVersion() caches at module scope, so re-import a fresh module per case to
// exercise different APP_VERSION values.
async function freshAppVersion() {
	vi.resetModules();
	const mod = await import('./app-version.js');
	return mod.appVersion();
}

describe('appVersion deployedVersion', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('reports deployedVersion from the runtime APP_VERSION env', async () => {
		vi.stubEnv('APP_VERSION', '2026.07.07-3');
		expect((await freshAppVersion()).deployedVersion).toBe('2026.07.07-3');
	});

	it('omits deployedVersion when APP_VERSION is unset', async () => {
		vi.stubEnv('APP_VERSION', '');
		expect((await freshAppVersion()).deployedVersion).toBeUndefined();
	});
});
