import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import type { Map as MLGLMap } from 'maplibre-gl';
import * as html from './html';

// --- jsdom setup (local to this test file) ---
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).Event = dom.window.Event;

// --- Import the SUT and mocked modules AFTER mocks ---
import { Styler } from './styler';
import { styles } from '@versatiles/style';
import { VersaTilesStylerConfig } from './config';

let mainContainer: HTMLElement;
let mainPane: HTMLElement;
let mainToggleButton: HTMLButtonElement;
let styleList: HTMLElement;
let colorList: HTMLElement;
let recolorList: HTMLElement;
let optionList: HTMLElement;
let map: MLGLMap;
const defaultConfig: VersaTilesStylerConfig = {
	open: true,
	origin: 'https://tiles.versatiles.org'
};
const styleButtons: Record<string, HTMLButtonElement> = {};

beforeEach(() => {
	// fresh DOM elements for each test
	mainContainer = document.createElement('div');
	mainPane = document.createElement('div');
	mainToggleButton = document.createElement('button');
	styleList = document.createElement('div');
	colorList = document.createElement('div');
	recolorList = document.createElement('div');
	optionList = document.createElement('div');
	map = { setStyle: vi.fn() } as unknown as MLGLMap;

	// reset styleButtons map
	for (const key of Object.keys(styleButtons)) {
		delete styleButtons[key];
	}

	// reset mocks and set implementation
	vi.restoreAllMocks();
	vi.spyOn(html, 'createElementsFromHTML').mockImplementation(
		(htmlString: string): Record<string, HTMLElement> => {
			// first call: main control structure
			if (htmlString.includes('maplibregl-versatiles-styler')) {
				return {
					container: mainContainer,
					pane: mainPane,
					button: mainToggleButton,
					styleList,
					colorList,
					recolorList,
					optionList
				};
			}

			// entries created in fillStyleList() and by ListGenerator
			if (htmlString.includes('class="entry"')) {
				// Try to detect if this is a style entry (contains a known style name)
				const styleName = Object.keys(styles).find((name) => htmlString.includes(name));
				if (styleName) {
					const btn = document.createElement('button');
					styleButtons[styleName] = btn;
					return { button: btn };
				}

				// Otherwise, treat it as a generic list entry used by ListGenerator
				const button = document.createElement('div');
				button.className = 'entry';
				const input = document.createElement('input');
				const reset = document.createElement('button');
				return { button, input, reset };
			}

			throw new Error(`Unexpected HTML passed to createElementsFromHTML: ${htmlString}`);
		}
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Styler', () => {
	it('exposes the container element', () => {
		const styler = new Styler(map, defaultConfig);

		expect(styler.container).toBe(mainContainer);
	});

	it('initializes pane visibility based on config.open and toggles on button click', () => {
		// open: true -> pane should be visible
		new Styler(map, defaultConfig);
		expect(mainPane.style.display).toBe('block');

		// toggle off
		mainToggleButton.dispatchEvent(new Event('click', { bubbles: true }));
		expect(mainPane.style.display).toBe('none');

		// toggle on again
		mainToggleButton.dispatchEvent(new Event('click', { bubbles: true }));
		expect(mainPane.style.display).toBe('block');

		// open: false -> pane hidden initially
		new Styler(map, { ...defaultConfig, open: false });
		expect(mainPane.style.display).toBe('none');
	});

	it('creates a style button for each style and uses the current style initially', () => {
		// Spy on the default style's getOptions
		const colorfulGetOptionsSpy = vi.spyOn(styles.colorful, 'getOptions');

		const setStyleMock = vi.mocked(map.setStyle);

		expect(colorfulGetOptionsSpy).toHaveBeenCalledTimes(0);
		expect(setStyleMock).toHaveBeenCalledTimes(0);
		new Styler(map, defaultConfig);

		// One button per style in the real `styles` object
		expect(Object.keys(styleButtons).length).toBe(Object.keys(styles).length);

		// Constructor uses styles.colorful as default
		expect(colorfulGetOptionsSpy).toHaveBeenCalledTimes(1);
		expect(setStyleMock).toHaveBeenCalledTimes(1);

		// Use the real "shadow" style button if available
		const shadowButton = styleButtons.shadow;
		expect(shadowButton).toBeTruthy();

		const shadowGetOptionsSpy = vi.spyOn(styles.shadow, 'getOptions');
		// Clicking shadow button should cause a new style to be rendered
		shadowButton!.dispatchEvent(new Event('click', { bubbles: true }));
		expect(shadowGetOptionsSpy).toHaveBeenCalledTimes(1);
		expect(setStyleMock).toHaveBeenCalledTimes(2);

		// If shadow is already active, clicking it again should be ignored
		shadowButton!.classList.add('active');
		setStyleMock.mockClear();
		shadowButton!.dispatchEvent(new Event('click', { bubbles: true }));
		expect(setStyleMock).not.toHaveBeenCalled();
	});

	it('creates entries for colors, recolor, and options when setting a style', () => {
		new Styler(map, defaultConfig);

		// Our createElementsFromHTML mock creates a generic entry for each ListGenerator call.
		// We don't assert the exact number of entries, but we do expect that the containers
		// for color, recolor and options are used and receive children.
		expect(colorList.childElementCount).toBeGreaterThanOrEqual(40);
		expect(recolorList.childElementCount).toBeGreaterThanOrEqual(10);
		expect(optionList.childElementCount).toBeGreaterThanOrEqual(1);
	});
});
