import type { Map as MLGLMap } from 'maplibre-gl';
import { styles } from '@versatiles/style';
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
	#currentStyle: any;

	constructor(map: MLGLMap, config: Config) {
		this.#map = map;
		this.#config = config;
		this.#currentStyle = styles.colorful;

		const { button, container, list, listContainer } = createElementsFromHTML(`
			<div id="container">
				<div class="maplibregl-ctrl maplibregl-ctrl-group">
					<button id="button" type="button" class="maplibregl-ctrl-icon maplibregl-style-switcher"></button>
				</div>
				<div id="listContainer" class="maplibregl-ctrl maplibregl-ctrl-group" style="display: none">
					<p>Select a style:</p>
					<div id="list" class="maplibregl-style-list"></div>
				</div>
			</div>
		`);
		this.#container = container;
		button.addEventListener('click', () => {
			listContainer.style.display = listContainer.style.display === 'block' ? 'none' : 'block';
		});

		// Populate style options
		Object.entries(styles).forEach(([name, style]) => {
			const { button } = createElementsFromHTML(`<button id="button" type="button">${name}</button>`);

			// Style selection event
			button.addEventListener('click', () => {
				if (button.classList.contains('active')) return;

				listContainer.style.display = 'none';
				button.style.display = 'block';
				listContainer.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				button.classList.add('active');

				this.#currentStyle = style;
				this.updateStyle();
			});

			if (style === this.#currentStyle) {
				button.classList.add('active');
			}
			list.appendChild(button);
		});
	}

	public get container(): HTMLElement {
		return this.#container;
	}

	private updateStyle() {
		this.#map.setStyle(this.#currentStyle(this.#config));
	}
	/*
	

	const styles = VersaTilesStyle.styles; // Assuming VersaTilesStyle.styles is defined elsewhere
	let currentStyle = styles.colorful; // Default style

	document.addEventListener('click', onDocumentClick);
	const button = getButton();
	const { list, listContainer } = getListContainer();

	updateStyle();

	return { container };

	function updateStyle() {
		map.setStyle(currentStyle(config));
	}

	function onDocumentClick(event) {
		if (!button.contains(event.target)) {
			listContainer.style.display = 'none';
		}
	}

	function getButton() {
		// Create button container
		const buttonContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
		container.appendChild(buttonContainer);

		// Create style toggle button
		const button = createElementFromHTML('<button type="button" class="maplibregl-ctrl-icon maplibregl-style-switcher"></button>');
		buttonContainer.appendChild(button);

		// Toggle style list display
		button.addEventListener('click', () => {
			listContainer.style.display = listContainer.style.display === 'block' ? 'none' : 'block';
		});

		return button;
	}

	function getListContainer() {

		// Create list container
		const listContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
		container.appendChild(listContainer);
		listContainer.style.display = 'none';

		// Create style selector container
		listContainer.appendChild(createElementFromHTML('<p>Select a style:</p>'));

		// Create style selector container
		const list = createElementFromHTML('<div class="maplibregl-style-list"></div>');
		listContainer.appendChild(list);

		// Populate style options
		Object.entries(styles).forEach(([name, style]) => {
			const styleElement = createElementFromHTML(`<button type="button">${name}</button>`);

			// Style selection event
			styleElement.addEventListener('click', (event) => {
				const target = event.target;
				if (target.classList.contains('active')) return;

				listContainer.style.display = 'none';
				button.style.display = 'block';
				listContainer.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				target.classList.add('active');

				currentStyle = style;
				updateStyle();
			});

			if (style === currentStyle) {
				styleElement.classList.add('active');
			}
			list.appendChild(styleElement);
		});

		return { list, listContainer };
	}

	function createElementFromHTML(htmlString) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlString, 'text/html');
		return doc.body.firstChild; // Returns the first element
	}
	*/
}