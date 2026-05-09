import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

	const pkgUrl = new URL('../../../../package.json', import.meta.url);
	const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf8')) as {
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
