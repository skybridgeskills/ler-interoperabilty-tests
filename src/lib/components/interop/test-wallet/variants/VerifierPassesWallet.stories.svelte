<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { WalletActivity } from '$lib/interop/wallet-activity.js';

	import type { PassArtifactView } from './pass-artifact-card/pass-artifact-view.js';
	import VerifierPassesWallet from './VerifierPassesWallet.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/VerifierPassesWallet',
		component: VerifierPassesWallet
	});

	const noop = () => {};

	const JSON_BODY = JSON.stringify(
		{
			'@context': ['https://www.w3.org/ns/credentials/v2'],
			type: ['VerifiableCredential', 'OpenBadgeCredential'],
			issuer: 'did:key:z6Mk…'
		},
		null,
		2
	);

	const passView = (n: number, extra?: Partial<PassArtifactView>): PassArtifactView => ({
		title: `Credential ${n}`,
		json: JSON_BODY,
		fileName: `credential-${n}.json`,
		...extra
	});

	// Mid-run: credential 1 answered, credential 2 handed over and awaiting the verdict.
	const midRunActivity: WalletActivity[] = [
		{
			id: 'run.started',
			kind: 'interaction',
			label: 'Started verifying — 4 credentials in a randomized order',
			status: 'ok'
		},
		{ id: 'p1.prepared', kind: 'interaction', label: 'Prepared credential 1 of 4', status: 'info' },
		{
			id: 'p1.handed',
			kind: 'interaction',
			label: 'Handed credential 1 of 4 to your verifier — over to you',
			status: 'info'
		},
		{
			id: 'p1.verdict',
			kind: 'interaction',
			label: 'You reported: rejected — signature problem',
			status: 'info'
		},
		{ id: 'p2.prepared', kind: 'interaction', label: 'Prepared credential 2 of 4', status: 'info' },
		{
			id: 'p2.handed',
			kind: 'interaction',
			label: 'Handed credential 2 of 4 to your verifier — over to you',
			status: 'info'
		}
	];

	const midRunPasses: PassArtifactView[] = [
		passView(1, { note: 'You reported: rejected — signature problem' }),
		passView(2, { note: 'Awaiting your verdict' })
	];

	const lastCredentialPasses: PassArtifactView[] = [
		passView(1, { note: 'You reported: accepted' }),
		passView(2, { note: 'You reported: rejected — expired' }),
		passView(3, { note: 'You reported: rejected — schema problem' }),
		passView(4, { note: 'Awaiting your verdict' })
	];

	// Revealed: the score report's check entries land in the same activity log.
	const revealedActivity: WalletActivity[] = [
		...midRunActivity,
		{
			id: 'run.scored',
			kind: 'interaction',
			label: 'Ground truth revealed — here is how your verifier did',
			status: 'ok'
		},
		{
			id: 'verifier-pass.p1',
			kind: 'check',
			label: 'Credential 1 — broken signature',
			detail:
				'Your verifier rejected the credential with a broken signature for the expected reason ("signature").',
			status: 'ok',
			stepIndex: 6
		},
		{
			id: 'verifier-pass.p2',
			kind: 'check',
			label: 'Credential 2 — valid',
			detail: 'Your verifier rejected a valid credential.',
			status: 'fail',
			stepIndex: 6
		}
	];

	const revealedPasses: PassArtifactView[] = [
		passView(1, {
			title: 'Credential 1 — broken signature',
			verified: false,
			note: 'You reported: rejected — signature problem'
		}),
		passView(2, {
			title: 'Credential 2 — valid',
			verified: true,
			note: 'You reported: rejected'
		})
	];
</script>

<!-- Idle: no initiation input — just the "Start verifying" action. -->
<Story name="Idle" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet state="idle" onStart={noop} onReset={noop} />
	</div>
</Story>

<!-- Mid-run question: the wallet asks inside its surface; the rejection-reason select
     only appears once "Rejected" is chosen. -->
<Story name="Mid-run — question open" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="running"
			busy
			activity={midRunActivity}
			passArtifacts={midRunPasses}
			currentPassNumber={2}
			totalPasses={4}
			onStart={noop}
			onConfirm={noop}
			onReset={noop}
		/>
	</div>
</Story>

<!-- Rejected selected: the reason select appears and the confirm advances. -->
<Story name="Mid-run — rejected chosen" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="running"
			busy
			activity={midRunActivity}
			passArtifacts={midRunPasses}
			currentPassNumber={2}
			totalPasses={4}
			verdict="rejected"
			reason="signature"
			onStart={noop}
			onConfirm={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Last credential" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="running"
			busy
			activity={midRunActivity}
			passArtifacts={lastCredentialPasses}
			currentPassNumber={4}
			totalPasses={4}
			verdict="accepted"
			onStart={noop}
			onConfirm={noop}
			onReset={noop}
		/>
	</div>
</Story>

<!-- Done: the reveal lives in the same activity log (per-credential check entries) and
     the artifact cards relabel to the revealed kinds with verified chips. -->
<Story name="Revealed — done" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="done"
			activity={revealedActivity}
			passArtifacts={revealedPasses}
			onStart={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Error" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet state="error" activity={midRunActivity} onStart={noop} onReset={noop} />
	</div>
</Story>

<!-- OID4VP idle: unlike direct delivery, the wallet takes the operator's presentation request
     as an initiation input before "Start verifying". -->
<Story name="OID4 — idle with request input" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="idle"
			inputLabel="Presentation request"
			inputPlaceholder="openid4vp://… (or a request_uri URL or the request JSON)"
			multiline
			actionLabel="Start verifying"
			onStart={noop}
			onReset={noop}
		/>
	</div>
</Story>

<!-- OID4VP per-credential request: credentials 2–4 need a request before the verdict question.
     `showVerdict={false}` gates the verdict until the credential has been presented. -->
<Story name="OID4 — awaiting fresh request" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="running"
			busy
			activity={midRunActivity}
			passArtifacts={midRunPasses}
			currentPassNumber={3}
			totalPasses={4}
			showVerdict={false}
			onStart={noop}
			onConfirm={noop}
			onReset={noop}
		>
			{#snippet requestField()}
				<div class="space-y-3">
					<p class="text-label-md text-muted-foreground uppercase">Credential 3</p>
					<p class="text-body-md font-medium text-foreground">
						Paste a fresh presentation request from your verifier
					</p>
					<label class="flex items-center gap-2 text-body-md text-foreground">
						<input type="checkbox" checked class="size-4 shrink-0 accent-live" />
						Use the same request as the last credential
					</label>
					<button
						type="button"
						class="rounded-md bg-live px-3 py-2 text-body-md text-live-foreground"
					>
						Present credential 3
					</button>
				</div>
			{/snippet}
		</VerifierPassesWallet>
	</div>
</Story>

<!-- OID4VP transport retry: the present did not reach the endpoint, so a fresh-request field and a
     note appear ABOVE the verdict question — the operator can re-present or record the verdict. -->
<Story name="OID4 — transport retry" asChild>
	<div class="max-w-md bg-background p-6">
		<VerifierPassesWallet
			state="running"
			busy
			activity={midRunActivity}
			passArtifacts={midRunPasses}
			currentPassNumber={2}
			totalPasses={4}
			onStart={noop}
			onConfirm={noop}
			onReset={noop}
		>
			{#snippet requestField()}
				<div class="space-y-3">
					<p class="text-label-md text-muted-foreground uppercase">Credential 2</p>
					<textarea
						class="text-body-sm min-h-32 w-full rounded-md border border-border bg-card p-3 font-mono text-foreground"
						rows="4"
						placeholder="openid4vp://…"
					></textarea>
					<p class="text-body-sm text-warning">
						The presentation was not accepted at the response endpoint. If your verifier one-times
						its requests, paste a fresh one and re-present; otherwise record the verdict below.
					</p>
					<button
						type="button"
						class="rounded-md bg-live px-3 py-2 text-body-md text-live-foreground"
					>
						Re-present credential 2
					</button>
				</div>
			{/snippet}
		</VerifierPassesWallet>
	</div>
</Story>
