export { rawScoreFixture } from './raw-score.js';
export { percentFixture } from './percent.js';
export { rubricCriterionLevelFixture } from './rubric-criterion-level.js';

import { percentFixture } from './percent.js';
import { rawScoreFixture } from './raw-score.js';
import { rubricCriterionLevelFixture } from './rubric-criterion-level.js';

/** Tagged union of supported result-type fixtures keyed by display id. */
export const sampleCredentialsByResultType = {
	RawScore: rawScoreFixture,
	Percent: percentFixture,
	RubricCriterionLevel: rubricCriterionLevelFixture
} as const;

export type SampleResultType = keyof typeof sampleCredentialsByResultType;

/** Pretty-printable list of supported result types (display order). */
export const sampleResultTypes: readonly SampleResultType[] = [
	'RawScore',
	'Percent',
	'RubricCriterionLevel'
];
