# The registry holds the payload; the action holds the conduct

- Status: accepted
- Date: 2026-08-22
- Context: exchange-variation provisioning — making every axis the transaction
  service's harness branch supports reachable from a scenario. Three new verify
  variations (`queryLanguage`, `limitDisclosure`, `advertiseCryptosuites`) had
  to be named somewhere, and there were two plausible somewheres.

## Context

A scenario names what an exchange should do through two kinds of handle:

- **Registry ids** — `RecipeId` and `RequestId`, opaque strings the catalog
  carries and `src/lib/server/domain/scenario-runner/` resolves into an unsigned
  credential document or a `vprCredentialType` / `vprContext` / `vprClaims` /
  `trustedIssuers` set. Scenarios stay client-safe data; the documents live
  server-side.
- **Fields on the action itself** — `tamper`, `intent`, `transport`,
  `keyProofSuite`.

Nothing said which handle a _new_ variation should take, and the two answers
diverge sharply. The transaction service's harness branch added three
per-exchange verify variables, and each could plausibly have been folded into the
request registry instead: a `PresentationRequest` already holds everything else
about a verify exchange, and adding `ob3-any-pex` beside `ob3-any` costs one file
and no schema change.

## Decision

**A variation goes on the action when it describes how the exchange is
conducted, and in the registry when it describes what is issued or asked for.**

`request-presentation` therefore gains three optional fields:

```ts
{
  kind: 'request-presentation',
  request: RequestId,
  queryLanguage?: 'dcql' | 'pex',
  limitDisclosure?: 'required' | 'preferred',
  advertiseCryptosuites?: string[]
}
```

None of them changes _what_ is asked for. The same credential is requested
whether the asking is in DCQL or Presentation Exchange; `limit_disclosure` varies
how much of it the verifier insists on; `advertiseCryptosuites` varies what the
verifier says it accepts. All three are conduct.

The rule is stated as a rule, not as a ruling on these three fields, because it
already explains the four that were there — `tamper` corrupts a credential after
signing, `intent` pins issuing crypto, `transport` picks a wire, `keyProofSuite`
picks the suite the suite's own test wallet signs with. None of them is payload,
and none of them is in a registry.

**Wire names keep their prefixes; action names drop them.** The action is already
`request-presentation`, so `queryLanguage` is unambiguous in context;
`verificationExchangeBody` maps it onto `oid4vpQueryLanguage`,
`vprLimitDisclosure` and `vprAdvertiseCryptosuites`, because the transaction
service names those, not us. The mapping is one place.

## Rejected: grow the request registry

Add `ob3-any-pex`, `ob3-any-pex-limited`, `ob3-any-pex-limited-preferred`,
`ob3-any-baited`, and so on. It lost on two counts.

**An unenforceable constraint.** `limitDisclosure` is a DIF Presentation Exchange
constraint; DCQL has no equivalent. Setting it while asking in DCQL produces a
request the service honours in neither language — the scenario measures nothing
while looking like it measured selective disclosure, which is the worst kind of
quiet pass. The catalog can reject that authoring error
(`limit-disclosure-without-pex`) **only because both halves are in one place**.
Split across the action and the registry, nothing sees both, and the rule could
not be written at all. This is the strongest form of argument for the decision:
the rule does not merely accommodate the constraint, it predicts where the
constraint can live.

**Combinatorial illegibility.** The three axes multiply. Two query languages ×
three disclosure settings × any bait set is a registry whose ids encode a truth
table, where the difference between two scenarios is a suffix a reader has to
decode. Naming the axes makes a scenario say what it varies.

## Consequences

- **A future variation has a home without further argument.** Ask whether it
  changes what is asked for. If not, it is a field on the action.
- **The registries stay small and payload-shaped**, which is what keeps them
  resolvable server-side from a client-safe id.
- **Presence on the wire becomes meaningful.** Because the fields are
  `.optional()` upstream with no `.default()` and this suite is the only party
  that sets them, spreading them conditionally means a variable appears in the
  stored `exchange.variables` **if and only if** we sent it and the service knows
  the field. That is what the `*-recorded` automatic checks read, and it is why
  they need no comparison against what was asked and no new evidence field. An
  explicit `undefined` would have destroyed the property.
- **The action union grows rather than the registries.** That is the intended
  direction: `ScenarioAction` is the reviewed escape hatch, and a field on an
  existing kind is a smaller change than a new kind.
- **This says nothing about wallet-borne axes.** Some variations cannot be named
  on either side because the service serves every option and the wallet's choice
  is the measurement — metadata-discovery construction is one. Those are observed
  through evidence (`discoveryElections`), never requested.
