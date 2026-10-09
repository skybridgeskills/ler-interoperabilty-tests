import { pollExchange } from '$lib/client/exchange-runner/index.js';
import type { ExchangeProtocolId } from '$lib/components/interop/exchange-runner/index.js';

/** The award numbers the client computed from its store — the credential's narrative inputs. */
export type BadgeClaimAward = {
	requirementsMet: number;
	requirementsTotal: number;
	scenarioCount: number;
	claimedAt: string; // ISO
};

/** The one interaction link a claim presents while the wallet accepts the badge. */
export type ClaimLink = {
	exchangeId: string;
	interactionUrl: string;
	protocol: ExchangeProtocolId;
};

/** The error affordance shape `ExchangeRunnerPanel` renders. */
export type ClaimError = { message: string; hint?: string };

export type BadgeClaimCallbacks = {
	/** The interaction link is up; present it to the wallet. */
	onLink: (link: ClaimLink) => void;
	/** Delivery completed. The client never sees the accepted VC — success is delivery. */
	onSettled: () => void;
	/** The claim could not be delivered. NOT a test finding (D8) — offer a retry, diagnose nothing. */
	onFailed: (error: ClaimError) => void;
};

const SERVICES_HINT = 'Run `pnpm turbo dev:full` to start the local DCC dependency services.';
const LOGS_HINT = 'Check the transaction service logs (`docker logs lits-transaction-service`).';

type ClaimResponse = {
	exchangeId: string;
	protocols: Partial<Record<'iu' | 'OID4VCI' | 'OID4VP', string>>;
};

/**
 * Drive a badge claim: POST the dedicated claim endpoint, present the interaction
 * link, and poll the shared exchange endpoint until the wallet accepts.
 *
 * Reuses `pollExchange` **unchanged** with `stepCount: 1, workflow: 'claim'` — a
 * claim is exactly one issuance-exchange lifecycle. It mints through the badge
 * endpoint (not `/api/exchange-runner/create`), so the two registries never
 * meet, and it registers **no** `ScenarioRunRecord`: claiming is not a scenario
 * (D6). Returns a handle whose `stop()` tears the poller down.
 */
export function startBadgeClaim(
	slug: string,
	award: BadgeClaimAward,
	callbacks: BadgeClaimCallbacks
): { stop: () => void } {
	let handle: { stop: () => void } | undefined;
	let stopped = false;

	const stop = () => {
		stopped = true;
		handle?.stop();
		handle = undefined;
	};

	void (async () => {
		const created = await postClaim(slug, award, callbacks.onFailed);
		if (!created || stopped) return;

		const link = pickLink(created.protocols);
		if (!link) {
			callbacks.onFailed({
				message: 'The transaction service returned no interaction link for this claim.',
				hint: 'Point TRANSACTION_SERVICE_URL at a service that speaks OID4VCI or VC-API.'
			});
			return;
		}

		callbacks.onLink({ exchangeId: created.exchangeId, ...link });
		handle = poll(created.exchangeId, callbacks);
	})();

	return { stop };
}

/** Prefer the OID4VCI offer, fall back to the VC-API interaction URL. */
function pickLink(
	protocols: ClaimResponse['protocols']
): { interactionUrl: string; protocol: ExchangeProtocolId } | undefined {
	if (protocols.OID4VCI) return { interactionUrl: protocols.OID4VCI, protocol: 'oid4vci' };
	if (protocols.iu) return { interactionUrl: protocols.iu, protocol: 'vcalm' };
	return undefined;
}

async function postClaim(
	slug: string,
	award: BadgeClaimAward,
	onFailed: (error: ClaimError) => void
): Promise<ClaimResponse | undefined> {
	try {
		const res = await fetch(`/api/badges/${encodeURIComponent(slug)}/claim`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(award)
		});
		if (!res.ok) {
			const failure = (await res.json().catch(() => ({}))) as Partial<ClaimError>;
			onFailed({
				message: failure.message ?? `The claim endpoint responded ${res.status}`,
				hint: failure.hint ?? SERVICES_HINT
			});
			return undefined;
		}
		return (await res.json()) as ClaimResponse;
	} catch (e) {
		onFailed({ message: e instanceof Error ? e.message : String(e), hint: SERVICES_HINT });
		return undefined;
	}
}

function poll(exchangeId: string, callbacks: BadgeClaimCallbacks): { stop: () => void } {
	return pollExchange(
		exchangeId,
		{
			onUpdate: ({ derived }) => {
				if (derived.run === 'complete') callbacks.onSettled();
				else if (derived.run === 'error') {
					callbacks.onFailed({
						message: 'The claim exchange ended in an invalid state.',
						hint: LOGS_HINT
					});
				}
			},
			onError: (e) =>
				callbacks.onFailed({
					message:
						e.kind === 'http-error' ? `Polling responded ${e.status ?? '<no status>'}` : e.message,
					hint: LOGS_HINT
				}),
			onTimeout: () =>
				callbacks.onFailed({
					message: 'The wallet did not complete the claim within the 5-minute window.',
					hint: 'Try again to mint a fresh claim exchange.'
				})
		},
		{ stepCount: 1, workflow: 'claim' }
	);
}
