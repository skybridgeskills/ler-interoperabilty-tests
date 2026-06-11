<script lang="ts">
	import { recordRun } from '$lib/client/run-history/index.js';
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist/index.js';
	import {
		combinationFor,
		roleBySlug,
		walletRunRecord,
		workflowBySlug,
		type ChecklistRunState,
		type StepRunState
	} from '$lib/interop/index.js';

	import { PresentPanel, type PresentError, type PresentResult } from './present-panel/index.js';

	// The runnable wallet credential-presentation page (OID4VP). `profile` is
	// fixed to `oid4` for the lifetime of the mount, so deriving the
	// combination/step-count as plain consts is correct.
	const profile = 'oid4';
	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-presentation')!;
	const combo = combinationFor('wallet', 'credential-presentation', profile)!;
	const stepCount = combo.checklist.steps.length;

	let requestText = $state('');
	let requestUri = $state('');
	let busy = $state(false);
	let runState = $state<ChecklistRunState>('idle');
	let perStep = $state<StepRunState[]>(Array.from({ length: stepCount }, () => 'pending'));
	let runnerError = $state<PresentError | undefined>(undefined);
	let result = $state<PresentResult | undefined>(undefined);

	function setError(error: PresentError) {
		runState = 'error';
		runnerError = error;
		perStep = Array.from({ length: stepCount }, () => 'skipped');
	}

	/**
	 * Parse the textarea as the OID4VP authorization request, drive the test
	 * wallet via `POST /api/wallet-runner/present`, render the constructed
	 * response + conformance report, and record the run. Invalid JSON and
	 * non-2xx responses surface a friendly error affordance.
	 */
	async function present() {
		if (busy) return;
		busy = true;
		runnerError = undefined;
		result = undefined;

		// A request_uri (fetched server-side by the wallet) takes precedence; otherwise parse the
		// pasted JSON request object.
		const uri = requestUri.trim();
		let payload: { requestUri: string } | { request: unknown };
		if (uri) {
			payload = { requestUri: uri };
		} else {
			try {
				payload = { request: JSON.parse(requestText) };
			} catch {
				busy = false;
				setError({
					message: 'The pasted text is not valid JSON.',
					hint: 'Paste the verifier’s OID4VP authorization request as a JSON object, or provide a request_uri.'
				});
				return;
			}
		}

		try {
			const res = await fetch('/api/wallet-runner/present', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as PresentError;
				setError({
					message: body.message ?? `Present responded ${res.status}`,
					hint: body.hint ?? 'Check the OID4VP request shape and the verifier availability.'
				});
				return;
			}

			const data = (await res.json()) as PresentResult;
			result = data;

			const passed = data.matched && data.verify.verified && data.submitted;
			runState = passed ? 'complete' : 'error';
			perStep = Array.from({ length: stepCount }, () => (passed ? 'complete' : 'skipped'));
			runnerError = passed
				? undefined
				: {
						message: `${data.failingMustCount} MUST requirement${
							data.failingMustCount === 1 ? '' : 's'
						} failed, or the presentation was not matched/verified/submitted.`,
						hint: 'See the constructed response and conformance report below for details.'
					};

			recordRun(
				walletRunRecord({
					role: 'wallet',
					workflow: 'credential-presentation',
					profile,
					verified: data.verify.verified,
					failingMustCount: data.failingMustCount,
					exchangeState: passed ? 'complete' : 'invalid'
				})
			);
		} catch (e) {
			setError({
				message: e instanceof Error ? e.message : String(e),
				hint: 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
			});
		} finally {
			busy = false;
		}
	}
</script>

<RunnableChecklist
	checklist={combo.checklist}
	profile={combo.profile}
	{workflow}
	{role}
	{runState}
	{perStep}
>
	{#snippet rightColumn()}
		<PresentPanel
			{requestText}
			{requestUri}
			{busy}
			error={runnerError}
			{result}
			onInput={(value) => (requestText = value)}
			onUriInput={(value) => (requestUri = value)}
			onPresent={present}
		/>
	{/snippet}
</RunnableChecklist>
