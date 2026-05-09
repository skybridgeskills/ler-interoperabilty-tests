import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { appVersion } from '$lib/server/util/app-version.js';

export function GET() {
	// Force the AppContext access path. Throws if hooks.server.ts is misconfigured;
	// surfaces faster than waiting for the first real request to fail.
	appContext();
	return json({ status: 'ok', version: appVersion() });
}
