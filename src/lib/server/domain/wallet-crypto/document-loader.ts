import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey';
import * as didMethodKey from '@interop/did-method-key';
import * as EcdsaMultikey from '@interop/ecdsa-multikey';
import { securityLoader } from '@interop/security-document-loader';

/** A JSON-LD document loader result. */
export type LoadedDocument = {
	contextUrl: string | null;
	documentUrl: string;
	document: unknown;
};

export type DocumentLoader = (url: string) => Promise<LoadedDocument>;

/** The configured did:key driver (resolves did:key for both wallet cryptosuites). */
export type DidKeyDriver = {
	get: (options: { did?: string; url?: string }) => Promise<unknown>;
	fromKeyPair: (options: {
		verificationKeyPair: unknown;
	}) => Promise<{ didDocument: { id: string; verificationMethod: { id: string }[] } }>;
};

/**
 * Build a did:key driver that resolves both Ed25519 (`z6Mk`) and P-256 (`zDna`) keys, plus a
 * document loader that resolves did:key DIDs/fragments and falls back to the bundled security
 * contexts (VC 2.0, data-integrity, multikey, status list, Open Badges 3.0).
 *
 * Server-only — never import from client code.
 */
export function buildWalletDocumentLoader(): {
	driver: DidKeyDriver;
	documentLoader: DocumentLoader;
} {
	const driver = didMethodKey.driver() as DidKeyDriver & {
		use: (options: Record<string, unknown>) => void;
	};
	driver.use({ multibaseMultikeyHeader: 'z6Mk', fromMultibase: Ed25519Multikey.from });
	driver.use({ multibaseMultikeyHeader: 'zDna', fromMultibase: EcdsaMultikey.from });

	// The bundled security loader provides the VC 2.0, data-integrity, multikey, and status-list
	// contexts. Credentials that add the Open Badges 3.0 context rely on it being resolvable via
	// this loader's bundle (M3/M4 issue OB3 credentials against it).
	const base = securityLoader().build() as DocumentLoader;

	const documentLoader: DocumentLoader = async (url: string) => {
		if (url.startsWith('did:key:')) {
			const document = url.includes('#')
				? await driver.get({ url })
				: await driver.get({ did: url });
			return { contextUrl: null, documentUrl: url, document };
		}
		return base(url);
	};

	return { driver, documentLoader };
}
