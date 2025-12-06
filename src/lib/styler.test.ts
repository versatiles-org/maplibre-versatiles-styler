import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import type { Map as MLGLMap } from 'maplibre-gl';

// --- jsdom setup (local to this test file) ---
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).Event = dom.window.Event;

// --- Import the SUT and mocked modules AFTER mocks ---
import { Styler } from './styler';
import { styles } from '@versatiles/style';
import { type VersaTilesStylerConfig } from './types';

const defaultConfig: VersaTilesStylerConfig = {
	open: true,
	origin: 'https://tiles.versatiles.org',
};
let map: MLGLMap;

vi.mock('./tile_json', () => {
	return {
		fetchTileJSON: async () => {
			return {
				languages() {
					return { local: '', german: 'de', english: 'en', french: 'fr', spanish: 'es' };
				},
			};
		},
	};
});

function extractElements(styler: Styler) {
	const mainContainer = styler.container;
	const mainPane = mainContainer.querySelector('.maplibregl-pane') as HTMLElement;
	const mainToggleButton = mainContainer.querySelector(
		'button.maplibregl-ctrl-icon'
	) as HTMLButtonElement;

	expect(mainPane.tagName).toBe('DIV');
	expect(mainToggleButton.tagName).toBe('BUTTON');

	const styleList = styler.lists.style;
	const colorList = styler.lists.color;
	const recolorList = styler.lists.recolor;
	const optionList = styler.lists.option;
	const styleButtons = Object.fromEntries(
		Array.from(styleList.querySelectorAll('input')).map((i) => [i.value || '', i])
	);

	return {
		colorList,
		mainContainer,
		mainPane,
		mainToggleButton,
		optionList,
		recolorList,
		styleButtons,
		styleList,
	};
}

beforeEach(() => {
	map = {
		setStyle: vi.fn(),
		getStyle: vi.fn().mockReturnValue({}),
	} as unknown as MLGLMap;
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Styler', () => {
	it('exposes the container element', () => {
		const { mainContainer } = extractElements(new Styler(map, defaultConfig));
		expect(mainContainer.tagName).toBe('DIV');
		expect(mainContainer.classList).toContain('maplibregl-versatiles-styler');
	});

	it('initializes pane visibility based on config.open and toggles on button click', () => {
		// open: true -> pane should be visible
		const { mainPane, mainToggleButton } = extractElements(new Styler(map, defaultConfig));
		expect(mainPane.style.display).toBe('block');

		// toggle off
		mainToggleButton.dispatchEvent(new Event('click', { bubbles: true }));
		expect(mainPane.style.display).toBe('none');

		// toggle on again
		mainToggleButton.dispatchEvent(new Event('click', { bubbles: true }));
		expect(mainPane.style.display).toBe('block');
	});

	it('initializes pane visibility based on config.open and toggles on button click', () => {
		// open: false -> pane should be hidden
		const { mainPane } = extractElements(new Styler(map, { ...defaultConfig, open: false }));
		expect(mainPane.style.display).toBe('none');
	});

	it('creates a style button for each style and uses the current style initially', () => {
		// Spy on the default style's getOptions
		const colorfulGetOptionsSpy = vi.spyOn(styles.colorful, 'getOptions');
		const shadowGetOptionsSpy = vi.spyOn(styles.shadow, 'getOptions');
		const setStyleMock = vi.mocked(map.setStyle);

		expect(colorfulGetOptionsSpy).toHaveBeenCalledTimes(0);
		expect(setStyleMock).toHaveBeenCalledTimes(0);

		const { styleButtons } = extractElements(new Styler(map, defaultConfig));

		// One button per style in the real `styles` object
		expect(Object.keys(styleButtons).length).toBe(Object.keys(styles).length);

		// Constructor uses styles.colorful as default
		expect(colorfulGetOptionsSpy).toHaveBeenCalledTimes(1);
		expect(setStyleMock).toHaveBeenCalledTimes(1);

		// Use the real "shadow" style button if available
		const shadowButton = styleButtons.shadow;
		expect(shadowButton).toBeTruthy();

		// Clicking shadow button should cause a new style to be rendered
		expect(shadowGetOptionsSpy).toHaveBeenCalledTimes(0);
		shadowButton!.dispatchEvent(new Event('click', { bubbles: true }));
		expect(shadowGetOptionsSpy).toHaveBeenCalledTimes(1);
		expect(setStyleMock).toHaveBeenCalledTimes(2);
	});

	it('creates entries for colors, recolor, and options when setting a style', async () => {
		const styler = new Styler(map, defaultConfig);
		await Promise.resolve(); // Wait for async TileJSON fetch to complete
		const { colorList, recolorList, optionList } = extractElements(styler);

		// Our createElementsFromHTML mock creates a generic entry for each ListGenerator call.
		// We don't assert the exact number of entries, but we do expect that the containers
		// for color, recolor and options are used and receive children.
		expect(colorList.childElementCount).toBeGreaterThanOrEqual(40);
		expect(recolorList.childElementCount).toBeGreaterThanOrEqual(10);
		expect(optionList.childElementCount).toBeGreaterThanOrEqual(1);
	});
});
