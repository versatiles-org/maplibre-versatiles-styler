import styles from './style.scss';
import type { Map as MLGLMap } from 'maplibre-gl';
import { Styler } from './styler/styler';
import type { Config } from './styler/styler';
export type { Config };

let stylesInjected = false;

function ensureStylesInjected() {
	if (stylesInjected) return;
	if (typeof document === 'undefined') return;

	const styleEl = document.createElement('style');
	styleEl.setAttribute('type', 'text/css');
	styleEl.dataset.versatilesStyler = 'true';
	styleEl.textContent = styles;
	document.head.appendChild(styleEl);

	stylesInjected = true;
}

/**
 * styleControl is a custom control for MapLibre GL JS maps that allows users to switch between different map styles.
 */
export default class VersatilesStyler {
	readonly #config: Config;
	#map?: MLGLMap;
	#styler?: Styler;

	/**
	 * Initializes a new instance of the styleControl.
	 * @param {Object} config Configuration options for the control.
	 */
	constructor(config: Config) {
		this.#config = config;
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
		ensureStylesInjected();

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
