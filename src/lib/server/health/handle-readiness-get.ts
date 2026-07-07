import { json } from '@sveltejs/kit';

import { buildReadinessResponse } from './build-readiness-response.js';

/**
 * SvelteKit GET handler for the readiness probe (`GET /health/ready`).
 */
export async function handleReadinessGet() {
	const { body, httpStatus } = await buildReadinessResponse();
	return json(body, { status: httpStatus });
}
