import type { ControlPosition, IControl, Map as MLGLMap } from 'maplibre-gl';
import { mount, unmount } from 'svelte';
import Styler from './Styler.svelte';
import type { VersaTilesStylerConfig } from './types';
import { ensureStylesInjected } from './styles';

/**
 * styleControl is a custom control for MapLibre GL JS maps that allows users to switch between different map styles.
 */
export class VersaTilesStylerControl implements IControl {
	readonly config: VersaTilesStylerConfig;
	map?: MLGLMap;
	private component?: Record<string, unknown>;

	/**
	 * Initializes a new instance of the styleControl.
	 * @param {Object} config Configuration options for the control.
	 */
	constructor(config?: VersaTilesStylerConfig) {
		this.config = config ?? {};
	}

	/**
	 * Returns the default position for the control on the map.
	 * @returns {string} The default position.
	 */
	getDefaultPosition() {
		return 'top-right' as ControlPosition;
	}

	/**
	 * Called when the control is added to the map.
	 * @param {Map} map The MapLibre GL JS map instance.
	 * @returns {HTMLElement} The element containing the control.
	 */
	onAdd(map: MLGLMap) {
		this.map = map;

		ensureStylesInjected();

		const container = document.createElement('div');
		container.className = 'maplibregl-versatiles-styler';
		this.component = mount(Styler, {
			target: container,
			props: { map, config: this.config },
		});
		return container;
	}

	/**
	 * Called when the control is removed from the map.
	 */
	onRemove() {
		if (!this.map) return;

		if (this.component) {
			unmount(this.component);
		}

		this.component = undefined;
		this.map = undefined;
	}
}
