import type { addProtocol } from 'maplibre-gl';

export interface VersaTilesStylerConfig {
	/** Base URL of the VersaTiles server. Default: the page's origin. */
	origin?: string;
	/**
	 * The tilesets the server has under other names than `osm-vector`, `satellite-raster`,
	 * `elevation-raster` and `landcover-vector`: the address of the TileJSON of each, which may be relative to `origin`. The
	 * vector tiles may be of the Shortbread, the OpenMapTiles or the Protomaps schema; the style is built
	 * for the one they have. The land cover goes under Shortbread tiles only.
	 */
	sources?: { vector?: string; satellite?: string; elevation?: string; landcover?: string };
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
	/**
	 * Show the closed styler as a bar of base styles, each a button that shows its colours, and a
	 * button that opens the sidebar. `true` offers `colorful`, `colorful-dark` and `satellite`; a list
	 * names the styles, in its order, such as `['gray', 'gray-dark']`. Default: `false`, a single
	 * button that opens the sidebar.
	 */
	quickStyles?: boolean | string[];
	/**
	 * Let the controls follow the map's colours: the styler marks the map container with
	 * `data-color-scheme="dark"` or `"light"` by its style, and on a dark style or satellite, the
	 * styler's sidebar, bar and dialogs, MapLibre's controls and every control with the class
	 * `maplibregl-ctrl-scheme-aware` turn dark. Default: `true`; `false` sets no scheme and leaves
	 * every control as it is drawn.
	 */
	darkControls?: boolean;
	/** Keep the map view, the style and its options in the URL hash. Default: `true`. */
	hash?: boolean;
}
