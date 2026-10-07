export interface VersaTilesStylerConfig {
	/** Base URL of the VersaTiles server. Default: the page's origin. */
	origin?: string;
	/**
	 * Offer tiles of other providers in the sidebar, such as OpenFreeMap. Default: `false`, which keeps
	 * the styler to the VersaTiles server at `origin`.
	 */
	externalSources?: boolean;
	/** Whether the sidebar is open initially. Default: `false`. */
	open?: boolean;
	/** Keep the map view, the style and its options in the URL hash. Default: `true`. */
	hash?: boolean;
}
