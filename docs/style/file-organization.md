# File Organization

## Organize by Domain/Feature

**Organize by domain/feature, not by type.** Group files by what they do, not what they are.

```
# Good — by domain
src/features/user/
  api.ts           # API calls
  queries.ts       # Database queries
  store.ts         # State management
  UserCard.svelte  # Component

# Bad — by type
src/api/user.ts
src/queries/user.ts
src/components/UserCard.svelte
```

(Adapt the `src/` root to this repo — e.g. `src/lib/server/domain/`, routes under `src/routes/`.)

## File Naming

All source files use `kebab-case.ts`. Co-locate tests as `<file>.test.ts`.

```
user-service.ts           # main file
user-service.test.ts      # co-located test
email-form.ts             # helper logic
email-form.test.ts        # tests for helper
```

Svelte components use PascalCase matching the component name:

```
Button.svelte
AchievementCard.svelte
ResponsivePreview.svelte
```

## Order by Abstraction

Within files, order contents by abstraction — high-level logic first, helpers and types later.
If there is an export that matches the file name (or means the same thing), that export should be the first export.

```ts
// 1. High-level exports (what consumers use)
export function doPublicThing() {
  const data = fetchData();
  return transformData(data);
}

export function doAnotherPublicThing() { ... }

// 2. Main implementation
function fetchData() { ... }

// 3. Supporting helpers
function transformData(data: RawData) { ... }
function helperForTransforming(item: Item) { ... }

// 4. Types (often at end or in separate file)
type RawData = { ... };
type Item = { ... };
```

## File Size

Keep files small. If a file grows past ~200 lines, extract helpers into their own files.

```
# Before — one large file (300+ lines)
send-offer.ts

# After — split by responsibility
send-offer/
  index.ts              # Public API (main orchestrator)
  validate-input.ts     # Input validation
  create-records.ts     # Database operations
  send-email.ts         # Email delivery
  types.ts              # Shared types
```

## Co-location

Keep related files together.

```
achievement-form/
  achievement-form.ts        # Form definition
  achievement-form.test.ts   # Tests
  achievement-form.svelte    # UI component (if needed)
  helpers.ts                 # Private helpers
  types.ts                   # Specific types
```

## Directory Structure Patterns

### Server / domain code

```
src/lib/server/domain/<feature>/
  ...                      # ops, queries, resources as needed
```

### UI Components

```
src/lib/components/
  button/
    Button.svelte
    Button.svelte.test.ts
    button-variants.ts
```

## Import Order

Organize imports in three groups with blank lines between:

1. External dependencies (npm packages)
2. Internal `$lib/` (or workspace) imports
3. Relative imports (same package)

```ts
// 1. External
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// 2. $lib / workspace
import { ZodFactory } from '$lib/server/util/zod-factory.js';
import { Providers } from '$lib/server/util/provider/providers.js';

// 3. Relative
import { createDatabase } from '../database';
import type { User } from './types';
```

## Re-exports and Public APIs

Use `index.ts` files to define clear public APIs for modules.

```ts
// features/achievement/index.ts
export { createAchievement } from './ops/create-achievement';
export { updateAchievement } from './ops/update-achievement';
export { getAchievement } from './queries/get-achievement';
export { Achievement, type Achievement } from './schemas/achievement';
```

Keep internal helpers unexported. If a file doesn't need to be public, don't export it from the index.
