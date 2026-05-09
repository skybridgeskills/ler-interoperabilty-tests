# Documentation

## Comment Philosophy

Comments should explain **why**, not what. The code explains what happens; comments explain intent, trade-offs, and constraints.

```ts
// Bad — states the obvious
// Increment the counter
counter++;

// Good — explains why
counter++; // Reset on overflow handled by downstream consumer
```

## TSDoc for Public APIs

Add TSDoc (JSDoc with TypeScript support) to public functions, types, and complex logic.

````ts
/**
 * Creates a new achievement with the given properties.
 * Automatically generates a slug from the title if not provided.
 *
 * @example
 * ```ts
 * const achievement = await createAchievement({
 *   title: 'JavaScript Expert',
 *   description: 'Awarded for completing advanced JS coursework',
 * });
 * ```
 */
export async function createAchievement(input: CreateAchievementInput) {
	// ...
}
````

## README Files

Packages and complex features should have README files explaining:

1. Purpose and scope
2. Quick start/example
3. Key concepts
4. Cross-references to related modules

See `docs/architecture.md` for system overview in this repository.

## Test as Documentation

Tests often serve as the best documentation. Write descriptive test names and use tests to show how things work.

```ts
// Good — explains the behavior
test('sendOffer creates an offer and sends email to recipient', async () => {
	// ...
});

// Avoid — doesn't convey intent
test('sendOffer works', async () => {
	// ...
});
```

## Example Files

For complex patterns, create example files that demonstrate usage.

```
provider/
  providers.ts          # Implementation
  README.test.ts        # Usage examples as tests
```

## When to Document

**Always document:**

- Public APIs (exports from index.ts)
- Non-obvious behavior
- Workarounds or hacks
- Design decisions that might seem odd

**Usually document:**

- Complex algorithms
- State machines
- Configuration options

**Rarely document:**

- Private helpers (let the code speak)
- Simple, idiomatic TypeScript

## Code Examples in Comments

Use `@example` blocks for non-trivial usage:

````ts
/**
 * Chains multiple provider functions into a single composed provider.
 * Each provider receives the accumulated context from all prior providers.
 *
 * @example
 * ```ts
 * const ctx = await Providers(
 *   () => bootstrapCtx,
 *   ConsoleLoggingProvider({ pretty: true }),
 *   provideMemoryDatabase,
 * )();
 * ```
 */
export function Providers(...providers: ProviderLike[]): any;
````

## Design Documents

For significant architectural changes, create design docs under `docs/plans/<YYYY-MM-dd>-<name>/`:

```
docs/plans/
  2026-04-01-app-forms/
    00-design.md          # Overview and goals
    01-schema-design.md   # Data model
    02-api-design.md      # Interface design
    03-implementation.md  # Implementation notes
```

These capture the "why" behind major decisions and serve as onboarding material for future engineers.

## Style Cross-References

When a file implements a pattern documented in this style guide, reference it:

```ts
/**
 * Provider factory for the email service.
 *
 * @see docs/style/providers.md for provider conventions
 */
export function EmailProvider(config: EmailConfig) { ... }
```

## Keep Documentation Close

Documentation should live as close as possible to the code it describes:

- TSDoc comments on functions/types
- README.md in package directories
- Usage examples in co-located `*.test.ts` files
- Design docs in `docs/plans/` for larger features

Avoid separate wiki or doc sites that can drift from the code.
