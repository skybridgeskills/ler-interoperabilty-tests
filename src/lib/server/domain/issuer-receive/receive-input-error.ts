/**
 * The operator's run-time input could not be engaged at all — a blank paste, a
 * non-URL where a URL was required, or JSON that is not a credential object.
 * Surfaced as a 400 by the receive route.
 *
 * An issuer that merely responds badly is **evidence** (`delivered: false` with
 * a reason, returned 200), never this error. This is only for input the suite
 * cannot even attempt, where no measurement happened at all.
 *
 * Deliberately independent of the legacy `issuer-runner` / `wallet-runner`
 * engines: this shared leaf is one `scenario-runner` can import without pulling
 * in either standing engine, both of which retire in M13.
 */
export class ReceiveInputError extends Error {}
