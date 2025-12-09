import type { Map as MLGLMap, StyleSpecification } from 'maplibre-gl';
import { styles } from '@versatiles/style';
import type { StyleBuilderFunction, StyleBuilderOptions } from '@versatiles/style';
import { ListGenerator, ValueStore } from './listgenerator';
import { createElementsFromHTML } from './html';
import { VersaTilesStylerConfig } from './types';
import { fetchTileJSON } from './tile_json';

type StyleKeys = keyof typeof styles;
type EnforcedStyleBuilderOptions = StyleBuilderOptions & {
	colors: NonNullable<StyleBuilderOptions['colors']>;
	recolor: NonNullable<StyleBuilderOptions['recolor']>;
};

export class Styler {
	readonly container: HTMLElement;
	readonly lists: {
		color: HTMLElement;
		export: HTMLElement;
		option: HTMLElement;
		origin: HTMLElement;
		recolor: HTMLElement;
		style: HTMLElement;
	};

	readonly map: MLGLMap;
	readonly config: VersaTilesStylerConfig;
	currentStyleKey: StyleKeys;
	currentOptions: EnforcedStyleBuilderOptions;

	constructor(map: MLGLMap, config: VersaTilesStylerConfig) {
		this.map = map;
		this.config = config;
		if (!this.config.origin) {
			this.config.origin = window.location.origin;
		}
		this.currentStyleKey = 'colorful';
		this.currentOptions = {
			colors: {},
			recolor: {},
		};

		const {
			button,
			colorList,
			container,
			exportList,
			optionList,
			originList,
			pane,
			recolorList,
			styleList,
		} = createElementsFromHTML(`
			<div data-key="container" class="maplibregl-versatiles-styler">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button data-key="button" type="button" class="maplibregl-ctrl-icon"></button>
				</div>
				<div data-key="pane" class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane">
					<details>
						<summary>Select origin</summary>
						<div data-key="originList" class="maplibregl-list"></div>
					</details>
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
					<details>
						<summary>Export</summary>
						<div data-key="exportList" class="maplibregl-list"></div>
					</details>
				</div>
			</div>
		`);
		this.container = container;
		this.lists = {
			color: colorList,
			export: exportList,
			option: optionList,
			origin: originList,
			recolor: recolorList,
			style: styleList,
		};

		pane.style.display = this.config.open ? 'block' : 'none';
		button.addEventListener('click', () => {
			pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
		});

		this.addOriginInput();
		this.fillStyleList();
		this.fillExportList();

		this.setBaseStyle('colorful');
	}

	private addOriginInput() {
		const { wrapper, input } = createElementsFromHTML(
			`<div class="entry text-container" data-key="wrapper">
				<label>Origin</label>
				<div class="input">
					<input type="text" data-key="input" value="${this.config.origin}" />
				</div>
			</div>`
		) as { wrapper: HTMLDivElement; input: HTMLInputElement };

		const updateOrigin = () => {
			this.config.origin = input.value;
			this.updateBaseStyle();
		};

		input.addEventListener('change', updateOrigin);

		this.lists.origin.appendChild(wrapper);
	}

	private fillStyleList() {
		this.lists.style.innerHTML = '';
		let first = true;
		const inputs: HTMLInputElement[] = [];
		Object.keys(styles).forEach((key) => {
			const { wrapper, input } = createElementsFromHTML(
				`<label data-key="wrapper">
				<input type="radio" data-key="input" value="${key}" />
				<span>${key}</span>
				</label>`
			) as { wrapper: HTMLLabelElement; input: HTMLInputElement };

			if (first) {
				input.checked = true;
				first = false;
			}

			// Style selection event
			input.addEventListener('click', () => {
				inputs.forEach((i) => (i.checked = i === input));
				this.setBaseStyle(key as StyleKeys);
			});

			this.lists.style.appendChild(wrapper);
			inputs.push(input);
		});
	}

	private fillExportList() {
		const { wrapper, download, copy } = createElementsFromHTML(
			`<div class="entry button-container" data-key="wrapper">
			<button data-key="download">Download style.json</button>
			<button data-key="copy">Copy style code</button>
			</div>`
		) as {
			wrapper: HTMLDivElement;
			download: HTMLButtonElement;
			copy: HTMLButtonElement;
		};

		this.lists.export.innerHTML = '';
		this.lists.export.appendChild(wrapper);

		download.addEventListener('click', () => {
			const json = JSON.stringify(this.getStyle(), null, 2);
			const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
			const a = document.createElement('a');
			a.setAttribute('href', dataStr);
			a.setAttribute('download', 'style.json');
			document.body.appendChild(a);
			a.click();
			a.remove();
		});

		copy.addEventListener('click', async () => {
			const minimalOptions = this.getMinimalOptions();
			let optionsString = minimalOptions ? JSON.stringify(minimalOptions, null, 2) : '';
			optionsString = optionsString.replace(/  "([^"]+)": /g, '  $1: ');
			const code = [
				`const style = VersaTilesStyle.${this.currentStyleKey}(${optionsString});`,
			].join('\n');
			await navigator.clipboard.writeText(code);
			alert('Style code copied to clipboard');
		});
	}

	private setBaseStyle(key: StyleKeys) {
		this.currentStyleKey = key;
		this.updateBaseStyle();
	}

	private getBaseStyleFunction(): StyleBuilderFunction {
		return styles[this.currentStyleKey];
	}

	private updateBaseStyle() {
		const baseStyle = this.getBaseStyleFunction();
		const defaultOptions = baseStyle.getOptions();
		this.currentOptions = {
			baseUrl: this.config.origin,
			colors: {},
			recolor: {},
		};

		const update = () => {
			this.renderStyle();
		};

		// Create color list
		const colorList = new ListGenerator(
			this.lists.color,
			this.currentOptions.colors,
			defaultOptions.colors ?? {},
			update
		);
		Object.keys(defaultOptions.colors ?? {}).forEach((key) => {
			colorList.addColor(key, key);
		});

		// Create recolor list
		new ListGenerator(
			this.lists.recolor,
			this.currentOptions.recolor as ValueStore,
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

		// Create option list
		const optionList = new ListGenerator(
			this.lists.option,
			this.currentOptions as unknown as ValueStore,
			(defaultOptions ?? {}) as ValueStore,
			update
		);
		fetchTileJSON(new URL('/tiles/osm/tiles.json', this.config.origin)).then((tileJSON) => {
			optionList.addSelect('language', 'language', tileJSON.languages());
		});

		this.renderStyle();
	}

	private getStyle(): StyleSpecification {
		return this.getBaseStyleFunction()(this.currentOptions);
	}

	private renderStyle() {
		this.map.setStyle(this.getStyle());
	}

	private getMinimalOptions(): StyleBuilderOptions {
		return removeRecursively(
			JSON.parse(JSON.stringify(this.currentOptions)),
			this.getBaseStyleFunction().getOptions()
		) as StyleBuilderOptions;
	}
}

export function removeRecursively(current: unknown, defaults: unknown): unknown {
	if (current === undefined) return undefined;
	if (current === null) return undefined;
	if (current === defaults) return undefined;
	if (typeof current === 'number') return current;
	if (typeof current === 'string') return current;
	if (typeof current === 'boolean') return current;
	if (typeof current === 'object') {
		if (Array.isArray(current)) {
			if (JSON.stringify(current) === JSON.stringify(defaults)) return undefined;
			return current;
		}
		const newObj: Record<string, unknown> = {};
		type R = Record<string, unknown>;
		let entryFound = false;
		for (const key of Object.keys(current as R)) {
			const cleaned = removeRecursively((current as R)[key], (defaults as R)?.[key]);
			if (cleaned !== undefined) {
				newObj[key] = cleaned;
				entryFound = true;
			}
		}
		return entryFound ? newObj : undefined;
	}

	console.log('Comparing', current, defaults);
	throw new Error('Not implemented');
}
