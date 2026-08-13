import { minimalOb3 } from './recipes/minimal-ob3.js';
import { ob3Expired } from './recipes/ob3-expired.js';

/**
 * A named, unsigned credential document a scenario can ask the mint path to
 * issue.
 *
 * The claim workflow's template is `{{{vc}}}` — a Handlebars triple-stache — so
 * **the caller's document _is_ the credential**. Everything a recipe writes
 * survives to the wallet except four fields the services own:
 * `credentialSubject.id`, `credentialStatus`, `issuer.id` and `proof`. Expiry,
 * not-yet-valid, rich achievement content, images, alignments and arbitrary
 * extra fields therefore all cost nothing to author.
 *
 * A recipe **must not hardcode the credential `id`**. The status service's
 * allocate is idempotency-guarded per credential id, so a reused id returns
 * `credential-already-allocated` and the claim 500s. `credentialId` is minted
 * fresh per exchange and handed in.
 */
export type CredentialRecipe = {
	id: string;
	/** One line, for authoring and for a scenario step's setup copy. */
	summary: string;
	build(args: { credentialId: string }): Record<string, unknown>;
};

/**
 * Every credential recipe a scenario may name, keyed by id. Adding a recipe is
 * a file under `recipes/` plus an entry here — no other code changes, because
 * a scenario reaches recipes only by id.
 */
export const credentialRecipes: Record<string, CredentialRecipe> = {
	[minimalOb3.id]: minimalOb3,
	[ob3Expired.id]: ob3Expired
};

/**
 * Resolve a recipe id, or `undefined` when nothing is registered under it —
 * the same shape as the `interop/accessors` lookups. Callers at a request
 * boundary turn `undefined` into a typed 400 rather than an exception.
 */
export function recipeById(id: string): CredentialRecipe | undefined {
	return credentialRecipes[id];
}

/** Every registered recipe id, for error messages and authoring tools. */
export function allRecipeIds(): string[] {
	return Object.keys(credentialRecipes);
}
