import type { Oid4vpAuthorizationRequest, PresentationSubmission } from './schemas.js';

/** Result of matching a held credential against a presentation request. */
export type MatchResult =
	| { matches: true; submission: PresentationSubmission }
	| { matches: false; reason: string };

type InputDescriptor =
	Oid4vpAuthorizationRequest['presentation_definition']['input_descriptors'][number];
type Field = NonNullable<NonNullable<InputDescriptor['constraints']>['fields']>[number];

/**
 * Decide whether a held credential satisfies a request's `presentation_definition` and, if so,
 * build the matching `presentation_submission`. Hand-written for the single OpenBadgeCredential
 * type the suite presents — no JSONPath/PEX dependency. An input descriptor matches when every
 * one of its `constraints.fields` is satisfied (a field with no constraints matches by presence
 * of any of its paths); a descriptor with no field constraints matches any credential.
 */
export function matchCredential(
	request: Oid4vpAuthorizationRequest,
	credential: unknown
): MatchResult {
	const def = request.presentation_definition;
	const descriptor = def.input_descriptors.find((d) => descriptorMatches(d, credential));
	if (!descriptor) {
		return { matches: false, reason: 'No input descriptor is satisfied by the held credential.' };
	}
	return {
		matches: true,
		submission: {
			id: `submission-${def.id}`,
			definition_id: def.id,
			descriptor_map: [{ id: descriptor.id, format: 'ldp_vp', path: '$' }]
		}
	};
}

function descriptorMatches(descriptor: InputDescriptor, credential: unknown): boolean {
	const fields = descriptor.constraints?.fields;
	if (!fields || fields.length === 0) return true;
	return fields.every((field) => fieldSatisfied(field, credential));
}

function fieldSatisfied(field: Field, credential: unknown): boolean {
	const values = field.path.map((p) => resolvePath(credential, p)).filter((v) => v !== undefined);
	if (values.length === 0) return false;
	if (!field.filter) return true;
	return values.some((v) => valueSatisfiesFilter(v, field.filter as Record<string, unknown>));
}

/** Minimal `$.a.b` resolver covering the paths an OB3 presentation request uses. */
function resolvePath(root: unknown, path: string): unknown {
	const segments = path
		.replace(/^\$\.?/, '')
		.split('.')
		.filter(Boolean);
	let cur: unknown = root;
	for (const seg of segments) {
		if (cur == null || typeof cur !== 'object') return undefined;
		cur = (cur as Record<string, unknown>)[seg];
	}
	return cur;
}

/** Support the filter forms an OB3 type/context request uses: const, enum, pattern, contains. */
function valueSatisfiesFilter(value: unknown, filter: Record<string, unknown>): boolean {
	if ('const' in filter) return arrayOrValueIncludes(value, filter.const);
	if (Array.isArray(filter.enum)) return filter.enum.some((e) => arrayOrValueIncludes(value, e));
	if (filter.contains && typeof filter.contains === 'object') {
		const inner = filter.contains as Record<string, unknown>;
		if ('const' in inner) return arrayOrValueIncludes(value, inner.const);
		if (Array.isArray(inner.enum)) return inner.enum.some((e) => arrayOrValueIncludes(value, e));
	}
	if (typeof filter.pattern === 'string') {
		const re = new RegExp(filter.pattern);
		const candidates = Array.isArray(value) ? value : [value];
		return candidates.some((c) => typeof c === 'string' && re.test(c));
	}
	// Unknown filter shape → presence already established by the caller.
	return true;
}

function arrayOrValueIncludes(value: unknown, target: unknown): boolean {
	return Array.isArray(value) ? value.includes(target) : value === target;
}
