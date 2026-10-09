const KEY = 'lits.filterIntro';

/**
 * Whether the homepage's inline first step has been skipped, closed or finished
 * in this session. **sessionStorage, not localStorage**: a new session with an
 * empty selection is shown the first step again. Browser-only; storage that
 * throws (private modes) reads as "not done" and writes are dropped.
 */
export function filterIntroDone(): boolean {
	try {
		return sessionStorage.getItem(KEY) === 'done';
	} catch {
		return false;
	}
}

/** Record that the first step is over for this session — Skip, ✕, finishing, or Clear. */
export function markFilterIntroDone(): void {
	try {
		sessionStorage.setItem(KEY, 'done');
	} catch {
		// Without storage the step simply shows again next load.
	}
}
