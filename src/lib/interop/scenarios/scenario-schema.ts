import { z } from 'zod';

import { RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { Membership } from './membership.js';
import { Requirement } from './requirement-schema.js';

/** kebab-case, the shape every slug in this app takes. */
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * URL slug for a scenario — `oid4-wallet-acceptance`.
 *
 * A validated string rather than a `z.enum`, unlike `ProfileSlug` and friends:
 * the catalog is meant to grow to dozens of scenarios, and an enum maintained
 * in lockstep with the registry would be pure duplication. Uniqueness is
 * enforced at catalog load instead.
 */
export const ScenarioSlug = ZodFactory(z.string().regex(KEBAB));
export type ScenarioSlug = ReturnType<typeof ScenarioSlug>;

/**
 * Id of a credential recipe — the unsigned document a scenario asks the mint
 * path to issue. Opaque here on purpose: the registry it keys into is server
 * code, and this module is client-safe.
 */
export const RecipeId = ZodFactory(z.string().regex(KEBAB));
export type RecipeId = ReturnType<typeof RecipeId>;

/** Id of a presentation request. Opaque here for the same reason as {@link RecipeId}. */
export const RequestId = ZodFactory(z.string().regex(KEBAB));
export type RequestId = ReturnType<typeof RequestId>;

/**
 * A pinned `(cryptosuite, didMethod)` pair.
 *
 * **Absent means elective**, present means pinned. Election already exists in
 * the backend — the transaction service ranks issuer instances by the wallet's
 * advertised suites — so a scenario that does not care simply omits this and
 * lets the deployment choose.
 *
 * The runner resolves it behind a `resolveIssuingContext` seam, so the
 * substrate can move from a tenant map to a future transaction-service API
 * without touching a single scenario. A pair the deployment cannot serve
 * renders **disabled with a typed reason and does not shrink the completion
 * denominator** — the badge is blocked instead, because a shrinking denominator
 * would let two deployments issue badges that look identical and mean different
 * things.
 */
export const IssuingIntent = ZodFactory(
	z.object({
		cryptosuite: z.string().min(1),
		didMethod: z.string().min(1)
	})
);
export type IssuingIntent = ReturnType<typeof IssuingIntent>;

/**
 * What a step does. A closed, small union covering every runnable page shape in
 * the suite today, and nothing else.
 *
 * **Extending this union is the only escape hatch** — reviewed once, reusable
 * forever. If a scenario cannot be expressed, the fix is a new kind here, never
 * a bespoke page that forks the result shape.
 */
export const ScenarioAction = ZodFactory(
	z.discriminatedUnion('kind', [
		/** Mint a `claim` exchange, render its link, poll until it settles. */
		z.object({
			kind: z.literal('issue'),
			credential: RecipeId.schema,
			/**
			 * Corrupt the credential **after signing**, before delivery. `proof`
			 * flips one character mid-`proofValue` (length and multibase prefix
			 * preserved, so it fails as a *signature*, not a parse); `claim`
			 * appends to a signature-covered value and leaves the proof untouched.
			 * A wallet that only checks a proof is present and well-formed passes
			 * the first and fails the second.
			 */
			tamper: z.enum(['proof', 'claim']).optional(),
			intent: IssuingIntent.schema.optional()
		}),
		/** Mint a `verify` exchange and poll for the presentation. */
		z.object({ kind: z.literal('request-presentation'), request: RequestId.schema }),
		/** File download / copy-paste. No exchange is minted. */
		z.object({
			kind: z.literal('deliver-direct'),
			credential: RecipeId.schema,
			intent: IssuingIntent.schema.optional()
		})
	])
);
export type ScenarioAction = ReturnType<typeof ScenarioAction>;

/**
 * One ordered step of a scenario.
 *
 * A step with no `action` is a pure question step — a debrief. Steps exist for
 * **sequence**, not to subdivide a measurement: a joint measurement across
 * several passes is one measurement, and therefore one scenario.
 */
export const ScenarioStep = ZodFactory(
	z.object({
		/** Stable, scenario-scoped. Run evidence is keyed by it. */
		id: z.string().min(1),
		title: z.string().min(1),
		summary: z.string(),
		action: ScenarioAction.schema.optional(),
		/**
		 * Contiguous shuffled steps permute together, so a discrimination
		 * scenario's passes cannot be learned by position.
		 */
		shuffle: z.literal(true).optional(),
		requirements: z.array(Requirement.schema)
	})
);
export type ScenarioStep = ReturnType<typeof ScenarioStep>;

/**
 * A small, subtle test with fine-grained requirements — the first-class
 * runnable concept, and the row a completion group renders.
 *
 * **A scenario is one measurement.** It replaces `(role, workflow, profile)` as
 * the runnable unit; `workflow` stays a six-way taxonomy that groups the
 * catalog and **never constrains what a step's action may do**. A round-trip
 * scenario registers under the workflow it is *about* and still mints a
 * verification exchange partway through.
 *
 * Two fields a reader may expect are deliberately absent:
 *
 * - **No `version`.** Drift is a *derived* fingerprint over scoring-relevant
 *   content ({@link scenarioFingerprint}), because a hand-maintained integer
 *   fails dishonestly — an author edits a right answer, forgets to bump, and a
 *   stored `passed` now claims a correct answer to a question that changed.
 * - **No scenario "type".** "Integration" versus "discrimination" is authoring
 *   vocabulary only.
 */
export const Scenario = ZodFactory(
	z.object({
		slug: ScenarioSlug.schema,
		name: z.string().min(1),
		/** One line, shown on the catalog row. Cosmetic — outside the fingerprint. */
		blurb: z.string(),
		role: RoleSlug.schema,
		/** Taxonomy only. Never a constraint on what the steps may do. */
		workflow: WorkflowSlug.schema,
		/** Exactly one names a base profile; any number may name additives. */
		memberships: z.array(Membership.schema).min(1),
		/**
		 * Neutral noun for a shuffled step, rendered positionally as
		 * `${shuffleLabel} ${n}` in RUN order — "Credential 1", "Credential 2".
		 *
		 * A shuffled step's authored `title` is an answer key: "Offer an expired
		 * credential" tells the operator exactly what they are being asked to
		 * judge. The page therefore never renders `title` for a shuffled step,
		 * and this is what it renders instead. The verifier flow already does
		 * this by assigning `PassDefinition.label = "Credential 1"` at
		 * generation time; this gives scenario authors the same vocabulary.
		 *
		 * Presentation only, and therefore OUTSIDE the fingerprint — renaming
		 * the label must not cost anyone their results.
		 */
		shuffleLabel: z.string().min(1).optional(),
		steps: z.array(ScenarioStep.schema).min(1)
	})
);
export type Scenario = ReturnType<typeof Scenario>;
