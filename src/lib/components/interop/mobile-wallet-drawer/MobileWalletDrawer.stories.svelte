<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { MobileWalletDrawer } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/MobileWalletDrawer',
		component: MobileWalletDrawer
	});
</script>

{#snippet mockContent()}
	<section class="rounded-md border border-result-pass-border bg-result-pass-soft p-4">
		<p class="text-label-md text-success uppercase">Verified</p>
		<p class="text-body-md text-foreground">No MUST requirements failed.</p>
	</section>
	<section class="space-y-2 rounded-md border border-live-border bg-live-soft p-5">
		<p class="text-label-md text-live uppercase">Test wallet</p>
		<p class="text-body-md text-foreground">Result card + test wallet live here on the page.</p>
	</section>
{/snippet}

<!--
	On lg and up the content renders inline (Storybook's default desktop viewport). Switch to a
	mobile viewport to see the live-colored edge handle; tapping it slides the drawer in. The
	"Open on mobile" story starts expanded so the drawer chrome is visible at any width.
-->
<Story name="Inline (desktop) / edge handle (mobile)" asChild>
	<div class="mx-auto min-h-72 max-w-md bg-background p-6">
		<MobileWalletDrawer>
			{@render mockContent()}
		</MobileWalletDrawer>
	</div>
</Story>

<Story name="Open on mobile" asChild>
	<div class="min-h-96 bg-background p-6">
		<MobileWalletDrawer open>
			{@render mockContent()}
		</MobileWalletDrawer>
	</div>
</Story>

<!-- Idle state: an inline full-width CTA (mobile) opens the drawer, in place of the edge handle. -->
<Story name="Idle CTA (mobile)" asChild>
	<div class="mx-auto min-h-72 max-w-md bg-background p-6">
		<MobileWalletDrawer ctaLabel="Run the test wallet">
			{@render mockContent()}
		</MobileWalletDrawer>
	</div>
</Story>
