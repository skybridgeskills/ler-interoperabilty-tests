import type { HealthStatus } from './health-check.js';

export interface ReadinessComponent {
	status: HealthStatus;
	durationMs: number;
	error?: string;
	details?: Record<string, unknown>;
}

export interface ReadinessResponse {
	status: HealthStatus;
	'service.name': string;
	'service.version': string;
	'deployment.environment': string;
	startupTime: string;
	timestamp: string;
	components: Record<string, ReadinessComponent>;
}

export interface ReadinessHttpResult {
	body: ReadinessResponse;
	httpStatus: 200 | 503;
}
