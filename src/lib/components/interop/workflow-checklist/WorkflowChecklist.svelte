<script lang="ts">
	import { ProfileBadge } from '$lib/components/interop/profile-badge/index.js';
	import { RoleBadge } from '$lib/components/interop/role-badge/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		profileHref,
		type Profile,
		type Role,
		type Workflow,
		type WorkflowChecklist as WorkflowChecklistData
	} from '$lib/interop/index.js';

	import { requirementLevelClass, requirementLevelVariant } from './requirement-level-badge.js';

	let {
		checklist,
		profile,
		workflow,
		role
	}: {
		checklist: WorkflowChecklistData;
		profile: Profile;
		workflow: Workflow;
		role: Role;
	} = $props();
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<RoleBadge {role} />
		<ProfileBadge {profile} href={profileHref(profile.slug)} />
	</div>
	<h1 class="text-display-lg">{workflow.name}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{workflow.blurb}</p>
</section>

<ol class="mt-12 space-y-10">
	{#each checklist.steps as step, i (step.title)}
		<li class="space-y-3">
			<header class="flex items-baseline gap-3">
				<span class="text-headline-md font-mono text-primary">{i + 1}.</span>
				<h2 class="text-headline-md">{step.title}</h2>
			</header>
			<p class="max-w-prose text-body-md text-muted-foreground">{step.summary}</p>
			{#if step.requirements.length}
				<ul class="space-y-2 pl-6">
					{#each step.requirements as req (req.text)}
						<li class="flex items-start gap-3">
							<input
								type="checkbox"
								disabled
								class="mt-1 size-4 shrink-0 rounded border-border bg-card"
								aria-label="static"
							/>
							<span class="flex flex-wrap items-baseline gap-2">
								<Badge
									variant={requirementLevelVariant[req.level]}
									class={requirementLevelClass[req.level]}>{req.level}</Badge
								>
								<span class="text-body-md text-foreground">{req.text}</span>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</li>
	{/each}
</ol>

<footer class="mt-16 text-label-md text-muted-foreground">
	Source: see the
	<a class="text-primary hover:underline" href={profileHref(profile.slug)}>
		{profile.name}
	</a>
	specification.
</footer>
