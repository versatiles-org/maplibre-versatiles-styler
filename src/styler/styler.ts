import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { SomeBuilder, SomeOptions } from '@versatiles/style';
import { createElementsFromHTML } from './html';
import { fillColorList } from './colors';
import { fillRecolorList } from './recolor';

export interface Config {
	fontNames: string[],
	tiles: string[],
	sprite: string,
	glyphs: string,
	open: boolean,
}

export class Styler {
	readonly #colorList: HTMLElement;
	readonly #container: HTMLElement;
	readonly #recolorList: HTMLElement;
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

		const { button, colorList, container, pane, recolorList, styleList } = createElementsFromHTML(`
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
				</div>
			</div>
		`);
		this.#colorList = colorList;
		this.#container = container;
		this.#recolorList = recolorList;
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


	private setStyle(style: SomeBuilder) {
		this.#currentStyle = style;
		this.#currentOptions = style.getOptions();
		this.#currentOptions.tiles = this.#config.tiles;
		this.#currentOptions.sprite = this.#config.sprite;
		this.#currentOptions.glyphs = this.#config.glyphs;

		const update = () => { this.renderStyle(); }

		const defaultOptions = style.getOptions();

		fillColorList(this.#colorList, update, this.#currentOptions.colors ?? {}, defaultOptions.colors ?? {});
		fillRecolorList(this.#recolorList, update, this.#currentOptions.recolor ?? {}, defaultOptions.recolor ?? {});

		this.renderStyle();
	}

	private renderStyle() {
		this.#map.setStyle(this.#currentStyle(this.#currentOptions), { diff: true });
	}
}
