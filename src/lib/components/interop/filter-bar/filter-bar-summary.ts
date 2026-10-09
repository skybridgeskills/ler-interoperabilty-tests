/**
 * What a trigger says about its dimension. Never blank: an unfiltered dimension
 * reads "Any" — or "None" for add-ons, whose empty selection layers nothing on
 * rather than admitting everything.
 */
export function summarise(
	selected: Set<string>,
	all: { slug: string; label: string }[],
	emptyLabel: 'Any' | 'None'
): string {
	if (selected.size === 0) return emptyLabel;
	// A summary of one item is just that item's name: `Add-ons · All` with one
	// add-on offered reads as a claim about a set the reader cannot see.
	if (selected.size === all.length) return all.length === 1 ? all[0].label : 'All';
	const labels = all.filter((x) => selected.has(x.slug)).map((x) => x.label);
	return labels.length <= 2 ? labels.join(', ') : `${labels[0]}, +${labels.length - 1} more`;
}

/** "1 scenario set", "8 scenario sets". */
export function setsLabel(n: number): string {
	return `${n} scenario set${n === 1 ? '' : 's'}`;
}
