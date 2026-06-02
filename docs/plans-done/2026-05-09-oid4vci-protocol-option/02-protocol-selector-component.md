# Phase 2 — `ProtocolSelector` component

## Scope

Build the small selector primitive the right column uses to switch
between VCALM and OID4VCI. No wiring into the panel yet; that lands
in phase 3.

- New folder
  `src/lib/components/interop/exchange-runner/protocol-selector/`
  with `ProtocolSelector.svelte`, `ProtocolSelector.stories.svelte`,
  and `index.ts`.
- Built on the existing shadcn-svelte `Tabs` primitive.
- Renders nothing when `protocols.oid4vci` is `undefined` so callers
  don't have to special-case the absence.

## Code organization

- One file per concept.
- The component is purely presentational — no fetching, no state
  beyond what the parent passes via props.
- Sub-labels live inline; if they outgrow the file we extract a
  helper, but at the planned size they stay inline.

## Implementation details

### `ProtocolSelector.svelte`

```svelte
<script lang="ts">
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';

	let {
		protocols,
		value,
		onChange
	}: {
		protocols: { vcalm: string; oid4vci?: string };
		value: 'vcalm' | 'oid4vci';
		onChange: (next: 'vcalm' | 'oid4vci') => void;
	} = $props();

	const oid4vciAvailable = $derived(!!protocols.oid4vci);
</script>

{#if oid4vciAvailable}
	<Tabs {value} onValueChange={(v) => onChange(v as 'vcalm' | 'oid4vci')} class="w-full">
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="vcalm" class="flex flex-col items-start gap-0.5 px-3 py-2 text-left">
				<span class="text-body-md font-medium">VCALM</span>
				<span class="text-label-md text-muted-foreground">VC-API exchange (default)</span>
			</TabsTrigger>
			<TabsTrigger value="oid4vci" class="flex flex-col items-start gap-0.5 px-3 py-2 text-left">
				<span class="text-body-md font-medium">OID4VCI</span>
				<span class="text-label-md text-muted-foreground">Pre-authorized code flow</span>
			</TabsTrigger>
		</TabsList>
	</Tabs>
{/if}
```

(`Tabs` and `TabsTrigger` exact prop names follow whatever the
shadcn-svelte generated component exposes — verify during
implementation. The `class` overrides aim for two-line button labels
that match the design system's body+label scale.)

### `index.ts`

```ts
export { default as ProtocolSelector } from './ProtocolSelector.svelte';
```

### Storybook story

`ProtocolSelector.stories.svelte` — three `<Story asChild>` blocks:

1. **`Both protocols available`** — mounts with both URLs and a no-op
   `onChange`. User can click between tabs and see active state.
2. **`VCALM only`** — `protocols.oid4vci` is `undefined`. Asserts the
   component renders nothing visible (stories under storybook
   Vitest just need to not throw).
3. **`OID4VCI initially selected`** — both URLs present, `value =
'oid4vci'`.

Each story uses `defineMeta({ title: 'Interop/Exchange Runner/ProtocolSelector', component: ProtocolSelector })`.

## Validate

```
pnpm turbo check
pnpm turbo test
```

Both pass; storybook Vitest exercises the new stories.

## Suggested commit

```
feat(exchange-runner): add ProtocolSelector tabs primitive
```
