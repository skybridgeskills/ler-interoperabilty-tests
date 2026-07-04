<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { PassArtifactView } from './pass-artifact-view.js';
	import PassArtifactCard from './PassArtifactCard.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/PassArtifactCard',
		component: PassArtifactCard
	});

	const JSON_BODY = JSON.stringify(
		{
			'@context': ['https://www.w3.org/ns/credentials/v2'],
			type: ['VerifiableCredential', 'OpenBadgeCredential'],
			issuer: 'did:key:z6Mk…',
			validFrom: '2026-06-30T00:00:00Z'
		},
		null,
		2
	);

	const awaiting: PassArtifactView = {
		title: 'Credential 2',
		json: JSON_BODY,
		fileName: 'credential-2.json',
		note: 'Awaiting your verdict'
	};

	const reported: PassArtifactView = {
		title: 'Credential 1',
		json: JSON_BODY,
		fileName: 'credential-1.json',
		note: 'You reported: rejected — signature problem'
	};

	const revealedVerified: PassArtifactView = {
		title: 'Credential 1 — valid',
		json: JSON_BODY,
		fileName: 'credential-1.json',
		verified: true,
		note: 'You reported: accepted'
	};

	const revealedUnverified: PassArtifactView = {
		title: 'Credential 3 — broken signature',
		json: JSON_BODY,
		fileName: 'credential-3.json',
		verified: false,
		note: 'You reported: rejected — signature problem'
	};
</script>

<!-- Pre-reveal cards stay neutral: opaque credential title, no verified chip — only copy/download
     and the quiet verdict note. Post-reveal cards relabel to the revealed kind and gain the
     verified/unverified chip. Toggle the Storybook theme for light + dark. -->
<Story name="Awaiting verdict (pre-reveal)" asChild>
	<div class="max-w-md bg-background p-6">
		<PassArtifactCard pass={awaiting} />
	</div>
</Story>

<Story name="Verdict recorded (pre-reveal)" asChild>
	<div class="max-w-md bg-background p-6">
		<PassArtifactCard pass={reported} />
	</div>
</Story>

<Story name="Revealed — verified" asChild>
	<div class="max-w-md bg-background p-6">
		<PassArtifactCard pass={revealedVerified} />
	</div>
</Story>

<Story name="Revealed — unverified" asChild>
	<div class="max-w-md bg-background p-6">
		<PassArtifactCard pass={revealedUnverified} />
	</div>
</Story>
