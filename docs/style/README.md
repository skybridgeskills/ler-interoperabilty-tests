# Code Style Guide

This directory documents design principles and coding conventions for this repository. It is **aligned with** the [SkyBridge Skills monorepo](https://github.com/skybridgeskills/skybridgeskills-monorepo) (`docs/style/` there); keep them in sync when conventions change.

Some examples reference patterns or helpers that exist only in the monorepo (for example certain test utilities). Apply the **patterns** here using local modules and imports (`$lib/server/...`).

## Quick Reference

| Topic              | File                                         |
| ------------------ | -------------------------------------------- |
| Core philosophy    | [philosophy.md](philosophy.md)               |
| Naming conventions | [naming.md](naming.md)                       |
| Factory functions  | [factory-functions.md](factory-functions.md) |
| Provider system    | [providers.md](providers.md)                 |
| Data schemas       | [schemas.md](schemas.md)                     |
| File organization  | [file-organization.md](file-organization.md) |
| Documentation      | [documentation.md](documentation.md)         |

## Golden Rules

1. **Prefer factory functions over classes** — Use `function MyService()` not `class MyService`
2. **Use ZodFactory for shared schemas** — Keeps runtime validation and TypeScript types in sync
3. **Organize by domain/feature, not by type** — `user/api.ts` not `api/user.ts`
4. **Order by abstraction** — High-level logic first, helpers and types later
5. **Keep files small** — Extract helpers early; avoid letting files grow past ~200 lines
