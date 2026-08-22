import type { TileJSONSpecification } from '@versatiles/style';

/**
 * Zoom at which the earliest OSM `kind` of the `land` layer (`forest`) appears in plain
 * Shortbread. A `land` layer that starts below this carries the low-zoom landcover extension.
 * See https://docs.versatiles.org/compendium/specification_shortbread_landcover.html
 */
const SHORTBREAD_LAND_MINZOOM = 7;

class TileJSON {
	spec: TileJSONSpecification;
	constructor(spec: TileJSONSpecification) {
		this.spec = spec;
	}

	/**
	 * Whether the tiles merge landcover into the `land` layer, which is what
	 * `experimental.landcover` needs to render anything below the OSM zoom levels.
	 * Unknown or missing metadata counts as "no landcover".
	 */
	hasLandcover(): boolean {
		if (!('vector_layers' in this.spec)) return false;
		const land = this.spec.vector_layers.find((layer) => layer.id === 'land');
		if (!land) return false;
		return (land.minzoom ?? SHORTBREAD_LAND_MINZOOM) < SHORTBREAD_LAND_MINZOOM;
	}

	languages(): Record<string, string> {
		if (!('vector_layers' in this.spec)) {
			return { local: '' };
		}
		const codeSet = new Set<string>(['']);
		let match: RegExpMatchArray | null;
		for (const layer of this.spec.vector_layers) {
			for (const field in layer.fields) {
				if ((match = field.match(/^name_(\w\w)$/))) codeSet.add(match[1]);
			}
		}
		return Object.fromEntries(
			Array.from(codeSet)
				.sort()
				.map((code) => {
					if (code === '') {
						return ['local', ''];
					} else {
						let title: string;
						try {
							title = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? '';
						} catch {
							title = code;
						}
						return [title, code];
					}
				})
		);
	}
}

export function fetchJSON(url: string | URL): Promise<unknown> {
	return fetch(url).then(async (response) => {
		if (!response.ok) {
			throw new Error(
				`Failed to fetch JSON from ${url}: ${response.status} ${response.statusText}`
			);
		}
		return await response.json();
	});
}

export async function fetchTileJSON(url: string | URL): Promise<TileJSON> {
	return new TileJSON((await fetchJSON(url)) as TileJSONSpecification);
}

export async function fetchTileSources(origin: string): Promise<Set<string>> {
	try {
		const sources = (await fetchJSON(new URL('/tiles/index.json', origin))) as string[];
		return new Set(sources);
	} catch {
		return new Set(['osm', 'satellite']);
	}
}
