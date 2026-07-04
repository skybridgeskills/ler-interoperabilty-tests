<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { WalletArtifact } from '../test-wallet-types.js';

	import WalletArtifactCard from './WalletArtifactCard.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/WalletArtifactCard',
		component: WalletArtifactCard
	});

	const verified: WalletArtifact = {
		kind: 'credential',
		title: 'CourseCompletionCredential',
		issuer: 'did:web:issuer.example',
		issuanceDate: '2026-06-30',
		verified: true,
		types: ['VerifiableCredential', 'OpenBadgeCredential']
	};

	const unverified: WalletArtifact = {
		kind: 'credential',
		title: 'CourseCompletionCredential',
		issuer: 'did:web:issuer.example',
		issuanceDate: '2026-06-30',
		verified: false,
		types: ['VerifiableCredential']
	};

	const minimal: WalletArtifact = {
		kind: 'credential',
		title: 'Untitled credential',
		verified: true
	};
</script>

<Story name="Verified" asChild>
	<div class="max-w-md bg-background p-6">
		<WalletArtifactCard artifact={verified} />
	</div>
</Story>

<Story name="Unverified" asChild>
	<div class="max-w-md bg-background p-6">
		<WalletArtifactCard artifact={unverified} />
	</div>
</Story>

<Story name="Minimal — title only" asChild>
	<div class="max-w-md bg-background p-6">
		<WalletArtifactCard artifact={minimal} />
	</div>
</Story>
