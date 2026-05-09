import { json } from '@sveltejs/kit';

import { appVersion } from '$lib/server/util/app-version.js';

export function GET() {
	return json(appVersion());
}
