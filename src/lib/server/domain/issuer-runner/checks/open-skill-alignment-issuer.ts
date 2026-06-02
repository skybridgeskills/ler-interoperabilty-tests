import { classifyTargetUrl } from '../ctdl-allowlist.js';

import { subjectOf } from './ob3-direct-delivery-issuer.js';
import type { CheckFn, CheckResult } from './types.js';

/**
 * Check functions for the Open Skill Alignment additive issuer
 * checklist. Keys match the requirement ids in
 * `src/lib/interop/additive-profiles/open-skill-alignment/issuer-direct-credential-issuance.ts`.
 *
 * Every additive check first guards on `includeAdditive`. When the
 * runner toggle is off, the check returns `'n/a'` so the rows still
 * render but don't mislead.
 */
export const openSkillAlignmentIssuerChecks: Record<string, CheckFn> = {
	'open-skill-alignment.result-description.present': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const descriptions = descriptionsOf(credential);
		if (!descriptions || descriptions.length === 0) {
			return {
				status: 'fail',
				message:
					'`credentialSubject.achievement.resultDescription[]` MUST include at least one entry.'
			};
		}
		return {
			status: 'pass',
			message: `Found ${descriptions.length} resultDescription entr${descriptions.length === 1 ? 'y' : 'ies'}.`
		};
	},

	'open-skill-alignment.result-description.recognized-result-type': ({
		credential,
		includeAdditive
	}) => {
		if (!includeAdditive) return additiveOff();
		const descriptions = descriptionsOf(credential);
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');
		const recognized = new Set(['RawScore', 'Percent', 'RubricCriterionLevel']);
		const unknownTypes = descriptions
			.map((d) => d?.resultType)
			.filter((t): t is string => typeof t === 'string' && !recognized.has(t));
		if (unknownTypes.length > 0) {
			return {
				status: 'fail',
				message: `Unrecognized resultType(s): ${[...new Set(unknownTypes)].join(', ')}. Supported: RawScore, Percent, RubricCriterionLevel.`
			};
		}
		return {
			status: 'pass',
			message: 'Every resultDescription uses a supported resultType.'
		};
	},

	'open-skill-alignment.result-description.percent-value-range': ({
		credential,
		includeAdditive
	}) => {
		if (!includeAdditive) return additiveOff();
		const descriptions = descriptionsOf(credential);
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');
		const percents = descriptions.filter((d) => d?.resultType === 'Percent');
		if (percents.length === 0) {
			return { status: 'n/a', message: 'No `Percent` resultDescription entries.' };
		}
		const offenders = percents.filter((d) => d?.valueMin !== '0' || d?.valueMax !== '100');
		if (offenders.length > 0) {
			return {
				status: 'fail',
				message: `${offenders.length} Percent resultDescription entr${offenders.length === 1 ? 'y' : 'ies'} missing the required \`valueMin: "0"\` / \`valueMax: "100"\`.`
			};
		}
		return {
			status: 'pass',
			message: 'All Percent descriptions declare valueMin=0 / valueMax=100.'
		};
	},

	'open-skill-alignment.result-description.rubric-levels-present': ({
		credential,
		includeAdditive
	}) => {
		if (!includeAdditive) return additiveOff();
		const descriptions = descriptionsOf(credential);
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');
		const rubrics = descriptions.filter((d) => d?.resultType === 'RubricCriterionLevel');
		if (rubrics.length === 0) {
			return { status: 'n/a', message: 'No `RubricCriterionLevel` resultDescription entries.' };
		}
		const empty = rubrics.filter(
			(d) => !Array.isArray(d?.rubricCriterionLevel) || d.rubricCriterionLevel.length === 0
		);
		if (empty.length > 0) {
			return {
				status: 'fail',
				message: `${empty.length} RubricCriterionLevel description${empty.length === 1 ? '' : 's'} missing a non-empty rubricCriterionLevel[].`
			};
		}
		return {
			status: 'pass',
			message: 'All RubricCriterionLevel descriptions declare at least one level.'
		};
	},

	'open-skill-alignment.result-description.ctdl-alignment': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const descriptions = descriptionsOf(credential);
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');
		const urls = descriptions
			.flatMap((d) => d?.alignment ?? [])
			.map((a) => (a as { targetUrl?: unknown })?.targetUrl);
		if (urls.length === 0) {
			return {
				status: 'warn',
				message:
					'No alignment.targetUrl entries to classify; SHOULD include CTDL alignments on resultDescription[].'
			};
		}
		const failed = urls.filter((u) => classifyTargetUrl(u) === 'fail');
		if (failed.length > 0) {
			return {
				status: 'fail',
				message: `${failed.length} alignment.targetUrl value(s) are not valid URLs.`
			};
		}
		const warned = urls.filter((u) => classifyTargetUrl(u) === 'warn');
		if (warned.length > 0) {
			const hosts = [...new Set(warned.map((u) => safeHost(u as string)))];
			return {
				status: 'warn',
				message: `${warned.length} alignment.targetUrl(s) are valid URLs but outside the CTDL Credential Registry allowlist (hosts: ${hosts.join(', ')}). Additional blessed registries may be added later.`
			};
		}
		return {
			status: 'pass',
			message: `${urls.length} alignment.targetUrl(s) all match the CTDL Credential Registry allowlist.`
		};
	},

	'open-skill-alignment.result.present': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const results = resultsOf(credential);
		if (!results || results.length === 0) {
			return {
				status: 'fail',
				message: '`credentialSubject.result[]` MUST include at least one entry.'
			};
		}
		return {
			status: 'pass',
			message: `Found ${results.length} result entr${results.length === 1 ? 'y' : 'ies'}.`
		};
	},

	'open-skill-alignment.result.links-description': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const results = resultsOf(credential);
		const descriptions = descriptionsOf(credential);
		if (!results || results.length === 0) return passthroughMissing('result');
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');
		const declaredIds = new Set(
			descriptions.map((d) => d?.id).filter((id): id is string => typeof id === 'string')
		);
		const unlinked = results.filter((r) => !declaredIds.has(r?.resultDescription as string));
		if (unlinked.length > 0) {
			return {
				status: 'fail',
				message: `${unlinked.length} result entr${unlinked.length === 1 ? 'y' : 'ies'} reference a resultDescription id that is not declared on the achievement.`
			};
		}
		return { status: 'pass', message: 'Every result links to a declared resultDescription.' };
	},

	'open-skill-alignment.result.numeric-value-in-range': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const results = resultsOf(credential);
		const descriptions = descriptionsOf(credential);
		if (!results || results.length === 0) return passthroughMissing('result');
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');

		const byId = new Map(
			descriptions
				.filter((d): d is NonNullable<typeof d> => !!d && typeof d.id === 'string')
				.map((d) => [d.id as string, d])
		);

		const numericResults = results.filter((r) => {
			const desc = byId.get(r?.resultDescription as string);
			return desc?.resultType === 'RawScore' || desc?.resultType === 'Percent';
		});

		if (numericResults.length === 0) {
			return { status: 'n/a', message: 'No RawScore or Percent results to range-check.' };
		}

		const failures: string[] = [];
		for (const r of numericResults) {
			const desc = byId.get(r?.resultDescription as string)!;
			const valueStr = r?.value;
			if (typeof valueStr !== 'string' || valueStr.length === 0) {
				failures.push(`${desc.id}: value missing or empty.`);
				continue;
			}
			const numeric = Number(valueStr);
			if (Number.isNaN(numeric)) {
				failures.push(`${desc.id}: value "${valueStr}" is not numeric.`);
				continue;
			}
			const min = typeof desc.valueMin === 'string' ? Number(desc.valueMin) : undefined;
			const max = typeof desc.valueMax === 'string' ? Number(desc.valueMax) : undefined;
			if (min !== undefined && !Number.isNaN(min) && numeric < min) {
				failures.push(`${desc.id}: value ${numeric} < valueMin ${min}.`);
			}
			if (max !== undefined && !Number.isNaN(max) && numeric > max) {
				failures.push(`${desc.id}: value ${numeric} > valueMax ${max}.`);
			}
		}
		if (failures.length > 0) {
			return {
				status: 'fail',
				message: failures.join(' ')
			};
		}
		return {
			status: 'pass',
			message: `${numericResults.length} numeric result(s) within declared bounds.`
		};
	},

	'open-skill-alignment.result.achieved-level-matches': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const results = resultsOf(credential);
		const descriptions = descriptionsOf(credential);
		if (!results || results.length === 0) return passthroughMissing('result');
		if (!descriptions || descriptions.length === 0) return passthroughMissing('resultDescription');

		const byId = new Map(
			descriptions
				.filter((d): d is NonNullable<typeof d> => !!d && typeof d.id === 'string')
				.map((d) => [d.id as string, d])
		);

		const rubricResults = results.filter((r) => {
			const desc = byId.get(r?.resultDescription as string);
			return desc?.resultType === 'RubricCriterionLevel';
		});

		if (rubricResults.length === 0) {
			return { status: 'n/a', message: 'No RubricCriterionLevel results to level-check.' };
		}

		const failures: string[] = [];
		for (const r of rubricResults) {
			const desc = byId.get(r?.resultDescription as string)!;
			const levels = Array.isArray(desc.rubricCriterionLevel) ? desc.rubricCriterionLevel : [];
			const declaredLevelIds = new Set(
				levels
					.map((l) => (l as { id?: unknown })?.id)
					.filter((id): id is string => typeof id === 'string')
			);
			const achieved = r?.achievedLevel;
			if (typeof achieved !== 'string' || achieved.length === 0) {
				failures.push(`${desc.id}: achievedLevel missing.`);
				continue;
			}
			if (!declaredLevelIds.has(achieved)) {
				failures.push(
					`${desc.id}: achievedLevel "${achieved}" does not match any declared rubricCriterionLevel.id.`
				);
			}
		}
		if (failures.length > 0) {
			return { status: 'fail', message: failures.join(' ') };
		}
		return {
			status: 'pass',
			message: `${rubricResults.length} rubric result(s) match a declared level.`
		};
	},

	'open-skill-alignment.result.alignment-optional': ({ credential, includeAdditive }) => {
		if (!includeAdditive) return additiveOff();
		const results = resultsOf(credential);
		if (!results || results.length === 0) return passthroughMissing('result');
		const withAlignment = results.filter(
			(r) => Array.isArray(r?.alignment) && r.alignment.length > 0
		);
		if (withAlignment.length === 0) {
			return {
				status: 'n/a',
				message: 'No result-level alignments declared; this MAY clause does not apply.'
			};
		}
		return {
			status: 'pass',
			message: `${withAlignment.length} result entr${withAlignment.length === 1 ? 'y' : 'ies'} carry an optional alignment[].`
		};
	}
};

// ── helpers ──────────────────────────────────────────────────────────────────

function additiveOff(): CheckResult {
	return { status: 'n/a', message: 'Additive profile not selected.' };
}

function passthroughMissing(field: 'resultDescription' | 'result'): CheckResult {
	return {
		status: 'n/a',
		message: `No ${field} entries to evaluate; see the upstream "${field}.present" check.`
	};
}

type ResultDescriptionShape = {
	id?: unknown;
	resultType?: unknown;
	valueMin?: unknown;
	valueMax?: unknown;
	rubricCriterionLevel?: unknown[];
	alignment?: unknown[];
};

type ResultShape = {
	resultDescription?: unknown;
	value?: unknown;
	achievedLevel?: unknown;
	alignment?: unknown[];
};

function descriptionsOf(credential: unknown): ResultDescriptionShape[] | undefined {
	const subject = subjectOf(credential);
	const achievement = subject?.achievement as { resultDescription?: unknown } | undefined;
	const rd = achievement?.resultDescription;
	return Array.isArray(rd) ? (rd as ResultDescriptionShape[]) : undefined;
}

function resultsOf(credential: unknown): ResultShape[] | undefined {
	const subject = subjectOf(credential);
	const rs = subject?.result;
	return Array.isArray(rs) ? (rs as ResultShape[]) : undefined;
}

function safeHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}
