// Ambient declarations for the @digitalbazaar cryptosuite/multikey packages, which ship no
// TypeScript types. They are used only inside wallet-crypto behind a typed factory; the
// `@interop/*` VC stack supplies the precise types at the issue/verify boundary.
declare module '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
declare module '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
declare module '@digitalbazaar/ed25519-multikey';
