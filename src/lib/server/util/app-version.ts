import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Public shape of the `/version` endpoint. Built from package.json + optional
 * build-time env vars (`GIT_COMMIT`, `BUILT_AT`).
 */
export const VersionBody = ZodFactory(
	z.object({
		name: z.string(),
		version: z.string(),
		commit: z.string().optional(),
		builtAt: z.iso.datetime().optional()
	})
);
export type VersionBody = ReturnType<typeof VersionBody>;

let cached: VersionBody | undefined;

/**
 * Read the application's name + version from package.json. Cached for the
 * lifetime of the process; the file doesn't change at runtime.
 */
export function appVersion(): VersionBody {
	if (cached) return cached;

	// Resolve package.json from the working directory rather than relative to
	// this module. The old `new URL('../../../../package.json', import.meta.url)`
	// worked against the source tree but broke in the adapter-node bundle (the
	// compiled chunk lives at a different depth), making /version and /health
	// 500. `node build` runs from the app root (where package.json sits), as do
	// `vite dev` and vitest.
	const pkgPath = resolve(process.cwd(), 'package.json');
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
		name: string;
		version: string;
	};

	cached = VersionBody({
		name: pkg.name,
		version: pkg.version,
		commit: process.env.GIT_COMMIT || undefined,
		builtAt: process.env.BUILT_AT || undefined
	});

	return cached;
}
