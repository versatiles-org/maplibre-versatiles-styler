import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { StyleBuilderFunction, StyleBuilderOptions } from '@versatiles/style';
import { ListGenerator, ValueStore } from './listgenerator';
import { createElementsFromHTML } from './html';
import { VersaTilesStylerConfig } from './types';
import svg from '../assets/versatiles-logo.svg';
import { fetchTileJSON } from './tile_json';

export class Styler {
	readonly container: HTMLElement;
	readonly lists: {
		color: HTMLElement;
		recolor: HTMLElement;
		style: HTMLElement;
		option: HTMLElement;
	};

	readonly map: MLGLMap;
	readonly config: VersaTilesStylerConfig;
	currentStyle: StyleBuilderFunction;
	currentOptions: StyleBuilderOptions;

	constructor(map: MLGLMap, config: VersaTilesStylerConfig) {
		this.map = map;
		this.config = config;
		this.currentStyle = styles.colorful;
		this.currentOptions = {};

		const { button, colorList, container, optionList, pane, recolorList, styleList } =
			createElementsFromHTML(`
			<div data-key="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button data-key="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div data-key="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane">
					<h3>
						<a href="https://versatiles.org" target="_blank"><img src="${svg}" alt="VersaTiles" /></a>
						<a href="https://github.com/versatiles-org/maplibre-versatiles-styler" target="_blank">VersaTiles Styler</a>
					</h3>
					<details open>
						<summary>Select a base style</summary>
						<div data-key="styleList" class="maplibregl-list style-list"></div>
					</details>
					<details>
						<summary>Edit individual colors</summary>
						<div data-key="colorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>Modify all colors</summary>
						<div data-key="recolorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>Select Options</summary>
						<div data-key="optionList" class="maplibregl-list"></div>
					</details>
				</div>
			</div>
		`);
		this.container = container;
		this.lists = {
			color: colorList,
			recolor: recolorList,
			style: styleList,
			option: optionList,
		};

		pane.style.display = this.config.open ? 'block' : 'none';
		button.addEventListener('click', () => {
			pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
		});

		this.fillStyleList();

		this.setBaseStyle(styles.colorful);
	}

	private fillStyleList() {
		let first = true;
		const inputs: HTMLInputElement[] = [];
		Object.entries(styles).forEach(([name, style]) => {
			const { wrapper, input } = createElementsFromHTML(
				`<label data-key="wrapper">
				<input type="radio" data-key="input" value="${name}" />
				<span>${name}</span>
				</label>`
			) as { wrapper: HTMLLabelElement; input: HTMLInputElement };

			if (first) {
				input.checked = true;
				first = false;
			}

			// Style selection event
			input.addEventListener('click', () => {
				inputs.forEach((i) => (i.checked = i === input));
				this.setBaseStyle(style);
			});

			this.lists.style.appendChild(wrapper);
			inputs.push(input);
		});
	}

	private setBaseStyle(baseStyle: StyleBuilderFunction) {
		this.currentStyle = baseStyle;

		const defaultOptions = baseStyle.getOptions();
		this.currentOptions = {
			...defaultOptions,
			baseUrl: this.config.origin,
			fonts: undefined,
			glyphs: undefined,
			sprite: undefined,
			tiles: undefined,
		};

		const update = () => {
			this.renderStyle();
		};

		const colorList = new ListGenerator(
			this.lists.color,
			this.currentOptions.colors ?? {},
			defaultOptions.colors ?? {},
			update
		);
		Object.keys(defaultOptions.colors ?? {}).forEach((key) => {
			colorList.addColor(key, key);
		});

		new ListGenerator(
			this.lists.recolor,
			(this.currentOptions.recolor ?? {}) as ValueStore,
			(defaultOptions.recolor ?? {}) as ValueStore,
			update
		)
			.addCheckbox('invertBrightness', 'invert brightness')
			.addNumber('rotate', 'rotate hue', 0, 360)
			.addNumber('saturate', 'saturate', -1, 1, 100)
			.addNumber('gamma', 'gamma', 0.1, 10)
			.addNumber('contrast', 'contrast', 0, 10, 100)
			.addNumber('brightness', 'brightness', -1, 1, 100)
			.addNumber('tint', 'tint', 0, 1, 100)
			.addColor('tintColor', 'tint color')
			.addNumber('blend', 'blend', 0, 1, 100)
			.addColor('blendColor', 'blend color');

		const optionList = new ListGenerator(
			this.lists.option,
			(this.currentOptions ?? {}) as ValueStore,
			(defaultOptions ?? {}) as ValueStore,
			update
		);

		fetchTileJSON(new URL('/tiles/osm/tiles.json', this.config.origin)).then((tileJSON) => {
			optionList.addSelect('language', 'language', tileJSON.languages());
		});

		this.renderStyle();
	}

	private renderStyle() {
		const style = this.currentStyle(this.currentOptions);
		this.map.setStyle(style);
	}
}
