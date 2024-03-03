import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { SomeBuilder, SomeOptions } from '@versatiles/style';
import { createElementsFromHTML } from './html';
import Color from 'color';

export interface Config {
	fontNames: string[],
	tiles: string[],
	sprite: string,
	glyphs: string,
}

export class Styler {
	readonly #container: HTMLElement;
	readonly #colorList: HTMLElement;
	readonly #styleList: HTMLElement;
	readonly #map: MLGLMap;
	readonly #config: Config;
	#currentStyle: SomeBuilder;
	#currentOptions: SomeOptions;

	constructor(map: MLGLMap, config: Config) {
		this.#map = map;
		this.#config = config;
		this.#currentStyle = styles.colorful;
		this.#currentOptions = {};

		const { button, container, colorList, styleList, pane } = createElementsFromHTML(`
			<div id="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button id="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div id="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane" style="display: none">
					<h3>1. Select a style:</h3>
					<div id="styleList" class="maplibregl-list"></div>
					<h3>2. Edit colors:</h3>
					<div id="colorList" class="maplibregl-list"></div>
					<h3>3. Modify colors:</h3>
				</div>
			</div>
		`);
		this.#container = container;
		this.#colorList = colorList;
		this.#styleList = styleList;

		button.addEventListener('click', () => {
			pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
		});

		this.populateStyleList();

		this.setStyle(styles.colorful);
	}

	public get container(): HTMLElement {
		return this.#container;
	}

	private populateStyleList() {
		Object.entries(styles).forEach(([name, style]) => {
			const { button } = createElementsFromHTML(`<button id="button" type="button">${name}</button>`);

			// Style selection event
			button.addEventListener('click', () => {
				if (button.classList.contains('active')) return;

				this.#styleList.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				button.classList.add('active');

				this.setStyle(style);
			});

			if (style === this.#currentStyle) {
				button.classList.add('active');
			}
			this.#styleList.appendChild(button);
		});
	}

	private populateColorList() {
		const options = this.#currentStyle.getOptions();

		if (!options.colors) throw Error();

		this.#colorList.innerHTML = '';
		Object.entries(options.colors).forEach(([name, color]) => {
			const { button } = createElementsFromHTML(`<button id="button" type="button"><label>${name}</label> ${getColor(color)}</button>`);

			// Style selection event
			button.addEventListener('click', () => {
				//if (button.classList.contains('active')) return;

				//this.#styleList.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				//button.classList.add('active');

				//this.setStyle(style);
			});
			this.#colorList.appendChild(button);
		});

		function getColor(colorString: string): string {
			const color = new Color(colorString);
			const bg = color.hex();
			const fg = color.isLight() ? '#000' : '#fff';
			return `<span class="color" style="background:${bg};color:${fg}">${bg}</span>`;
		}
	}

	private setStyle(style: SomeBuilder) {
		this.#currentStyle = style;
		this.#currentOptions = style.getOptions();
		this.#currentOptions.tiles = this.#config.tiles;
		this.#currentOptions.sprite = this.#config.sprite;
		this.#currentOptions.glyphs = this.#config.glyphs;

		this.populateColorList();
		this.renderStyle();
	}

	private renderStyle() {
		this.#map.setStyle(this.#currentStyle(this.#currentOptions));
	}
}