import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { StyleBuilderFunction, StyleBuilderOptions } from '@versatiles/style';
import { ListGenerator, ValueStore } from './listgenerator';
import { createElementsFromHTML } from './html';
import { VersaTilesStylerConfig } from './config';
import svg from '../assets/versatiles-logo.svg';

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
			<div name="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button name="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div name="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane">
				   <h3><img src="${svg}" alt="VersaTiles" /> VersaTiles Styler</h3>
					<details open>
						<summary>Select a base style</summary>
						<div name="styleList" class="maplibregl-list style-list"></div>
					</details>
					<details>
						<summary>Edit individual colors</summary>
						<div name="colorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>Modify all colors</summary>
						<div name="recolorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>Select Options</summary>
						<div name="optionList" class="maplibregl-list"></div>
					</details>
				</div>
			</div>
		`);
		this.container = container;
		this.lists = {
			color: colorList,
			recolor: recolorList,
			style: styleList,
			option: optionList
		};

		pane.style.display = this.config.open ? 'block' : 'none';
		button.addEventListener('click', () => {
			pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
		});

		this.fillStyleList();

		this.setBaseStyle(styles.colorful);
	}

	private fillStyleList() {
		Object.entries(styles).forEach(([name, style]) => {
			const { button } = createElementsFromHTML(
				`<button name="button" type="button">${name}</button>`
			);

			// Style selection event
			button.addEventListener('click', () => {
				if (button.classList.contains('active')) return;

				this.lists.style.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
				button.classList.add('active');

				this.setBaseStyle(style);
			});

			if (style === this.currentStyle) {
				button.classList.add('active');
			}
			this.lists.style.appendChild(button);
		});
	}

	private setBaseStyle(baseStyle: StyleBuilderFunction) {
		this.currentStyle = baseStyle;

		const defaultOptions = baseStyle.getOptions();
		this.currentOptions = JSON.parse(JSON.stringify(defaultOptions));
		this.currentOptions.baseUrl = this.config.origin;
		this.currentOptions.fonts = undefined;
		this.currentOptions.sprite = undefined;
		this.currentOptions.glyphs = undefined;
		this.currentOptions.tiles = undefined;

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

		new ListGenerator(
			this.lists.option,
			(this.currentOptions ?? {}) as ValueStore,
			(defaultOptions ?? {}) as ValueStore,
			update
		).addSelect('language', 'language', { local: '', german: 'de', english: 'en' });

		this.renderStyle();
	}

	private renderStyle() {
		const style = this.currentStyle(this.currentOptions);
		this.map.setStyle(style);
	}
}
