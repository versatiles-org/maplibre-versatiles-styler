import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { StyleBuilderFunction, StyleBuilderOptions } from '@versatiles/style';
import { ListGenerator, ValueStore } from './listgenerator';
import { createElementsFromHTML } from './html';
import { Config } from './config';

export class Styler {
	readonly #container: HTMLElement;
	readonly #lists: {
		color: HTMLElement;
		recolor: HTMLElement;
		style: HTMLElement;
		option: HTMLElement;
	};

	readonly #map: MLGLMap;
	readonly #config: Config;
	#currentStyle: StyleBuilderFunction;
	#currentOptions: StyleBuilderOptions;

	constructor(map: MLGLMap, config: Config) {
		this.#map = map;
		this.#config = config;
		this.#currentStyle = styles.colorful;
		this.#currentOptions = {};

		const { button, colorList, container, optionList, pane, recolorList, styleList } = createElementsFromHTML(`
			<div name="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button name="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div name="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane">
					<details open>
						<summary>1. Select a style:</summary>
						<div name="styleList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>2. Edit colors:</summary>
						<div name="colorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>3. Modify colors:</summary>
						<div name="recolorList" class="maplibregl-list"></div>
					</details>
					<details>
						<summary>4. Select Options:</summary>
						<div name="optionList" class="maplibregl-list"></div>
					</details>
				</div>
			</div>
		`);
		this.#container = container;
		this.#lists = {
			color: colorList,
			recolor: recolorList,
			style: styleList,
			option: optionList
		};

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
			const { button } = createElementsFromHTML(`<button name="button" type="button" class="entry">${name}</button>`);

			// Style selection event
			button.addEventListener('click', () => {
				if (button.classList.contains('active')) return;

				this.#lists.style.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
				button.classList.add('active');

				this.setStyle(style);
			});

			if (style === this.#currentStyle) {
				button.classList.add('active');
			}
			this.#lists.style.appendChild(button);
		});
	}

	private setStyle(style: StyleBuilderFunction) {
		this.#currentStyle = style;
		this.#currentOptions = style.getOptions();
		this.#currentOptions.baseUrl = this.#config.origin;

		const update = () => {
			this.renderStyle();
		};

		const defaultOptions = style.getOptions();

		const colorList = new ListGenerator(
			this.#lists.color,
			this.#currentOptions.colors ?? {},
			defaultOptions.colors ?? {},
			update
		);
		Object.keys(defaultOptions.colors ?? {}).forEach((key) => {
			colorList.addColor(key, key);
		});

		new ListGenerator(
			this.#lists.recolor,
			(this.#currentOptions.recolor ?? {}) as ValueStore,
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
			this.#lists.option,
			(this.#currentOptions ?? {}) as ValueStore,
			(defaultOptions ?? {}) as ValueStore,
			update
		).addSelect('language', 'language', { local: '', german: 'de', english: 'en' });

		this.renderStyle();
	}

	private renderStyle() {
		const style = this.#currentStyle(this.#currentOptions);
		this.#map.setStyle(style);
	}
}
