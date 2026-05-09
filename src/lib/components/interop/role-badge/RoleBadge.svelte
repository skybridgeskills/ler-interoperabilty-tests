<script lang="ts" module>
	import type { BadgeVariant } from '$lib/components/ui/badge/index.js';
	import type { RoleSlug } from '$lib/interop/index.js';

	const variantBySlug: Record<RoleSlug, BadgeVariant> = {
		issuer: 'default',
		wallet: 'secondary',
		verifier: 'outline'
	};
</script>

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Role } from '$lib/interop/index.js';

	let { role }: { role: Role } = $props();
</script>

<Badge variant={variantBySlug[role.slug]}>{role.name}</Badge>
