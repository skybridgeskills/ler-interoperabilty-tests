<script lang="ts">
	import { RequirementReport } from '$lib/components/interop/issuer-runner/requirement-report/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	import type { PresentError, PresentResult } from './present-result.js';

	/**
	 * Presentational panel for the OID4VP presentation runner. The parent owns
	 * the run lifecycle (parsing, calling the present endpoint, recording
	 * history). The textarea value is reported up via `onInput`; everything else
	 * (busy flag, error, result) is passed down.
	 */
	let {
		requestText = '',
		requestUri = '',
		busy = false,
		error,
		result,
		onInput,
		onUriInput,
		onPresent
	}: {
		/** The pasted OID4VP authorization request JSON. */
		requestText?: string;
		/** A `request_uri` the wallet fetches the request from (takes precedence over the paste). */
		requestUri?: string;
		/** True while a presentation run is in flight (disables the action). */
		busy?: boolean;
		/** Error affordance, if the last run failed. */
		error?: PresentError;
		/** Outcome of the last completed run, if any. */
		result?: PresentResult;
		/** Report textarea edits up to the parent. */
		onInput: (value: string) => void;
		/** Report request_uri edits up to the parent. */
		onUriInput: (value: string) => void;
		/** Kick off (or re-run) the presentation flow. */
		onPresent: () => void | Promise<void>;
	} = $props();

	const format = (value: unknown): string => JSON.stringify(value, null, 2);
</script>

<div class="space-y-4 rounded-md border border-live-border bg-live-soft p-5">
	<p class="text-label-md text-live">Built-in test wallet</p>
	<h3 class="text-headline-md text-foreground">Present a credential over OID4VP</h3>
	<p class="text-body-md text-foreground">
		Provide the verifier’s OID4VP authorization request — either a <code>request_uri</code> the
		wallet fetches, or pasted JSON below. The suite’s test wallet matches a held credential, builds
		and signs the <code>vp_token</code>, submits it, and checks the result against the conformance
		requirements.
	</p>

	<label class="block space-y-2">
		<span class="text-label-md text-foreground">request_uri (optional — fetched by the wallet)</span
		>
		<input
			type="url"
			value={requestUri}
			oninput={(e) => onUriInput(e.currentTarget.value)}
			placeholder="https://verifier.example/oid4vp/request/abc"
			class="text-body-sm w-full rounded-md border border-input bg-background p-2 font-mono text-foreground"
		/>
	</label>

	<label class="block space-y-2">
		<span class="text-label-md text-foreground"
			>OID4VP authorization request (JSON — used when no request_uri)</span
		>
		<textarea
			value={requestText}
			oninput={(e) => onInput(e.currentTarget.value)}
			rows="8"
			spellcheck="false"
			placeholder={'{\n  "response_type": "vp_token",\n  "presentation_definition": { ... },\n  "response_uri": "https://verifier.example/oid4vp/response"\n}'}
			class="text-body-sm w-full rounded-md border border-input bg-background p-3 font-mono text-foreground"
		></textarea>
	</label>

	<Button
		type="button"
		class="bg-live text-live-foreground hover:bg-live/90"
		disabled={busy}
		onclick={() => void onPresent()}
	>
		{busy ? 'Presenting…' : result ? 'Present again' : 'Present credential'}
	</Button>
</div>

{#if error}
	<div class="space-y-1 rounded-md border border-destructive bg-destructive/5 p-4">
		<p class="text-label-md text-destructive">Presentation failed</p>
		<p class="text-body-md text-foreground">{error.message}</p>
		{#if error.hint}
			<p class="text-body-sm text-muted-foreground">{error.hint}</p>
		{/if}
	</div>
{/if}

{#if result}
	<div class="space-y-2 rounded-md border border-border bg-card p-5">
		<h3 class="text-headline-md text-foreground">Presentation status</h3>
		<ul class="space-y-1 text-body-md text-foreground">
			<li>Credential matched: <strong>{result.matched ? 'yes' : 'no'}</strong></li>
			<li>VP verified: <strong>{result.verify.verified ? 'yes' : 'no'}</strong></li>
			<li>Submitted to verifier: <strong>{result.submitted ? 'yes' : 'no'}</strong></li>
		</ul>
		{#if result.verify.errors && result.verify.errors.length > 0}
			<div class="space-y-1">
				<p class="text-label-md text-foreground">Verification errors</p>
				<ul class="text-body-sm list-disc space-y-1 pl-5 text-destructive">
					{#each result.verify.errors as err (err)}
						<li>{err}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if result.submissionError}
			<p class="text-body-sm text-destructive">Submission error: {result.submissionError}</p>
		{/if}

		{#if result.vpToken !== undefined}
			<details>
				<summary class="cursor-pointer text-label-md text-foreground">vp_token</summary>
				<pre
					class="text-body-sm mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-foreground">{format(
						result.vpToken
					)}</pre>
			</details>
		{/if}
		{#if result.presentationSubmission !== undefined}
			<details>
				<summary class="cursor-pointer text-label-md text-foreground"
					>presentation_submission</summary
				>
				<pre
					class="text-body-sm mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-foreground">{format(
						result.presentationSubmission
					)}</pre>
			</details>
		{/if}
		{#if result.submissionResult !== undefined}
			<details>
				<summary class="cursor-pointer text-label-md text-foreground">submission_result</summary>
				<pre
					class="text-body-sm mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-foreground">{format(
						result.submissionResult
					)}</pre>
			</details>
		{/if}
	</div>

	<RequirementReport report={result.report} />
{/if}
