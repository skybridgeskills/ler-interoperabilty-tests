import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';
import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';
import type { Oid4IssuerFlowObservations } from '$lib/server/domain/wallet-client/drivers/oid4-issuer-flow.js';
import type { IssuerFlowObservations } from '$lib/server/domain/wallet-client/drivers/vcalm-issuer-flow.js';
import type { VerifyResult } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Server-side mappers that normalize each issuer flow's protocol-shaped
 * observations into the client-safe {@link WalletActivity} / {@link WalletArtifact}
 * story model. VCALM has no transcript and OID4's is protocol-shaped; these
 * mappers hide that asymmetry so all three flows speak one status vocabulary.
 *
 * Non-run steps (steps skipped because the run was `blocked` earlier) are
 * **omitted** rather than emitted as `skipped` — matching the pending
 * convention the runnable checklist already uses. Because observations are
 * filled progressively, absence of an observation is exactly "did not run".
 */

/** Coarse run outcome the mappers read (never mutated). */
type RunMeta = { blocked: boolean; stoppedAtStep?: number };

// ── VCALM ──────────────────────────────────────────────────────────────────

/**
 * Map VCALM issuer-flow observations to an ordered activity list. Emits, in
 * order and only for steps that ran: fetch-interaction, request-DIDAuth,
 * authenticate-and-receive (interactions), then a verify-proof check.
 * `stepIndex` cross-links to the base VCALM checklist steps
 * (interaction → 0, DIDAuth → 2, delivery/verify → 3).
 */
export function vcalmActivity(
	obs: IssuerFlowObservations,
	_run: RunMeta = { blocked: false }
): WalletActivity[] {
	const entries: WalletActivity[] = [];

	if (obs.interaction) {
		const ok = obs.interaction.ok && !!obs.interaction.vcapiUrl;
		entries.push({
			id: 'vcalm.interaction',
			kind: 'interaction',
			label: 'Fetched interaction',
			status: ok ? 'ok' : 'fail',
			detail: ok
				? obs.interaction.vcapiUrl
				: (obs.interaction.error ?? 'No `vcapi` URL discovered in the interaction protocols.'),
			stepIndex: 0
		});
	}

	if (obs.didAuth) {
		const ok = !!obs.didAuth.challenge;
		entries.push({
			id: 'vcalm.didauth',
			kind: 'interaction',
			label: 'Requested DIDAuth challenge',
			status: ok ? 'ok' : 'fail',
			detail: ok ? undefined : obs.didAuth.error,
			stepIndex: 2
		});
	}

	if (obs.delivery) {
		const ok = obs.delivery.credential !== undefined;
		entries.push({
			id: 'vcalm.delivery',
			kind: 'interaction',
			label: 'Authenticated + received credential',
			status: ok ? 'ok' : 'fail',
			detail: ok ? obs.delivery.holderDid : obs.delivery.error,
			stepIndex: 3
		});
	}

	if (obs.verify) entries.push(verifyEntry(obs.verify, 3));

	return entries;
}

// ── OID4VCI ─────────────────────────────────────────────────────────────────

/** Friendly label + base OID4 checklist step for each transcript observation. */
const OID4_STEP: Record<string, { label: string; stepIndex: number }> = {
	offer: { label: 'Fetched credential offer', stepIndex: 0 },
	'issuer-metadata': { label: 'Fetched issuer metadata', stepIndex: 0 },
	'as-metadata': { label: 'Fetched authorization-server metadata', stepIndex: 0 },
	token: { label: 'Redeemed pre-authorized code for a token', stepIndex: 1 },
	nonce: { label: 'Fetched credential nonce', stepIndex: 1 },
	credential: { label: 'Requested + received credential', stepIndex: 2 }
};

/**
 * Map OID4VCI issuer-flow observations to an ordered activity list. Drives the
 * interaction entries off the driver's ordered `transcript` (secrets already
 * redacted upstream — the access token never reaches `detail`), then appends
 * the verify-proof check.
 */
export function oid4Activity(
	obs: Oid4IssuerFlowObservations,
	_run: RunMeta = { blocked: false }
): WalletActivity[] {
	const entries: WalletActivity[] = obs.transcript.map((step, i) => {
		const meta = OID4_STEP[step.name] ?? { label: step.name, stepIndex: 2 };
		return {
			id: `oid4.${step.name}.${i}`,
			kind: 'interaction' as const,
			label: meta.label,
			status: step.ok ? ('ok' as const) : ('fail' as const),
			detail: step.ok ? undefined : step.error,
			stepIndex: meta.stepIndex
		};
	});

	if (obs.verify) entries.push(verifyEntry(obs.verify, 2));

	return entries;
}

// ── Direct delivery (paste-and-verify) ───────────────────────────────────────

/**
 * Map a direct-issuance {@link IssuerRunnerReport} to a light activity list:
 * the pasted credential is loaded (`info`), verifier-core is run (`ok`/`fail`
 * from `report.verified`), then conformance checks (`ok`/`fail` from the
 * combined failing-MUST count). Detailed per-requirement results live in the
 * checklist, not here.
 */
export function directDeliveryActivity(report: IssuerRunnerReport): WalletActivity[] {
	const failingMustCount = report.groups
		.flatMap((g) => g.outcomes)
		.filter((o) => o.level === 'MUST' && o.status === 'fail').length;

	return [
		{
			id: 'direct.loaded',
			kind: 'interaction',
			label: 'Loaded delivered credential',
			status: 'info'
		},
		{
			id: 'direct.verify',
			kind: 'check',
			label: 'Ran verifier-core',
			status: report.verified ? 'ok' : 'fail',
			detail: report.fatalError?.message
		},
		{
			id: 'direct.conformance',
			kind: 'check',
			label: 'Ran conformance checks',
			status: failingMustCount === 0 ? 'ok' : 'fail',
			detail:
				failingMustCount === 0
					? undefined
					: `${failingMustCount} MUST requirement${failingMustCount === 1 ? '' : 's'} failed.`
		}
	];
}

// ── Artifact ─────────────────────────────────────────────────────────────────

/**
 * Summarize a received/pasted credential as a display-oriented
 * {@link WalletArtifact}. Returns `undefined` when no credential was produced.
 * `verified` comes from `verify?.verified` (direct delivery passes a
 * `{ verified }` shape derived from its report).
 */
export function credentialArtifact(
	credential: unknown,
	verify?: VerifyResult
): WalletArtifact | undefined {
	if (credential === undefined || credential === null) return undefined;
	const cred = asRecord(credential);
	if (!cred) return undefined;

	const achievement = asRecord(asRecord(cred.credentialSubject)?.achievement);
	const title =
		strOf(achievement?.name) ??
		strOf(cred.name) ??
		strOf(cred.description) ??
		'Received credential';

	return {
		kind: 'credential',
		title,
		issuer: issuerLabel(cred.issuer),
		issuanceDate: strOf(cred.validFrom) ?? strOf(cred.issuanceDate),
		verified: verify?.verified ?? false,
		types: typeList(cred.type)
	};
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Shared verify-proof check entry (VCALM + OID4). Unverified reads as `fail`. */
function verifyEntry(verify: VerifyResult, stepIndex: number): WalletActivity {
	return {
		id: 'verify',
		kind: 'check',
		label: 'Verified credential proof',
		status: verify.verified ? 'ok' : 'fail',
		detail: verify.verified ? verify.cryptosuite : verify.errors?.[0],
		stepIndex
	};
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function strOf(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Credential `issuer` may be a DID string or a `{ id, name }` object. */
function issuerLabel(issuer: unknown): string | undefined {
	if (typeof issuer === 'string') return strOf(issuer);
	const obj = asRecord(issuer);
	return strOf(obj?.name) ?? strOf(obj?.id);
}

/** Normalize `type` (string or array) to a string[] of non-empty entries. */
function typeList(type: unknown): string[] | undefined {
	const arr = Array.isArray(type) ? type : type === undefined ? [] : [type];
	const list = arr.filter((t): t is string => typeof t === 'string' && t.length > 0);
	return list.length ? list : undefined;
}
