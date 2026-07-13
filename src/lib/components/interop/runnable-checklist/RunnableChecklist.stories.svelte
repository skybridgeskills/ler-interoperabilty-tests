<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		combinationFor,
		roleBySlug,
		type StepRunState,
		workflowBySlug
	} from '$lib/interop/index.js';

	import { ExchangeRunnerPanel } from '../exchange-runner/index.js';
	import { statusesFromStepStates } from '../requirement-status-row/index.js';

	import { RunnableChecklist, RunStateBadge } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/RunnableChecklist',
		component: RunnableChecklist
	});

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-acceptance')!;
	const combo = combinationFor('wallet', 'credential-acceptance', 'vcalm')!;
	const stepCount = combo.checklist.steps.length;
	const noopActions = { onInitiate: () => {} };

	const allPending: StepRunState[] = Array.from({ length: stepCount }, () => 'pending');
	const allComplete: StepRunState[] = Array.from({ length: stepCount }, () => 'complete');
	const allSkipped: StepRunState[] = Array.from({ length: stepCount }, () => 'skipped');
	const awaitingPerStep: StepRunState[] = ['in-flight', 'pending', 'pending', 'pending', 'pending'];
	const connectedPerStep: StepRunState[] = [
		'complete',
		'complete',
		'in-flight',
		'pending',
		'pending'
	];

	// OID4VCI wallet-credential-acceptance has 4 steps and presents the OID4VCI
	// deep link (single-protocol panel — no toggle).
	const oid4Combo = combinationFor('wallet', 'credential-acceptance', 'oid4')!;
	const oid4AwaitingPerStep: StepRunState[] = ['in-flight', 'pending', 'pending', 'pending'];
	const oid4vciUrl =
		'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fexample-uuid-1234%2Fopenid%2Fcredential-offer';

	// Step-derived requirement statuses, mirroring what `RunnableWalletAcceptancePage`
	// passes: every requirement in a step shares its parent step's run state.
	const pendingStatuses = statusesFromStepStates(combo.checklist.steps, allPending);
	const awaitingStatuses = statusesFromStepStates(combo.checklist.steps, awaitingPerStep);
	const connectedStatuses = statusesFromStepStates(combo.checklist.steps, connectedPerStep);
	const completeStatuses = statusesFromStepStates(combo.checklist.steps, allComplete);
	const skippedStatuses = statusesFromStepStates(combo.checklist.steps, allSkipped);
	const oid4AwaitingStatuses = statusesFromStepStates(
		oid4Combo.checklist.steps,
		oid4AwaitingPerStep
	);
</script>

<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			statuses={pendingStatuses}
		>
			{#snippet headerBadge()}
				<RunStateBadge runState="idle" />
			{/snippet}
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{ intent: 'issuance', protocol: 'vcalm', run: 'idle', perStep: allPending }}
					actions={noopActions}
				/>
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>

<Story name="Awaiting wallet" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			statuses={awaitingStatuses}
		>
			{#snippet headerBadge()}
				<RunStateBadge runState="awaiting-wallet" />
			{/snippet}
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						intent: 'issuance',
						protocol: 'vcalm',
						run: 'awaiting-wallet',
						perStep: awaitingPerStep,
						interactionUrl: 'http://localhost:4004/interactions/example-uuid-1234',
						exchangeId: 'example-uuid-1234'
					}}
					actions={noopActions}
				/>
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>

<Story name="Wallet connected" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			statuses={connectedStatuses}
		>
			{#snippet headerBadge()}
				<RunStateBadge runState="wallet-connected" />
			{/snippet}
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						intent: 'issuance',
						protocol: 'vcalm',
						run: 'wallet-connected',
						perStep: connectedPerStep,
						interactionUrl: 'http://localhost:4004/interactions/example-uuid-1234',
						exchangeId: 'example-uuid-1234'
					}}
					actions={noopActions}
				/>
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>

<Story name="Awaiting wallet — OID4VCI" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={oid4Combo.checklist}
			profile={oid4Combo.profile}
			{workflow}
			{role}
			statuses={oid4AwaitingStatuses}
		>
			{#snippet headerBadge()}
				<RunStateBadge runState="awaiting-wallet" />
			{/snippet}
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						intent: 'issuance',
						protocol: 'oid4vci',
						run: 'awaiting-wallet',
						perStep: oid4AwaitingPerStep,
						interactionUrl: oid4vciUrl,
						exchangeId: 'example-uuid-1234'
					}}
					actions={noopActions}
				/>
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>

<Story name="Complete" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			statuses={completeStatuses}
		>
			{#snippet headerBadge()}
				<RunStateBadge runState="complete" />
			{/snippet}
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						intent: 'issuance',
						protocol: 'vcalm',
						run: 'complete',
						perStep: allComplete,
						exchangeId: 'example-uuid-1234'
					}}
					actions={{ ...noopActions, onReset: () => {} }}
				/>
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>

<Story name="Error / unreachable" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			statuses={skippedStatuses}
		>
			{#snippet headerBadge()}
				<RunStateBadge runState="error" />
			{/snippet}
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						intent: 'issuance',
						protocol: 'vcalm',
						run: 'error',
						perStep: allSkipped,
						error: {
							message: 'Cannot reach the local DCC transaction service.',
							hint: 'Run `pnpm turbo dev:full` to start the dependency services.'
						}
					}}
					actions={noopActions}
				/>
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>
