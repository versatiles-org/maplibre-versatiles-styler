import styles from './style.scss';
import type { Map as MLGLMap } from 'maplibre-gl';
import { Styler } from './styler/styler';
import type { Config } from './styler/styler';
export type { Config };


(async () => {
	await new Promise(res => {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			setTimeout(res, 1);
		} else {
			document.addEventListener('DOMContentLoaded', res);
		}
	})
	const head = document.getElementsByTagName('head')[0];
	const s = document.createElement('style');
	s.setAttribute('type', 'text/css');
	s.appendChild(document.createTextNode(styles));
	head.appendChild(s);
})()

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

		return this.#styler.container;
	}

	/**
	 * Called when the control is removed from the map.
	 */
	onRemove() {
		if (this.#map) return;

		// Clean up references
		this.#map = undefined;
	}
}
