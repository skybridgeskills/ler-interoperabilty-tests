<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { Button } from '$lib/components/ui/button/index.js';

	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from './index.js';

	const { Story } = defineMeta({
		title: 'UI/Dialog',
		component: Dialog
	});
</script>

<Story name="Default" asChild>
	<div class="bg-background p-6">
		<Dialog>
			<DialogTrigger>
				{#snippet child({ props })}
					<Button {...props}>Open dialog</Button>
				{/snippet}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Run interop check?</DialogTitle>
					<DialogDescription>
						This will exercise your wallet against ten standard credential fixtures and report any
						deviations.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button>Run check</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
</Story>
