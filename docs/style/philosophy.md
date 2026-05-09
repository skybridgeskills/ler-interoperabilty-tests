# Philosophy

## Composition Over Inheritance

We favor object composition and factory functions over classes and inheritance. This produces simpler, more testable code with less boilerplate.

**Prefer:**

```ts
// Factory function returning a plain object
export function UserService() {
  return {
    findById: (id: string) => db.query(...),
    create: (data: CreateUserInput) => db.insert(...),
  };
}
```

**Avoid:**

```ts
// Class with `this` binding complexity
class UserService {
  constructor(private db: Database) {}
  findById(id: string) { return this.db.query(...); }
}
```

## Pure Functions Where Possible

Separate pure planning from side effects. This makes testing trivial and reasoning about code easier.

```ts
// Pure function — easy to test
function calculateShippingCost(weight: number, zone: string): number {
	const baseRate = zone === 'domestic' ? 5 : 15;
	return baseRate + weight * 0.5;
}

// Side-effectful wrapper — thin and delegating
async function applyShippingCharge(orderId: string) {
	const order = await db.getOrder(orderId);
	const cost = calculateShippingCost(order.weight, order.zone);
	await db.updateOrder(orderId, { shippingCost: cost });
}
```

## Minimal API Surface Area

Export only what consumers need. Internal helpers stay internal.

```ts
// my-feature.ts
export function doPublicThing() { ... }  // visible

function internalHelper() { ... }         // not exported — implementation detail
type InternalState = { ... };            // not exported
```

## Immutability by Default

Prefer creating new values over mutation. When mutation is necessary (for performance), make it explicit.

```ts
// Good: new array
type Items = string[];
const added = [...items, newItem];

// Good: explicit mutation with clear purpose
function sortInPlace(items: Item[]) {
	items.sort((a, b) => a.priority - b.priority);
}
```

## Type Safety as Documentation

Types should encode invariants and constraints. Use the type system to prevent invalid states.

```ts
// Better: impossible to forget to handle error case
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Worse: null/undefined requires defensive checks everywhere
function findUser(id: string): User | null;
```
