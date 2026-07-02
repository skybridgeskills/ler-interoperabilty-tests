<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		combinationFor,
		roleBySlug,
		type StepRunState,
		workflowBySlug
	} from '$lib/interop/index.js';

	import { ExchangeRunnerPanel } from '../exchange-runner/index.js';
	import {
		RequirementStatusRow,
		stepStateToRequirementStatus
	} from '../requirement-status-row/index.js';

	import { RunnableChecklist } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableChecklist',
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

	// Step-derived requirement status, mirroring what `RunnableWalletAcceptancePage`
	// passes: every requirement in a step shares its parent step's run state.
	function statusFor(steps: StepRunState[], stepIndex: number) {
		return stepStateToRequirementStatus(steps[stepIndex] ?? 'pending');
	}
</script>

<Story name="Idle" asChild>
	<div class="mx-auto max-w-6xl bg-background p-8">
		<RunnableChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			runState="idle"
			perStep={allPending}
		>
			{#snippet rightColumn()}
				<ExchangeRunnerPanel data={{ run: 'idle', perStep: allPending }} actions={noopActions} />
			{/snippet}
			{#snippet requirementState({ requirement, stepIndex })}
				<RequirementStatusRow {requirement} status={statusFor(allPending, stepIndex)} />
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
			runState="awaiting-wallet"
			perStep={awaitingPerStep}
		>
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						run: 'awaiting-wallet',
						perStep: awaitingPerStep,
						interactionUrl: 'http://localhost:4004/interactions/example-uuid-1234',
						exchangeId: 'example-uuid-1234'
					}}
					actions={noopActions}
				/>
			{/snippet}
			{#snippet requirementState({ requirement, stepIndex })}
				<RequirementStatusRow {requirement} status={statusFor(awaitingPerStep, stepIndex)} />
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
			runState="wallet-connected"
			perStep={connectedPerStep}
		>
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						run: 'wallet-connected',
						perStep: connectedPerStep,
						interactionUrl: 'http://localhost:4004/interactions/example-uuid-1234',
						exchangeId: 'example-uuid-1234'
					}}
					actions={noopActions}
				/>
			{/snippet}
			{#snippet requirementState({ requirement, stepIndex })}
				<RequirementStatusRow {requirement} status={statusFor(connectedPerStep, stepIndex)} />
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
			runState="awaiting-wallet"
			perStep={oid4AwaitingPerStep}
		>
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
						run: 'awaiting-wallet',
						perStep: oid4AwaitingPerStep,
						interactionUrl: oid4vciUrl,
						headerLabel: 'Live · OID4VCI offer',
						exchangeId: 'example-uuid-1234'
					}}
					actions={noopActions}
				/>
			{/snippet}
			{#snippet requirementState({ requirement, stepIndex })}
				<RequirementStatusRow {requirement} status={statusFor(oid4AwaitingPerStep, stepIndex)} />
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
			runState="complete"
			perStep={allComplete}
		>
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{ run: 'complete', perStep: allComplete, exchangeId: 'example-uuid-1234' }}
					actions={{ ...noopActions, onReset: () => {} }}
				/>
			{/snippet}
			{#snippet requirementState({ requirement, stepIndex })}
				<RequirementStatusRow {requirement} status={statusFor(allComplete, stepIndex)} />
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
			runState="error"
			perStep={allSkipped}
		>
			{#snippet rightColumn()}
				<ExchangeRunnerPanel
					data={{
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
			{#snippet requirementState({ requirement, stepIndex })}
				<RequirementStatusRow {requirement} status={statusFor(allSkipped, stepIndex)} />
			{/snippet}
		</RunnableChecklist>
	</div>
</Story>
