import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { SomeBuilder, SomeOptions } from '@versatiles/style';
import { ListGenerator } from './listgenerator';
import { createElementsFromHTML } from './html';

export interface Config {
	fontNames: string[],
	tiles: string[],
	sprite: string,
	glyphs: string,
	open: boolean,
}

export class Styler {
	readonly #container: HTMLElement;
	readonly #lists: {
		color: HTMLElement;
		recolor: HTMLElement;
		style: HTMLElement;
		option: HTMLElement;
	}

	readonly #map: MLGLMap;
	readonly #config: Config;
	#currentStyle: SomeBuilder;
	#currentOptions: SomeOptions;

	constructor(map: MLGLMap, config: Config) {
		this.#map = map;
		this.#config = config;
		this.#currentStyle = styles.colorful;
		this.#currentOptions = {};

		const { button, colorList, container, optionList, pane, recolorList, styleList } = createElementsFromHTML(`
			<div id="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button id="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div id="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane">
					<details open>
						<summary>1. Select a style:</summary>
						<div id="styleList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>2. Edit colors:</summary>
						<div id="colorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>3. Modify colors:</summary>
						<div id="recolorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>4. Select Options:</summary>
						<div id="optionList" class="maplibregl-list"></div>
					</details>
				</div>
			</div>
		`);
		this.#container = container;
		this.#lists = {
			color: colorList,
			recolor: recolorList,
			style: styleList,
			option: optionList,
		}

		pane.style.display = this.#config.open ? 'block' : 'none';
		button.addEventListener('click', () => {
			pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
		});

		this.fillStyleList();

		this.setStyle(styles.colorful);
	}

	public get container(): HTMLElement {
		return this.#container;
	}

	private fillStyleList() {
		Object.entries(styles).forEach(([name, style]) => {
			const { button } = createElementsFromHTML(`<button id="button" type="button" class="entry">${name}</button>`);

			// Style selection event
			button.addEventListener('click', () => {
				if (button.classList.contains('active')) return;

				this.#lists.style.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				button.classList.add('active');

				this.setStyle(style);
			});

			if (style === this.#currentStyle) {
				button.classList.add('active');
			}
			this.#lists.style.appendChild(button);
		});
	}


	private setStyle(style: SomeBuilder) {
		this.#currentStyle = style;
		this.#currentOptions = style.getOptions();
		this.#currentOptions.tiles = this.#config.tiles;
		this.#currentOptions.sprite = this.#config.sprite;
		this.#currentOptions.glyphs = this.#config.glyphs;

		const update = () => { this.renderStyle(); }

		const defaultOptions = style.getOptions();

		const colorList = new ListGenerator(this.#lists.color, this.#currentOptions.colors, defaultOptions.colors, update);
		Object.keys(defaultOptions.colors ?? {}).forEach(key => {
			colorList.addColor(key, key);
		});

		new ListGenerator(this.#lists.recolor, this.#currentOptions.recolor, defaultOptions.recolor, update)
			.addCheckbox('invert', 'invert colors')
			.addNumber('rotate', 'rotate hue')
			.addNumber('saturate', 'saturate', 100)
			.addNumber('gamma', 'gamma')
			.addNumber('contrast', 'contrast', 100)
			.addNumber('brightness', 'brightness', 100)
			.addNumber('tint', 'tint', 100)
			.addColor('tintColor', 'tint color');

		new ListGenerator(this.#lists.option, this.#currentOptions, defaultOptions, update)
			.addSelect('languageSuffix', 'language', { local: '', german: 'de', english: 'en' });

		this.renderStyle();
	}

	private renderStyle() {
		this.#map.setStyle(this.#currentStyle(this.#currentOptions), { diff: true });
	}

}