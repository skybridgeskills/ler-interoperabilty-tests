<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Profile } from '$lib/interop/index.js';

	let { profile, href }: { profile: Profile; href?: string } = $props();
</script>

<Badge variant="outline" {href}>{profile.name}</Badge>
