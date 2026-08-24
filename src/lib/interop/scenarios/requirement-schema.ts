import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * RFC 2119 conformance level for a scenario requirement.
 *
 * Deliberately **`MUST | SHOULD` only** — there is no `MAY`. A `MAY` gates
 * nothing and cannot fail, so it contributes no arithmetic to the completion
 * meter while forcing every consumer to carry a third case. The legacy list
 * vocabulary this replaces had one; those rows are dropped at migration rather
 * than carried forward.
 *
 * The roll-up reads: any failing MUST fails the scenario; a failing SHOULD is
 * recorded and shown but does not block.
 */
export const RequirementLevel = ZodFactory(z.enum(['MUST', 'SHOULD']));
export type RequirementLevel = ReturnType<typeof RequirementLevel>;

/** One selectable answer in a `choose` question: a stable value plus its display label. */
export const ChooseOption = ZodFactory(
	z.object({
		/**
		 * The persisted identity. A stored result record keys on this, so changing
		 * a value is a scoring change (and moves the scenario fingerprint).
		 */
		value: z.string().min(1),
		label: z.string().min(1)
	})
);
export type ChooseOption = ReturnType<typeof ChooseOption>;

/**
 * How an attested requirement asks its question. Both kinds are **scored
 * against a concealed right answer**; they differ only in answer shape —
 * binary versus one-of-N.
 *
 * There is deliberately **no free-text kind and no attachment field**, and one
 * must never be added. Asking an operator to transcribe a wallet's error string
 * means recording a lie: one wallet was observed returning a byte-identical
 * generic message for four different situations, naming a false cause in three
 * of them. Every value in a result is a closed enum.
 *
 * `can't tell` is **not** authored here. The runner offers it on every attested
 * requirement, it can never be authored away, and it fails — "my wallet gave me
 * nothing to judge by" is precisely the legibility failure under test.
 */
export const AttestedAnswer = ZodFactory(
	z.discriminatedUnion('kind', [
		/**
		 * True / false. Authored so **`true` is always the expected answer** — an
		 * author wanting the negative rewrites the statement ("The wallet did not
		 * store the credential"). Hence no `expected` field.
		 */
		z.object({ kind: z.literal('affirm') }),
		/**
		 * One of N. Characterises from a closed list — "What did the wallet
		 * display? *nothing · a raw JSON blob · a rendered card · an error
		 * message*".
		 *
		 * `correct` must be one of `options[].value`; that is enforced at catalog
		 * load rather than here, so a bad catalog reports every violation at once
		 * instead of throwing on the first.
		 */
		z.object({
			kind: z.literal('choose'),
			options: z.array(ChooseOption.schema).min(2),
			correct: z.string().min(1)
		})
	])
);
export type AttestedAnswer = ReturnType<typeof AttestedAnswer>;

/**
 * How a requirement is decided.
 *
 * - `automatic` — a pure function over the run's evidence, resolved by
 *   `checkId` from a code registry. This is the escape hatch, and it is a small
 *   one: a function, not a page.
 * - `attested` — the operator answers a quiz question when the step settles.
 *
 * The quiz is not a fallback for checks we wish we could automate. It is the
 * only instrument that measures whether the tool told its operator enough to
 * know what happened — a wallet can behave perfectly and communicate terribly,
 * and no wire-level test can tell the difference.
 */
export const RequirementCheck = ZodFactory(
	z.discriminatedUnion('kind', [
		z.object({ kind: z.literal('automatic'), checkId: z.string().min(1) }),
		z.object({ kind: z.literal('attested'), answer: AttestedAnswer.schema })
	])
);
export type RequirementCheck = ReturnType<typeof RequirementCheck>;

/**
 * One fine-grained thing a scenario measures.
 *
 * **The app keeps exactly one requirement vocabulary**, and this is it —
 * "requirement" is the word procurement and RFP readers use, so no synonym for
 * this concept belongs anywhere in the codebase. Requirements are
 * scenario-local and cite nothing upward; there are no profile requirement ids
 * left to cite.
 */
export const Requirement = ZodFactory(
	z.object({
		/**
		 * Stable, scenario-scoped. Result records key on this, and the scenario
		 * fingerprint covers it — so changing a shipped id drops everyone's
		 * recorded result for that scenario.
		 */
		id: z.string().min(1),
		/** Plain language, second person. Read on a phone, next to a wallet. */
		statement: z.string().min(1),
		level: RequirementLevel.schema,
		check: RequirementCheck.schema
	})
);
export type Requirement = ReturnType<typeof Requirement>;
