import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { Style } from '@versatiles/style';
import { createElementsFromHTML } from './html';

export interface Config {
	fontNames: string[],
	tiles: string[],
	sprites: string[],
	glyphs: string,
}

export class Styler {
	readonly #container: HTMLElement;
	readonly #map: MLGLMap;
	readonly #config: Config;
	#currentStyle: Style;

	constructor(map: MLGLMap, config: Config) {
		this.#map = map;
		this.#config = config;
		this.#currentStyle = styles.colorful;

		const { button, container, styleList, pane } = createElementsFromHTML(`
			<div id="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button id="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div id="pane" class="maplibregl-ctrl maplibregl-ctrl-group" style="display: none">
					<h3>1. Select a style:</h3>
					<div id="styleList" class="maplibregl-list"></div>
					<h3>2. Edit colors:</h3>
					<h3>3. Modify colors:</h3>
				</div>
			</div>
		`);
		this.#container = container;
		button.addEventListener('click', () => {
			pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
		});

		// Populate style options
		Object.entries(styles).forEach(([name, style]) => {
			const { button } = createElementsFromHTML(`<button id="button" type="button">${name}</button>`);

			// Style selection event
			button.addEventListener('click', () => {
				if (button.classList.contains('active')) return;

				styleList.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				button.classList.add('active');

				this.setStyle(style);
			});

			if (style === this.#currentStyle) {
				button.classList.add('active');
			}
			styleList.appendChild(button);
		});

		this.setStyle(styles.colorful);
	}

	public get container(): HTMLElement {
		return this.#container;
	}

	private setStyle(style: Style) {
		this.#currentStyle = style;
		this.renderStyle();
	}

	private renderStyle() {
		this.#map.setStyle(this.#currentStyle(this.#config));
	}
}