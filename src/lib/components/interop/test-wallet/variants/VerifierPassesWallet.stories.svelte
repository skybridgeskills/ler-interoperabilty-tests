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
