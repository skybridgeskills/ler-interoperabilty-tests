<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { DeliverableCredentialPanel } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/DeliverableCredentialPanel',
		component: DeliverableCredentialPanel,
		parameters: {
			docs: {
				description: {
					component:
						'The action panel a `deliver-direct` step renders: the signed credential the operator downloads or copies and hands to the system under test. The heading and filename use the step’s neutral label — never the pass kind — so nothing leaks the concealed right answer.'
				}
			}
		}
	});

	// A well-formed OB3-shaped credential. Only its shape matters to the panel.
	const credential = {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id: 'urn:uuid:1f1c0d2e-0000-4000-8000-000000000000',
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		name: 'LER Interop Test Credential',
		issuer: { id: 'did:key:z6MkExampleIssuer', type: ['Profile'] },
		credentialSubject: { id: 'did:key:z6MkExampleHolder', type: ['AchievementSubject'] },
		proof: { type: 'DataIntegrityProof', cryptosuite: 'eddsa-rdfc-2022', proofValue: 'z2example' }
	};
</script>

<Story name="Default — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">
			<DeliverableCredentialPanel {credential} label="Credential 1" />
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				<DeliverableCredentialPanel {credential} label="Credential 1" />
			</div>
		</div>
	</div>
</Story>
