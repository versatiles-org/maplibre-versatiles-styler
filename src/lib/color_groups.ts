export interface ColorGroup<K extends string = string> {
	title: string;
	colors: { key: K; label: string }[];
}

const WORD_LABELS: Record<string, string> = { bg: 'background', poi: 'POI' };

/**
 * The colour keys grouped by their first word — `natureWood` and `natureGrass` under "Nature",
 * `roadStreet` and `roadStreetBg` under "Road" — in the order the keys come in. Keys that share their
 * first word with no other key (`background`, `land`, …) are collected under "Base".
 */
export function colorGroups<K extends string>(keys: readonly K[]): ColorGroup<K>[] {
	const byPrefix = new Map<string, K[]>();
	for (const key of keys) {
		const prefix = words(key)[0];
		byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), key]);
	}

	const base: ColorGroup<K> = { title: 'Base', colors: [] };
	const groups: ColorGroup<K>[] = [base];
	for (const [prefix, groupKeys] of byPrefix) {
		if (groupKeys.length === 1) {
			base.colors.push({ key: groupKeys[0], label: label(words(groupKeys[0])) });
			continue;
		}
		groups.push({
			title: capitalize(prefix),
			colors: groupKeys.map((key) => {
				const rest = words(key).slice(1);
				return { key, label: rest.length > 0 ? label(rest) : 'Default' };
			}),
		});
	}
	return base.colors.length > 0 ? groups : groups.slice(1);
}

/**
 * A colour key on its own, e.g. `natureWood` → "Nature wood". The sections show the group's word once
 * as a heading and drop it from the row; the inspector has no heading to lean on, so it keeps it.
 */
export function colorLabel(key: string): string {
	return label(words(key));
}

function words(key: string): string[] {
	return key.split(/(?=[A-Z])/).map((word) => word.toLowerCase());
}

function label(parts: string[]): string {
	return capitalize(parts.map((word) => WORD_LABELS[word] ?? word).join(' '));
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
