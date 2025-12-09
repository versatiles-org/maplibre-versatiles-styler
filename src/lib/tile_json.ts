import type { TileJSONSpecification } from '@versatiles/style';

class TileJSON {
	spec: TileJSONSpecification;
	constructor(spec: TileJSONSpecification) {
		this.spec = spec;
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
						let title = '';
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
