# Factory Functions

We use factory functions instead of classes throughout the codebase. This document explains the pattern and when to apply it.

## Why Factory Functions?

1. **No `this` binding issues** — Objects are plain, methods don't need binding
2. **Private by default** — Closure variables are truly private
3. **Easier to test** — Just call the function, no constructors or mocks needed
4. **Composable** — Return objects that can be merged or extended
5. **No inheritance complexity** — Compose behaviors instead

## Basic Pattern

```ts
// Factory function returning a plain object with methods
export function RealTimeService() {
	// Closure variables — truly private
	let prevDate = Date.now();
	let counter = 0;

	return {
		nowMs: () => Date.now(),
		testStr: (prefix: string) => {
			const now = Date.now();
			if (now !== prevDate) {
				prevDate = now;
				counter = 0;
			}
			return `${prefix}-${now}-${counter++}`;
		}
	};
}

// Type derived from the factory
export type RealTimeService = ReturnType<typeof RealTimeService>;
```

## With Dependencies

Factories receive dependencies as parameters rather than importing them.

```ts
// Good: dependencies are explicit parameters
export function UserService(database: Database, emailService: EmailService) {
	return {
		create: async (input: CreateUserInput) => {
			const user = await database.insert('users', input);
			await emailService.sendWelcome(user.email);
			return user;
		},
		findById: (id: string) => database.query('users', id)
	};
}

// Usage
const userService = UserService(db, emailService);
```

## Integration with Provider System

Services are typically created through providers for dependency injection.

```ts
// my-service.ts
export function MyService(config: ServiceConfig) {
  return {
    doThing: () => { ... },
  };
}
export type MyService = ReturnType<typeof MyService>;

// Provider definition (same file or providers.ts)
export function provideMyService({ config }: ConfigCtx) {
  return { myService: MyService(config) };
}
export type MyServiceCtx = OutputOfProvider<typeof provideMyService>;

// Accessor for convenient access
export function myService() {
  return providerCtx<MyServiceCtx>().myService;
}
```

## State Management

Use closure variables for private state. Export methods that operate on it.

```ts
export function CounterService() {
	let count = 0; // private state

	return {
		increment: () => ++count,
		decrement: () => --count,
		get: () => count,
		reset: () => {
			count = 0;
		}
	};
}
```

## Complex Factories with Configuration

When a factory needs complex configuration, accept a config object.

```ts
interface EmailServiceConfig {
	apiKey: string;
	fromAddress: string;
	retryAttempts?: number;
}

export function EmailService(config: EmailServiceConfig) {
	const retryAttempts = config.retryAttempts ?? 3;

	return {
		sendEmail: async (props: SendEmailProps): AsyncResult<void, EmailErr> => {
			for (let attempt = 1; attempt <= retryAttempts; attempt++) {
				const result = await trySend(props);
				if (result.ok) return result;
				if (attempt === retryAttempts) return result;
			}
			return Err(EmailErr({ reason: 'Max retries exceeded' }));
		}
	};
}
```

## When Not to Use Factories

Simple objects don't need factories — just export them directly.

```ts
// Good: simple constant
export const maxUploadSize = 10 * 1024 * 1024;

// Good: pure utility functions
export function calculateTotal(items: LineItem[]): number {
	return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```
