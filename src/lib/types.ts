import type { addProtocol } from 'maplibre-gl';

export interface VersaTilesStylerConfig {
	/** Base URL of the VersaTiles server. Default: the page's origin. */
	origin?: string;
	/**
	 * The tilesets the server has under other names than `osm`, `satellite` and `elevation`: the address
	 * of the TileJSON of each, which may be relative to `origin`. The vector tiles may be of the
	 * Shortbread, the OpenMapTiles or the Protomaps schema; the style is built for the one they have.
	 */
	sources?: { vector?: string; satellite?: string; elevation?: string };
	/**
	 * Offer tiles of other providers in the sidebar, such as OpenFreeMap. Default: `false`, which keeps
	 * the styler to the VersaTiles server at `origin`.
	 */
	externalSources?: boolean;
	/**
	 * MapLibre's `addProtocol`, with which the styler registers the `pmtiles://` protocol. Without it,
	 * `externalSources` leaves out the tiles that come as a PMTiles archive, such as Protomaps.
	 */
	addProtocol?: typeof addProtocol;
	/** Whether the sidebar is open initially. Default: `false`. */
	open?: boolean;
	/** Keep the map view, the style and its options in the URL hash. Default: `true`. */
	hash?: boolean;
}
