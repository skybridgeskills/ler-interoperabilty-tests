import { cryptosuite as ecdsaRdfc2019 } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey';
import { cryptosuite as eddsaRdfc2022 } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
import * as EcdsaMultikey from '@interop/ecdsa-multikey';

/**
 * Data-integrity cryptosuites the test wallet can sign/verify with, matching the
 * `data-integrity-cryptosuites` additive profile bundle. `eddsa-rdfc-2022` uses Ed25519;
 * `ecdsa-rdfc-2019` uses P-256.
 */
export type WalletCryptosuite = 'eddsa-rdfc-2022' | 'ecdsa-rdfc-2019';

/** A Multikey library (generate / from) for a given cryptosuite's key type. */
export type MultikeyLib = {
	generate: (options?: Record<string, unknown>) => Promise<MultikeyPair>;
	from: (key: unknown) => Promise<MultikeyPair>;
};

/** A generated/bound Multikey pair (signer-capable when it holds private material). */
export type MultikeyPair = {
	id?: string;
	controller?: string;
	signer: () => unknown;
	export: (options: Record<string, unknown>) => Record<string, unknown>;
};

type SuiteConfig = {
	cryptosuite: unknown;
	multikey: MultikeyLib;
	/** Multibase multikey prefix used to register did:key resolution. */
	multibaseHeader: string;
	/** ECDSA curve (only meaningful for ecdsa-rdfc-2019). */
	curve?: string;
};

const SUITES: Record<WalletCryptosuite, SuiteConfig> = {
	'eddsa-rdfc-2022': {
		cryptosuite: eddsaRdfc2022,
		multikey: Ed25519Multikey as unknown as MultikeyLib,
		multibaseHeader: 'z6Mk'
	},
	'ecdsa-rdfc-2019': {
		cryptosuite: ecdsaRdfc2019,
		multikey: EcdsaMultikey as unknown as MultikeyLib,
		multibaseHeader: 'zDna',
		curve: 'P-256'
	}
};

/** Look up the suite config (cryptosuite instance + key library) for a cryptosuite name. */
export function suiteConfigFor(name: WalletCryptosuite): SuiteConfig {
	return SUITES[name];
}

/** All supported cryptosuite names (used to register did:key resolution for each). */
export const WALLET_CRYPTOSUITES = Object.keys(SUITES) as WalletCryptosuite[];
