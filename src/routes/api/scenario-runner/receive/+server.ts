import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { ReceiveInputError } from '$lib/server/domain/issuer-receive/index.js';

import { ReceiveRequest } from './receive-schemas.js';

/**
 * Receive one credential from the operator's **own issuer**, for a
 * `receive-from-issuer` scenario step. The suite is the recipient: it takes the
 * operator's run-time input — a pasted credential, a VC-API interaction URL, or
 * an `openid-credential-offer://` URL — engages whatever the transport requires,
 * and returns the received credential plus a client-safe wire summary.
 *
 * An issuer that merely responds badly is honest evidence (`delivered: false`
 * with a reason), returned 200 so the operator can retry with fresh input; only
 * input the suite cannot attempt at all is a 400. Nothing here resolves an
 * issuing context: the suite mints nothing in an issuer scenario, so there is no
 * `IssuingIntent` to pin — the only crypto choice is the suite's own holder
 * key-proof suite, generated locally and therefore always servable.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { scenarioRunner, logger } = appContext();

	const parsed = ReceiveRequest.schema.safeParse(await readJsonBody(request));
	if (!parsed.success) {
		return json(
			{
				code: 400,
				message: 'Unrecognised receive request',
				hint: 'Send { transport: "direct" | "vcalm" | "oid4vci", input, keyProofSuite? }.'
			},
			{ status: 400 }
		);
	}
	const action = parsed.data;

	try {
		const { flow, credential, delivered, error } = await scenarioRunner.receive({
			transport: action.transport,
			keyProofSuite: action.keyProofSuite ?? 'eddsa-rdfc-2022',
			input: action.input
		});
		return json({ flow, credential, delivered, error });
	} catch (e) {
		if (e instanceof ReceiveInputError) {
			return json({ code: 400, message: e.message }, { status: 400 });
		}
		const cause = e instanceof Error ? e.message : String(e);
		logger.error({ err: cause }, 'receive-from-issuer failed');
		return json(
			{ code: 500, message: 'Could not receive a credential from the issuer.', cause },
			{ status: 500 }
		);
	}
};

/** Parse a JSON body, treating an empty/absent/invalid body as `{}`. */
async function readJsonBody(request: Request): Promise<unknown> {
	try {
		const text = await request.text();
		return text.trim() ? JSON.parse(text) : {};
	} catch {
		return {};
	}
}
