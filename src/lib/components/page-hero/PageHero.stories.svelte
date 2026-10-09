<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { ContextChip } from '$lib/components/perspective/index.js';

	import HeroReviewMatrix from './hero-review-matrix.svelte';
	import PageHero from './PageHero.svelte';

	/**
	 * One story per page type from the hero slot table, each rendered at phone,
	 * tablet and desktop widths in light and dark — the responsive review before
	 * any page adopts the hero. Copy is placeholder; nothing here varies by
	 * Perspective except the controls themselves.
	 */
	const { Story } = defineMeta({
		title: 'Components/PageHero',
		component: PageHero
	});

	const crumbLink = 'text-primary hover:underline';
	const aboutButton =
		'inline-flex items-center rounded-full bg-perspective px-[18px] py-2 text-body-md font-medium text-perspective-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
	const pill = 'rounded-full border px-2 py-1 text-label-md font-medium';
	const link = 'text-primary hover:underline';
</script>

{#snippet homeHero(
	perspective: 'builder' | 'evaluator' | undefined,
	onChange: (p: 'builder' | 'evaluator') => void
)}
	<PageHero size="large" {perspective} onPerspectiveChange={onChange}>
		{#snippet title()}LER Interoperability Test Suite{/snippet}
		{#snippet lede()}
			Interoperability tests for the wallets, issuers and verifiers of Learning &amp; Employment
			Records. Standards compliance isn’t the same as interoperability.
		{/snippet}
		{#snippet actions()}
			<a href="#about" class={aboutButton}>About these tests</a>
		{/snippet}
	</PageHero>
{/snippet}

<Story name="Home — unset" asChild>
	<HeroReviewMatrix hero={homeHero} />
</Story>

<Story name="Home — Builder" asChild>
	<HeroReviewMatrix perspective="builder" hero={homeHero} />
</Story>

<Story name="Home — Evaluator" asChild>
	<HeroReviewMatrix perspective="evaluator" hero={homeHero} />
</Story>

<Story name="About" asChild>
	<HeroReviewMatrix>
		{#snippet hero(perspective, onChange)}
			<PageHero {perspective} onPerspectiveChange={onChange}>
				{#snippet breadcrumb()}<a href="#home" class={crumbLink}>Home</a>{/snippet}
				{#snippet eyebrow()}About{/snippet}
				{#snippet title()}About the LER Interoperability Test Suite{/snippet}
				{#snippet lede()}
					An always-available, self-help kit for teams building Learning &amp; Employment Record
					systems — wallets, verifiers and issuers working with Open Badges 3.0.
				{/snippet}
			</PageHero>
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Standard Profiles index" asChild>
	<HeroReviewMatrix>
		{#snippet hero(perspective, onChange)}
			<PageHero {perspective} onPerspectiveChange={onChange}>
				{#snippet breadcrumb()}<a href="#home" class={crumbLink}>Home</a>{/snippet}
				{#snippet title()}Standard Profiles{/snippet}
				{#snippet lede()}
					A Standard Profile is an interoperability profile: a fixed set of standards and options
					that two products must share to work together. Add-ons layer extra requirements onto one.
				{/snippet}
			</PageHero>
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Standard Profile detail" asChild>
	<HeroReviewMatrix perspective="builder">
		{#snippet hero(perspective, onChange)}
			<PageHero {perspective} onPerspectiveChange={onChange}>
				{#snippet breadcrumb()}
					<a href="#home" class={crumbLink}>Home</a>
					<span aria-hidden="true">›</span>
					<a href="#profiles" class={crumbLink}>Standard Profiles</a>
				{/snippet}
				{#snippet eyebrow()}Standard Profile{/snippet}
				{#snippet title()}VCALM Standard Profile{/snippet}
				{#snippet lede()}
					Browser-based credential exchange using VCALM Exchanges over Open Badges 3.0 credentials.
					The cryptosuite, key type and DID-method options are declared by the Data Integrity
					Cryptosuites add-on.
				{/snippet}
				{#snippet meta()}
					<span>v0.2 · Editor’s Draft · updated 2026-05-16</span>
					<a href="#published" class={link}>Read the published profile ↗</a>
				{/snippet}
			</PageHero>
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Add-on detail" asChild>
	<HeroReviewMatrix perspective="evaluator">
		{#snippet hero(perspective, onChange)}
			<PageHero {perspective} onPerspectiveChange={onChange}>
				{#snippet breadcrumb()}
					<a href="#home" class={crumbLink}>Home</a>
					<span aria-hidden="true">›</span>
					<a href="#profiles" class={crumbLink}>Standard Profiles</a>
				{/snippet}
				{#snippet eyebrow()}Add-on{/snippet}
				{#snippet title()}Open Skill Alignment{/snippet}
				{#snippet lede()}
					Adds machine-readable skill-alignment data to an OpenBadgeCredential using
					credentialSubject.result[] and achievement.resultDescription[].
				{/snippet}
				{#snippet meta()}
					<span>v0.1 · Editor’s Draft</span>
					<a href="#published" class={link}>Read the published add-on ↗</a>
				{/snippet}
			</PageHero>
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Role landing" asChild>
	<HeroReviewMatrix>
		{#snippet hero(perspective, onChange)}
			<PageHero {perspective} onPerspectiveChange={onChange}>
				{#snippet breadcrumb()}<a href="#home" class={crumbLink}>Home</a>{/snippet}
				{#snippet eyebrow()}Role{/snippet}
				{#snippet title()}Wallets{/snippet}
				{#snippet lede()}
					Receive credentials from issuers, keep them safe, and present them to verifiers when
					asked.
				{/snippet}
			</PageHero>
		{/snippet}
	</HeroReviewMatrix>
</Story>

{#snippet scenarioHero(
	perspective: 'builder' | 'evaluator' | undefined,
	onChange: (p: 'builder' | 'evaluator') => void,
	statusLabel: string,
	statusClass: string
)}
	<PageHero {perspective} onPerspectiveChange={onChange}>
		{#snippet breadcrumb()}
			<a href="#home" class={crumbLink}>Home</a>
			<span aria-hidden="true">›</span>
			<a href="#vcalm" class={crumbLink}>VCALM</a>
		{/snippet}
		{#snippet eyebrow()}Scenario{/snippet}
		{#snippet title()}Accept a credential signed with ecdsa-rdfc-2019 over VCALM{/snippet}
		{#snippet status()}<span class={[pill, statusClass]}>{statusLabel}</span>{/snippet}
		{#snippet lede()}
			We offer the wallet a credential signed with an ECDSA Data Integrity proof and watch whether
			it verifies and stores it.
		{/snippet}
		{#snippet chips()}
			<ContextChip kind="role" label="Wallet" href="#wallet" />
			<ContextChip kind="profile" label="VCALM" href="#vcalm" />
			<ContextChip kind="addon" label="Data Integrity Cryptosuites" href="#dic" />
		{/snippet}
		{#snippet meta()}
			<span>Tests against</span>
			<a href="#vcalm-spec" class={link}>VCALM 1.0 §3.4 ↗</a>
			<a href="#di-spec" class={link}>VC Data Integrity 1.0 §4.2 ↗</a>
			<a href="#ecdsa-spec" class={link}>VC DI ECDSA §3.2 ↗</a>
		{/snippet}
	</PageHero>
{/snippet}

<Story name="Scenario — passed" asChild>
	<HeroReviewMatrix perspective="builder">
		{#snippet hero(perspective, onChange)}
			{@render scenarioHero(
				perspective,
				onChange,
				'Passed',
				'border-result-pass-border bg-result-pass-soft text-result-pass'
			)}
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Scenario — in progress" asChild>
	<HeroReviewMatrix>
		{#snippet hero(perspective, onChange)}
			{@render scenarioHero(
				perspective,
				onChange,
				'In progress',
				'border-live-border bg-live-soft text-live'
			)}
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Scenario — unavailable here" asChild>
	<HeroReviewMatrix perspective="evaluator">
		{#snippet hero(perspective, onChange)}
			{@render scenarioHero(
				perspective,
				onChange,
				'Unavailable here',
				'border-border bg-muted/40 text-muted-foreground'
			)}
		{/snippet}
	</HeroReviewMatrix>
</Story>

<Story name="Badge" asChild>
	<HeroReviewMatrix perspective="builder">
		{#snippet hero(perspective, onChange)}
			<PageHero {perspective} onPerspectiveChange={onChange}>
				{#snippet breadcrumb()}
					<a href="#home" class={crumbLink}>Home</a>
					<span aria-hidden="true">›</span>
					<a href="#vcalm" class={crumbLink}>VCALM</a>
				{/snippet}
				{#snippet eyebrow()}Badge{/snippet}
				{#snippet title()}VCALM Wallet Essentials{/snippet}
				{#snippet lede()}
					Awarded for passing every Essential wallet scenario over VCALM in the LER Interoperability
					Test Suite, self-verified against a live wallet.
				{/snippet}
				{#snippet chips()}
					<ContextChip kind="role" label="Wallet" href="#wallet" />
					<ContextChip kind="profile" label="VCALM" href="#vcalm" />
				{/snippet}
			</PageHero>
		{/snippet}
	</HeroReviewMatrix>
</Story>
