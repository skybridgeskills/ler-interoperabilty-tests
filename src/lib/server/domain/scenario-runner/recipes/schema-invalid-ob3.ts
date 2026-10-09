import type { CredentialRecipe } from '../credential-recipes.js';

import { minimalOb3 } from './minimal-ob3.js';

/**
 * {@link minimalOb3} with the Achievement's **required `criteria` removed** —
 * OB3-invalid on schema, yet otherwise well-formed.
 *
 * The defect is in the document, not the proof: `criteria` is deleted *before*
 * signing, so the data-integrity proof verifies over the exact (schema-invalid)
 * document handed out. A conformant verifier must reject it on schema
 * validation, not on the signature — which is the distinction the verifier
 * acceptance scenario measures.
 */
export const schemaInvalidOb3: CredentialRecipe = {
	id: 'schema-invalid-ob3',
	summary: 'An Open Badges credential missing the Achievement’s required `criteria`.',
	build: (args) => {
		const doc = minimalOb3.build(args);
		const subject = doc.credentialSubject as { achievement: Record<string, unknown> };
		delete subject.achievement.criteria;
		return doc;
	}
};
