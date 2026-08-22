# Claim-based holder binding via an unhashed `IdentityObject`

- Status: accepted
- Date: 2026-08-21
- Context: the M11 P5 review gate — the first run of the three issuer
  scenarios against a real issuer showed the email identifier check
  reading the wrong part of the credential.
- Supersedes: the M11 resolution recorded in `credential-subject-email`,
  which made a bare email address a **fail** because the requirement was a
  `mailto:` URI in `credentialSubject.id`.

## Context

The `ob3-direct-delivery` profile issues credentials to people, and those
people are identified by email address. Open Badges 3.0 offers two places
to put that:

1. **`credentialSubject.id` as a `mailto:` URI** — the VC Data Model's
   subject identifier, reused for an email.
2. **`credentialSubject.identifier` as an `IdentityObject`** (OB 3.0
   § B.1.12) — the structure Open Badges defines specifically for
   describing who the recipient of an achievement is:

   ```json
   "identifier": [{
     "type": "IdentityObject",
     "identityHash": "somebody@somewhere.com",
     "identityType": "emailAddress",
     "hashed": false
   }]
   ```

The suite measured (1). The engine had returned `warn` for a bare
`learner@example.edu` — an email, but not a URI — and M11 resolved that
`warn` to a **fail**, on the reasoning that a MUST cannot pass on
something other than what it asks for. The reasoning was sound; the
requirement it was applied to was wrong.

`IdentityObject` also raises a second question the `mailto:` framing never
had to answer: `hashed` is a required property, and the spec **strongly
recommends** an `IdentityHash` wherever plaintext transmission or storage
could leak personally identifiable information.

## Decision

**Holder binding in this profile is claim-based, expressed as an unhashed
`emailAddress` `IdentityObject` in `credentialSubject.identifier`.**

- The row reads `credentialSubject.identifier`, not
  `credentialSubject.id`. Any one conforming entry satisfies it.
- `hashed` MUST be `false`, and `identityHash` MUST hold the plaintext
  address. A hashed identifier fails, with the reason in the message. An
  absent `hashed` also fails — it is `[1]` in the spec, and treating
  absent as `false` would let a digest through unread.
- `credentialSubject.id` is **not read**. A `mailto:` URI there is neither
  required nor discouraged; the check ignores it entirely.

### Why unhashed

The spec's recommendation is conditioned on a privacy expectation that
does not hold here: these credentials are not published anywhere, so
there is no plaintext exposure to mitigate. Against that non-benefit sits
a real cost — a hash is an exact-match construct, and email addresses are
case-insensitive nearly everywhere in practice. Hashing would make every
recipient match a case-normalisation problem for the operator, in
exchange for privacy the deployment does not need.

### Why `identifier` rather than `id`

`identifier` is the structure Open Badges defines for recipient identity,
and it is multi-valued, so a credential can name its recipient several
ways. Leaving `credentialSubject.id` free also matters across the profile
family: the **live** transports bind `credentialSubject.id` to the
holder's authenticated DID (`issuer-binds-holder-did`), and a profile that
demanded a `mailto:` URI there would be at odds with its own siblings.

## Consequences

**This binding is not verifiable inside a presentation, and that is
accepted.** An `IdentityObject` is a claim the issuer makes about the
recipient. Nothing in the presentation cycle proves the holder controls
that address; confirming it is an out-of-band step for the verifier —
send a code to the address, or compare it to an already-authenticated
account. That is what this profile is _for_, and it is why the
requirement is a MUST about the **shape** of the identifier and never
about proof of control. A future profile wanting cryptographic holder
binding should say so with a different requirement, not by tightening
this one.

The profile already records the operational edge of that trade: a
recipient can lose access to the address a credential is bound to —
institutional addresses commonly deactivate within months of graduation —
so strong proof of control may be impossible for some credentials. That
does not change the decision; it is the accepted cost of claim-based
binding.

Mechanically: `credential-subject-email` is replaced by
`credential-subject-identifier-email`, and the `ob3-direct-issuer-delivery`
row `subject-email` becomes `identifier-email`. Both are fingerprint
inputs, so stored runs of that scenario drop to "not run" and the badge
`?v=` for any bundle containing it moves. Both are designed behaviours —
no migration, and a claimed badge stays claimed.

Not decided here, and left as follow-up work: whether the credentials the
**suite itself** mints (`minimal-ob3`, `rich-ob3`) should carry an email
`IdentityObject` so the documents handed to verifiers and wallets model
this binding. They bind to the holder DID today.
