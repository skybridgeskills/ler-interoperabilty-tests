# Naming Conventions

## Overview

| Kind                  | Convention              | Example                                                    |
| --------------------- | ----------------------- | ---------------------------------------------------------- |
| Variables, functions  | `camelCase`             | `findUser`, `totalCount`                                   |
| Constants             | `camelCase`             | `maxRetries` (rarely `SCREAMING_SNAKE` for true constants) |
| Environment variables | `SCREAMING_SNAKE_CASE`  | `DATABASE_URL`                                             |
| Types, interfaces     | `PascalCase`            | `UserRecord`, `SendEmailProps`                             |
| Factory functions     | `PascalCase`            | `UserService`, `EmailProvider`                             |
| Simple providers      | `provideThing`          | `provideDatabase`, `provideConfig`                         |
| Actions (operations)  | `camelCase` verb        | `sendOffer`, `createAchievement`                           |
| Transformers          | camelCase + preposition | `valueFor`, `labelFor`, `formatAs`                         |
| File names            | `kebab-case`            | `user-service.ts`, `email-form.ts`                         |

## Factory Functions (PascalCase)

Functions that create and return service objects use PascalCase to distinguish them from regular functions.

```ts
// Factory — creates a service object
export function EmailService(config: EmailConfig) {
  return {
    sendEmail: async (props: SendEmailProps) => { ... },
    verifySignature: (sig: string) => { ... },
  };
}
export type EmailService = ReturnType<typeof EmailService>;

// Usage
const service = EmailService({ apiKey: '...' });
await service.sendEmail({ to: 'user@example.com', subject: 'Hello' });
```

## Providers (provideThing)

Providers are functions that return context objects for the provider system. Use `provide` prefix + PascalCase for the thing being provided.

```ts
// Simple provider — returns a single key
export function provideDatabase() {
	return { database: Database() };
}

// Provider with dependencies — receives accumulated context
export function provideUserService({ database }: DatabaseCtx) {
	return { userService: UserService(database) };
}
```

## Provider Factories (ThingProvider)

When a provider needs static configuration, use a factory with PascalCase + `Provider` suffix.

```ts
// Factory that returns a provider function
export function ConsoleLoggingProvider(options: { pretty: boolean }) {
	return () => ({
		logger: createLogger(options)
	});
}

// Usage in a chain
const provideAll = Providers(
	provideConfig,
	ConsoleLoggingProvider({ pretty: true }),
	provideDatabase
);
```

## Actions and Operations

Business logic actions are camelCase verbs.

```ts
// Good
export async function sendOffer(props: SendOfferProps) { ... }
export async function createAchievement(data: AchievementInput) { ... }
export async function revokeCredential(id: string) { ... }

// Avoid — nouns don't convey action
export async function offerSender(props) { ... }
export async function achievementCreator(data) { ... }
```

## Transformers

Functions that transform or convert values often end with prepositions.

```ts
// Good
function labelFor(status: OfferStatus): string { ... }
function valueFor(option: SelectOption): string { ... }
function formatAsCurrency(amount: number): string { ... }
```

## Context Types

Context types follow the pattern `XxxCtx` and describe what a provider contributes.

```ts
// Type alias for what a provider gives
export type DatabaseCtx = OutputOfProvider<typeof provideDatabase>;

// Combining multiple contexts
type AppContext = DatabaseCtx & EmailServiceCtx & AuthServiceCtx;
```

## Accessor Functions

When using the provider context system, create thin accessor functions for services.

```ts
// Accessor — thin wrapper around providerCtx
export function userService() {
	return providerCtx<UserServiceCtx>().userService;
}

// Usage inside a provider scope
const result = await userService().findById(id);
```

## Files and Directories

All file names use `kebab-case.ts`. Co-locate tests as `<file>.test.ts`.

```
user-service.ts           # main file
user-service.test.ts      # co-located test
email-form/               # directory for complex component
  email-form.ts           # main logic
  email-form.svelte       # UI component
  email-form.test.ts      # tests
  helpers.ts              # private helpers
```

## Svelte Components

Svelte component files use PascalCase matching the component name.

```
Button.svelte
AchievementCard.svelte
ResponsivePreview.svelte
```
