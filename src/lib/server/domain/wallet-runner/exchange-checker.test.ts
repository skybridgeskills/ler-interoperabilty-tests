import { describe, expect, it } from 'vitest';

import { ExchangeChecker } from './exchange-checker.js';
import type { WalletCheckCtx, WalletCheckFn } from './wallet-check.js';

const VP_CRYPTOSUITE_ID =
	'data-integrity-cryptosuites.wallet.credential-acceptance.producer.vp-cryptosuite-supported';
const KEY_TYPE_ID =
	'data-integrity-cryptosuites.wallet.credential-acceptance.producer.key-type-matches';

const ctx: WalletCheckCtx = {
	profile: 'vcalm',
	exchange: { state: 'complete' },
	credential: { proof: { cryptosuite: 'eddsa-rdfc-2022' } },
	verify: { verified: true, cryptosuite: 'eddsa-rdfc-2022' }
};

describe('ExchangeChecker', () => {
	it('includes base + data-integrity additive groups; runs registered checks, n/a for the rest', () => {
		const registry: Record<string, WalletCheckFn> = {
			[VP_CRYPTOSUITE_ID]: () => ({ status: 'pass', message: 'signed with eddsa-rdfc-2022' })
		};
		const report = ExchangeChecker(registry).run({
			role: 'wallet',
			workflow: 'credential-acceptance',
			profile: 'vcalm',
			ctx
		});

		expect(
			report.groups.some((g) => g.checklist.kind === 'base' && g.checklist.profileSlug === 'vcalm')
		).toBe(true);

		const additive = report.groups.find((g) => g.checklist.kind === 'additive');
		expect(additive).toBeDefined();
		expect(additive!.outcomes.find((o) => o.id === VP_CRYPTOSUITE_ID)?.status).toBe('pass');
		// A real additive id with no registered check resolves to n/a.
		expect(additive!.outcomes.find((o) => o.id === KEY_TYPE_ID)?.status).toBe('n/a');
		// Base vcalm requirements carry no ids -> all n/a.
		const base = report.groups.find((g) => g.checklist.kind === 'base');
		expect(base!.outcomes.every((o) => o.status === 'n/a')).toBe(true);

		expect(report.verified).toBe(true);
	});

	it('a failing MUST flips verified to false', () => {
		const registry: Record<string, WalletCheckFn> = {
			[VP_CRYPTOSUITE_ID]: () => ({ status: 'fail', message: 'unsupported cryptosuite' })
		};
		const report = ExchangeChecker(registry).run({
			role: 'wallet',
			workflow: 'credential-acceptance',
			profile: 'vcalm',
			ctx
		});
		expect(report.verified).toBe(false);
	});

	it('an empty registry yields an all-n/a report that still verifies', () => {
		const report = ExchangeChecker({}).run({
			role: 'wallet',
			workflow: 'credential-acceptance',
			profile: 'vcalm',
			ctx
		});
		expect(report.verified).toBe(true);
		expect(report.groups.flatMap((g) => g.outcomes).every((o) => o.status === 'n/a')).toBe(true);
	});
});
