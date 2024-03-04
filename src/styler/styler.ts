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
	open: boolean,
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
				<div id="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane">
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

		pane.style.display = this.#config.open ? 'block' : 'none';
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
			const { button } = createElementsFromHTML(`<button id="button" type="button" class="entry">${name}</button>`);

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

		if (!this.#currentOptions.colors) throw Error();

		const defaultColors = this.#currentStyle.getOptions().colors as Record<string, string>;
		const currentColors = this.#currentOptions.colors as Record<string, string>;
		this.#colorList.innerHTML = '';

		Object.entries(defaultColors).forEach(([name, defaultColor]) => {
			const hex = new Color(currentColors[name]).hex();
			const { button, input, reset } = createElementsFromHTML(`
				<div id="button" class="entry">
					<label>${name}</label>
					<div class="space"></div>
					<input id="input" type="color" value="${hex}" style="background-color:${hex}">
					<button id="reset" type="button" disabled>&circlearrowleft;</button>
				</div>
			`);

			reset.addEventListener('click', () => {
				(input as HTMLInputElement).value = defaultColor;
				input.style.backgroundColor = defaultColor;
				currentColors[name] = defaultColor;
				reset.setAttribute('disabled', 'disabled');
				this.renderStyle()
			});

			input.addEventListener('change', () => {
				const color = (input as HTMLInputElement).value;
				currentColors[name] = color;
				input.style.backgroundColor = color;
				reset.removeAttribute('disabled');
				this.renderStyle()
			}, false);

			this.#colorList.appendChild(button);
		});
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