<script lang="ts">
	import { ProfileBadge } from '$lib/components/interop/profile-badge/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { checklistHref, type Profile, type Role, type Workflow } from '$lib/interop/index.js';

	let { workflow, role, profiles }: { workflow: Workflow; role: Role; profiles: Profile[] } =
		$props();
</script>

<Card>
	<CardHeader>
		<div class="flex items-start justify-between gap-4">
			<CardTitle>{workflow.name}</CardTitle>
			<RoleBadge {role} />
		</div>
		<CardDescription>{workflow.blurb}</CardDescription>
	</CardHeader>
	<CardContent>
		<p class="mb-3 text-label-md text-muted-foreground">Open the checklist for a profile:</p>
		<ul class="space-y-2">
			{#each profiles as profile (profile.slug)}
				<li>
					<a
						class="flex items-center justify-between gap-3 text-body-md text-foreground hover:text-primary"
						href={checklistHref(role.slug, workflow.slug, profile.slug)}
					>
						<ProfileBadge {profile} />
						<span class="text-label-md text-muted-foreground">Open checklist →</span>
					</a>
				</li>
			{/each}
		</ul>
	</CardContent>
</Card>
