# Data Schemas with ZodFactory

We use `ZodFactory` for data transfer objects and schemas where runtime validation should stay aligned with TypeScript types.

## ZodFactory Pattern

```ts
import { z } from 'zod';
import { ZodFactory } from '$lib/server/util/zod-factory.js';

// Create the factory
export const User = ZodFactory(
	z.object({
		id: z
			.string()
			.uuid()
			.default(() => crypto.randomUUID()),
		email: z.string().email(),
		name: z.string().min(1).max(100),
		role: z.enum(['admin', 'user']).default('user'),
		createdAt: z.date().default(() => new Date())
	})
);

// Derive the TypeScript type from the factory
export type User = ReturnType<typeof User>;
```

## Using the Factory

The factory can both validate/parse and act as a type.

```ts
// Parse/validate with defaults applied
const user: User = User({
	email: 'john@example.com',
	name: 'John Doe'
	// id and createdAt get defaults
});

// Access the underlying Zod schema
const isValid = User.schema.safeParse(data);

// Type inference from schema
type UserInput = z.input<typeof User.schema>; // Before defaults
type UserOutput = z.output<typeof User.schema>; // After defaults
```

## Spec Types for Forms

Form specifications should use ZodFactory to define their schemas when they cross runtime boundaries.

```ts
export const FormFieldSpec = ZodFactory(
	z.object({
		name: z.string(),
		label: z.string(),
		type: z.enum(['text', 'number', 'select', 'file']),
		required: z.boolean().default(true),
		validation: z.any().optional()
	})
);
export type FormFieldSpec = ReturnType<typeof FormFieldSpec>;
```

## Nested Schemas

Reference other ZodFactory schemas using `.schema`.

```ts
export const Address = ZodFactory(
	z.object({
		street: z.string(),
		city: z.string(),
		zip: z.string()
	})
);

export const User = ZodFactory(
	z.object({
		id: z.string().uuid(),
		email: z.string().email(),
		address: Address.schema // Nested schema
	})
);
```

## Schema Extensions

Extend schemas using Zod's `extend` or `merge`.

```ts
// Base schema
const BaseRecord = ZodFactory(
	z.object({
		id: z.string().uuid(),
		createdAt: z.date(),
		updatedAt: z.date()
	})
);

// Extended schema
const User = ZodFactory(
	BaseRecord.schema.extend({
		email: z.string().email(),
		name: z.string()
	})
);
```

## When to Use ZodFactory

**Use for:**

- API request/response types
- Database input/output shapes
- Form specifications
- Domain model definitions
- Configuration objects

**Not needed for:**

- Simple inline types
- Type-only constructs (e.g., `type Props = { ... }` for components)
- Function parameters that are validated elsewhere

## Example: Complete Domain Model

```ts
// user.ts
import { z } from 'zod';
import { ZodFactory } from '$lib/server/util/zod-factory.js';

// Schema definition with ZodFactory
export const User = ZodFactory(
	z.object({
		id: z
			.string()
			.uuid()
			.default(() => crypto.randomUUID()),
		email: z.string().email(),
		name: z.string().min(1),
		status: z.enum(['active', 'inactive', 'pending']).default('pending'),
		metadata: z.record(z.string()).default({}),
		createdAt: z.date().default(() => new Date())
	})
);

export type User = ReturnType<typeof User>;

// Input type for creating users (omit auto-generated fields)
export type CreateUserInput = Omit<z.input<typeof User.schema>, 'id' | 'createdAt' | 'status'>;

// Output type with all defaults applied
export type UserOutput = z.output<typeof User.schema>;
```

## Validation Helpers

ZodFactory schemas can be used directly in validation logic.

```ts
function validateUser(data: unknown): Result<User, ValidationErr> {
	const result = User.schema.safeParse(data);
	if (result.success) {
		return Ok(result.data);
	}
	return Err(ValidationErr({ issues: result.error.issues }));
}
```

## Avoiding ZodFactory Mistakes

**Don't** define types separately from schemas:

```ts
// Wrong — type and schema can drift
interface User {
	id: string;
	email: string;
}
const UserSchema = z.object({
	id: z.string(),
	email: z.string()
});

// Right — single source of truth
export const User = ZodFactory(
	z.object({
		id: z.string(),
		email: z.string()
	})
);
export type User = ReturnType<typeof User>;
```

**Don't** forget to export the type:

```ts
// Wrong — consumers can't reference User type
export const User = ZodFactory(...);

// Right — both available
export const User = ZodFactory(...);
export type User = ReturnType<typeof User>;
```
