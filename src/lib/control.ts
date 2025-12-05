import type { Map as MLGLMap } from 'maplibre-gl';
import { Styler } from './styler';
import type { VersaTilesStylerConfig } from './config';
import { ensureStylesInjected } from './html';

/**
 * styleControl is a custom control for MapLibre GL JS maps that allows users to switch between different map styles.
 */
export class VersaTilesStylerControl {
	readonly #config: VersaTilesStylerConfig;
	#map?: MLGLMap;
	#styler?: Styler;
	#stylesInjected = false;

	/**
	 * Initializes a new instance of the styleControl.
	 * @param {Object} config Configuration options for the control.
	 */
	constructor(config?: VersaTilesStylerConfig) {
		this.#config = config ?? {};
	}

	/**
	 * Returns the default position for the control on the map.
	 * @returns {string} The default position.
	 */
	getDefaultPosition() {
		return 'top-right';
	}

	/**
	 * Called when the control is added to the map.
	 * @param {Map} map The MapLibre GL JS map instance.
	 * @returns {HTMLElement} The element containing the control.
	 */
	onAdd(map: MLGLMap) {
		this.#map = map;
		this.#styler = new Styler(this.#map, this.#config);

		if (!this.#stylesInjected) {
			ensureStylesInjected();
			this.#stylesInjected = true;
		}

		return this.#styler.container;
	}

	/**
	 * Called when the control is removed from the map.
	 */
	onRemove() {
		if (!this.#map) return;

		// Clean up references
		this.#styler = undefined;
		this.#map = undefined;
	}
}
