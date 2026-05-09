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
	import {
		allRoles,
		allWorkflowGroups,
		profileHref,
		profilesForCombination,
		roleBySlug,
		roleHref,
		workflowsInGroup
	} from '$lib/interop/index.js';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		A self-help kit for developers building wallets, verifiers, and issuers for Open Badges
		credentials and other Learning &amp; Employment Records. Drill from any of the six
		interoperability workflows into the exact ordered checklist of steps required by your chosen
		profile.
	</p>
</section>

<section class="mt-12 space-y-4">
	<h2 class="text-headline-md">Pick your role</h2>
	<div class="grid gap-6 md:grid-cols-3">
		{#each allRoles as role (role.slug)}
			<a href={roleHref(role.slug)} class="block transition">
				<Card class="h-full transition hover:border-primary">
					<CardHeader>
						<CardTitle>{role.plural}</CardTitle>
						<CardDescription>{role.blurb}</CardDescription>
					</CardHeader>
					<CardContent>
						<p class="text-label-md text-primary">View workflows →</p>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</section>

<section class="mt-16 space-y-8">
	<h2 class="text-headline-md">Workflows</h2>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Each workflow has a primary role and is supported by one or more interoperability profiles. Pick
		a workflow to see how each profile defines its implementation steps.
	</p>

	{#each allWorkflowGroups as group (group.slug)}
		<div class="space-y-4">
			<header class="space-y-1">
				<h3 class="text-headline-md">{group.name}</h3>
				<p class="max-w-prose text-body-md text-muted-foreground">{group.blurb}</p>
			</header>
			<div class="grid gap-6 md:grid-cols-2">
				{#each workflowsInGroup(group) as workflow (workflow.slug)}
					{@const role = roleBySlug(workflow.role)!}
					{@const profiles = profilesForCombination(role.slug, workflow.slug)}
					<Card>
						<CardHeader>
							<div class="flex items-start justify-between gap-4">
								<CardTitle>{workflow.name}</CardTitle>
								<RoleBadge {role} />
							</div>
							<CardDescription>{workflow.blurb}</CardDescription>
						</CardHeader>
						<CardContent>
							<p class="mb-2 text-label-md text-muted-foreground">Profiles:</p>
							<div class="flex flex-wrap gap-2">
								{#each profiles as profile (profile.slug)}
									<ProfileBadge {profile} href={profileHref(profile.slug)} />
								{/each}
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		</div>
	{/each}
</section>
