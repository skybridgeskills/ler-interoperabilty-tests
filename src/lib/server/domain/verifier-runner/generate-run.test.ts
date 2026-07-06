import { describe, expect, it } from 'vitest';

import { PassKind } from '$lib/interop/verifier-run/index.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import { generateVerifierRun, secureShuffle } from './generate-run.js';

describe('generateVerifierRun', { timeout: 60_000 }, () => {
	const crypto = WalletCrypto();

	it('produces each pass kind exactly once with opaque sequential labels', async () => {
		const run = await generateVerifierRun({ crypto, cryptosuite: 'eddsa-rdfc-2022' });

		expect(run.profile).toBe('ob3-direct-delivery');
		expect(run.workflow).toBe('direct-credential-verification');
		expect(run.cryptosuite).toBe('eddsa-rdfc-2022');
		expect(run.passes).toHaveLength(4);
		expect(run.passes.map((p) => p.label)).toEqual([
			'Credential 1',
			'Credential 2',
			'Credential 3',
			'Credential 4'
		]);
		expect([...run.passes.map((p) => p.kind)].sort()).toEqual([...PassKind.schema.options].sort());
		expect(new Set(run.passes.map((p) => p.passId)).size).toBe(4);
		expect(run.runId).not.toHaveLength(0);
	});

	it('is deterministic under an injected shuffle and id source', async () => {
		let n = 0;
		const reverse = <T>(items: readonly T[]): T[] => [...items].reverse();
		const run = await generateVerifierRun({
			crypto,
			cryptosuite: 'eddsa-rdfc-2022',
			shuffle: reverse,
			newId: () => `id-${++n}`
		});

		expect(run.passes.map((p) => p.kind)).toEqual([...PassKind.schema.options].reverse());
		expect(run.passes.map((p) => p.passId)).toEqual(['id-1', 'id-2', 'id-3', 'id-4']);
		expect(run.runId).toBe('id-5');
		// Labels stay positional, never kind-derived.
		expect(run.passes.map((p) => p.label)).toEqual([
			'Credential 1',
			'Credential 2',
			'Credential 3',
			'Credential 4'
		]);
	});
});

describe('secureShuffle', () => {
	it('permutes without losing or duplicating items', () => {
		const items = ['a', 'b', 'c', 'd', 'e'];
		const shuffled = secureShuffle(items);
		expect([...shuffled].sort()).toEqual(items);
		expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
	});
});
