import type { CredentialRecipe } from '../credential-recipes.js';

import { minimalOb3 } from './minimal-ob3.js';

/**
 * A tiny self-contained badge image, inlined as a data URI so the credential
 * carries a real picture with no network fetch — small on purpose, since it
 * rides in every issuance of this recipe.
 */
const badgeImage =
	'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSIxNiIgZmlsbD0iIzQzMzhjYSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDgiIHI9IjI2IiBmaWxsPSIjYTViNGZjIi8+PHRleHQgeD0iNjAiIHk9IjU1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9IjcwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzFlMWI0YiI+T0lENDwvdGV4dD48dGV4dCB4PSI2MCIgeT0iOTgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEzIiBmb250LXdlaWdodD0iNjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZTBlN2ZmIj5XQUxMRVQ8L3RleHQ+PC9zdmc+';

/**
 * {@link minimalOb3} decorated to the hilt — an `image`, a detailed achievement
 * (`name`, multi-sentence `description`, `criteria`, `alignment`, its own
 * `image`), and a distinct top-level `name`/`description`. Everything a wallet
 * can *render* is present, so the operator can judge whether it rendered it.
 *
 * Costs nothing to author: rich achievement content, images and alignments all
 * ride in the caller-supplied `vc` and survive to the wallet untouched — the
 * services overwrite only `credentialSubject.id`, `credentialStatus`,
 * `issuer.id` and `proof`. It stays OB3-valid to the same bar as `minimal-ob3`
 * (object `issuer` with a placeholder `id`, an `Achievement.description`, a
 * top-level `description`), because it is built *from* it and only adds fields.
 */
export const richOb3: CredentialRecipe = {
	id: 'rich-ob3',
	summary:
		'A fully-decorated Open Badges 3.0 credential — image, rich achievement, alignment — for a faithful-rendering test.',
	build: (args) => {
		const base = minimalOb3.build(args);
		const subject = base.credentialSubject as Record<string, unknown>;
		const achievement = subject.achievement as Record<string, unknown>;
		return {
			...base,
			name: 'LER Interop Faithful-Rendering Credential',
			description:
				'A richly decorated Open Badges 3 credential — carrying an image, a detailed achievement, criteria and an alignment — issued by the LER Interoperability Test Suite to exercise faithful wallet rendering.',
			image: { id: badgeImage, type: 'Image' },
			credentialSubject: {
				...subject,
				achievement: {
					...achievement,
					id: 'urn:uuid:lits-faithful-rendering-achievement',
					name: 'Rendered a decorated Open Badge faithfully',
					description:
						'Holder accepted a fully-decorated Open Badges 3.0 credential — an image, a detailed achievement description, criteria and an alignment — and the wallet displayed it faithfully rather than as raw data or nothing at all.',
					image: { id: badgeImage, type: 'Image' },
					criteria: {
						narrative:
							'Open the LER Interoperability Test Suite, offer the decorated credential to the wallet under test, complete the exchange, and confirm the wallet renders the image, achievement name and description.'
					},
					alignment: [
						{
							type: ['Alignment'],
							targetName: 'Open Badges 3.0 Achievement rendering',
							targetUrl: 'https://www.imsglobal.org/spec/ob/v3p0/'
						}
					]
				}
			}
		};
	}
};
