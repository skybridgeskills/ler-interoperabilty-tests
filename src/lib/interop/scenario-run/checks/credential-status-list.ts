import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The credential carries a Bitstring Status List entry. Ported 1:1 from the
 * issuer engine's `bitstring-status-list-entry` / `status-list` rows, including
 * the live pages' honesty caveat: this is a **structural** check — the status
 * list itself is not fetched, so a well-formed entry pointing at nothing still
 * passes here.
 */
export const credentialStatusList: AutomaticCheck = {
	id: 'credential-status-list',
	summary: 'The credential carries a Bitstring Status List entry.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		const status = credential.credentialStatus;
		if (!status || typeof status !== 'object' || Array.isArray(status)) {
			return { met: false, detail: 'The credential carries no `credentialStatus` entry.' };
		}
		const entry = status as Record<string, unknown>;
		const type = entry.type;
		const typeOk =
			type === 'BitstringStatusListEntry' ||
			(Array.isArray(type) && type.includes('BitstringStatusListEntry'));
		if (!typeOk) {
			return {
				met: false,
				detail: '`credentialStatus.type` must include `BitstringStatusListEntry`.'
			};
		}
		if (typeof entry.statusListCredential !== 'string') {
			return { met: false, detail: '`credentialStatus.statusListCredential` is missing.' };
		}
		if (typeof entry.statusListIndex !== 'string') {
			return { met: false, detail: '`credentialStatus.statusListIndex` is missing.' };
		}
		return {
			met: true,
			detail:
				'A Bitstring Status List entry is present — structure only; the status list itself is not fetched.'
		};
	}
};
