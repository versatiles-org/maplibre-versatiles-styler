import type { Map as MLGLMap } from 'maplibre-gl';

/** The part of a map `labelTexts` reads. */
export type LabelMap = Pick<
	MLGLMap,
	'getLayer' | 'getLayersOrder' | 'getLayoutProperty' | 'queryRenderedFeatures'
>;

/**
 * The texts of the labels the map shows now, once each — of the text layers `layerIds`, or of every text
 * layer. MapLibre returns only labels that were placed, and each with its `text-field` evaluated: a string,
 * or a formatted value with `sections`.
 */
export function labelTexts(map: LabelMap, layerIds?: readonly string[]): string[] {
	let ids: string[];
	try {
		ids = (layerIds ?? map.getLayersOrder()).filter(
			(id) => map.getLayer(id)?.type === 'symbol' && map.getLayoutProperty(id, 'text-field') != null
		);
	} catch {
		// No style yet.
		return [];
	}
	if (ids.length === 0) return [];
	const texts = new Set<string>();
	for (const feature of map.queryRenderedFeatures({ layers: ids })) {
		const text = textOf(feature.layer.layout?.['text-field' as keyof typeof feature.layer.layout]);
		if (text) texts.add(text);
	}
	return [...texts];
}

function textOf(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	const sections = (value as { sections?: { text?: unknown }[] } | null)?.sections;
	if (!Array.isArray(sections)) return undefined;
	return sections.map((section) => (typeof section.text === 'string' ? section.text : '')).join('');
}
