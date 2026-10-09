<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { ImportOutcome } from '$lib/client/scenario-runs/index.js';

	import { ResultsTransfer } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/ResultsTransfer',
		component: ResultsTransfer,
		parameters: {
			docs: {
				description: {
					component:
						'The homepage affordance for backing up results and moving them between machines. Wiring only — the parent supplies the export/import actions from `bundle-io`.'
				}
			}
		}
	});

	// Stub actions so the story is self-contained: no real download, no real store.
	const noopExport = () => {};
	const importOk = async (): Promise<ImportOutcome> => ({ ok: true, scenarios: 3, badges: 1 });
	const importFails = async (): Promise<ImportOutcome> => ({
		ok: false,
		error: 'This file is not a results bundle.'
	});
</script>

<Story name="Default — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">
			<ResultsTransfer onExport={noopExport} onImport={importOk} />
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				<ResultsTransfer onExport={noopExport} onImport={importOk} />
			</div>
		</div>
	</div>
</Story>

<Story name="Import succeeds" asChild>
	<div class="max-w-xl bg-background p-6">
		<ResultsTransfer onExport={noopExport} onImport={importOk} />
	</div>
</Story>

<Story name="Import fails" asChild>
	<div class="max-w-xl bg-background p-6">
		<ResultsTransfer onExport={noopExport} onImport={importFails} />
	</div>
</Story>
