import type { ScenarioStep } from '$lib/interop/scenarios/index.js';

/**
 * Put a scenario's steps into run order by permuting each contiguous run of
 * `shuffle: true` steps, leaving every other step where it is.
 *
 * This exists so a discrimination scenario's passes **cannot be learned by
 * position**. An operator who works out that the second credential is always the
 * expired one is no longer answering the question the scenario asks.
 *
 * Seeded, so a run is reproducible from its record and deterministic under test.
 * Catalog validation guarantees at most one shuffled run per scenario, but this
 * handles several correctly anyway — it permutes each independently rather than
 * moving a step across an unshuffled boundary.
 */
export function shuffleSteps(steps: ScenarioStep[], seed: string): ScenarioStep[] {
	const random = mulberry32(hashSeed(seed));
	const ordered = [...steps];

	let runStart: number | undefined;
	for (let i = 0; i <= ordered.length; i++) {
		const shuffled = i < ordered.length && ordered[i].shuffle === true;
		if (shuffled && runStart === undefined) runStart = i;
		if (!shuffled && runStart !== undefined) {
			permuteInPlace(ordered, runStart, i, random);
			runStart = undefined;
		}
	}
	return ordered;
}

/** Fisher-Yates over `[from, to)`, using the caller's seeded source. */
function permuteInPlace(
	items: ScenarioStep[],
	from: number,
	to: number,
	random: () => number
): void {
	for (let i = to - 1; i > from; i--) {
		const j = from + Math.floor(random() * (i - from + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
}

/** djb2 over the seed string → uint32. Non-cryptographic; this is a shuffle, not a secret. */
function hashSeed(seed: string): number {
	let hash = 5381;
	for (let i = 0; i < seed.length; i++) {
		hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
	}
	return hash;
}

/** mulberry32 — a small, fast, well-distributed seeded PRNG. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
