import { z } from 'zod';

const BaseEnv = z.object({
	CONTEXT: z.enum(['dev', 'test', 'hosted']).default('dev'),
	LOG_LEVEL: z.string().optional()
});
export type BaseEnv = z.infer<typeof BaseEnv>;

/**
 * Parse the deployment-base env vars. Throws on unknown `CONTEXT` values; this
 * is intentional — we want a fast, loud failure at boot rather than a partial
 * service that misroutes requests.
 */
export function parseBaseEnv(env: Record<string, unknown>): BaseEnv {
	return BaseEnv.parse(env);
}
