import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import type { ValueStore } from './listgenerator';
import { Color } from '@versatiles/style';

// Setup a minimal DOM environment for this test file
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).Event = dom.window.Event;

const colorParseSpy = vi.spyOn(Color, 'parse');

import { ListGenerator } from './listgenerator';

afterEach(() => {
	vi.clearAllMocks();
	// Clean the body between tests
	if (typeof document !== 'undefined') {
		document.body.innerHTML = '';
	}
});

describe('ListGenerator', () => {
	let container: HTMLDivElement;
	let values: ValueStore;
	let defaultValues: ValueStore;
	let changeHandler: typeof vi.fn;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		values = {};
		defaultValues = {};
		changeHandler = vi.fn();
	});

	it('clears the container on construction', () => {
		container.innerHTML = '<p>old content</p>';

		new ListGenerator(container, values, defaultValues, changeHandler);

		expect(container.innerHTML).toBe('');
	});

	it('adds a checkbox input wired to the value store and change handler', () => {
		defaultValues.showLayer = true;

		const list = new ListGenerator(container, values, defaultValues, changeHandler);
		list.addCheckbox('showLayer', 'Show layer');

		const entry = container.querySelector('.entry') as HTMLDivElement;
		expect(entry).toBeTruthy();

		const input = entry.querySelector('input[type="checkbox"]') as HTMLInputElement;
		const reset = entry.querySelector('button') as HTMLButtonElement;

		expect(input).toBeTruthy();
		expect(reset).toBeTruthy();

		// Default value is applied
		expect(input.checked).toBe(true);
		expect(values.showLayer).toBe(true);
		expect(reset.disabled).toBe(true);

		// Simulate user changing the checkbox
		input.checked = false;
		input.dispatchEvent(new Event('change', { bubbles: true }));

		expect(values.showLayer).toBe(false);
		expect(reset.disabled).toBe(false);
		expect(changeHandler).toHaveBeenCalledTimes(1);

		// Reset restores default and triggers handler again
		reset.dispatchEvent(new Event('click', { bubbles: true }));

		expect(input.checked).toBe(true);
		expect(values.showLayer).toBe(true);
		expect(reset.disabled).toBe(true);
		expect(changeHandler).toHaveBeenCalledTimes(2);
	});

	it('adds a number input with clamped default and scaling', () => {
		// Default is outside range to exercise clamping
		defaultValues.zoom = 100;

		const list = new ListGenerator(container, values, defaultValues, changeHandler);
		list.addNumber('zoom', 'Zoom', 0, 10, 2);

		const entry = container.querySelector('.entry') as HTMLDivElement;
		const input = entry.querySelector('input[type="range"]') as HTMLInputElement;

		expect(input).toBeTruthy();

		// Default value should be clamped to max (10) and scaled by 2 -> "20"
		expect(input.value).toBe('20');
		expect(values.zoom).toBe(10);

		// Simulate user entering a new value; readValue does not clamp, it just rescales
		input.value = '4';
		input.dispatchEvent(new Event('change', { bubbles: true }));

		// 4 / scale(2) = 2
		expect(values.zoom).toBe(2);
		expect(changeHandler).toHaveBeenCalledTimes(1);
	});

	it('adds a color input and uses Color.parse on change', () => {
		defaultValues.color = '#ff0000';

		const list = new ListGenerator(container, values, defaultValues, changeHandler);
		list.addColor('color', 'Color');

		const entry = container.querySelector('.entry') as HTMLDivElement;
		const input = entry.querySelector('input[type="color"]') as HTMLInputElement;
		const reset = entry.querySelector('button') as HTMLButtonElement;

		expect(input).toBeTruthy();
		expect(reset).toBeTruthy();

		// Default value from base Input.setValue (no Color.parse involved)
		expect(input.value).toBe('#ff0000');
		expect(values.color).toBe('#ff0000');
		expect(colorParseSpy).not.toHaveBeenCalled();

		// Simulate user picking a new color
		input.value = '#00ff00';
		input.dispatchEvent(new Event('change', { bubbles: true }));

		expect(colorParseSpy).toHaveBeenCalledTimes(1);
		expect(colorParseSpy).toHaveBeenCalledWith('#00ff00');
		// Value store receives the parsed value
		expect(values.color).not.toBeUndefined();
		expect(changeHandler).toHaveBeenCalledTimes(1);
	});

	it('adds a select input bound to the value store', () => {
		defaultValues.language = 'en';

		const options: Record<string, string> = {
			English: 'en',
			German: 'de',
		};

		const list = new ListGenerator(container, values, defaultValues, changeHandler);
		list.addSelect('language', 'Language', options);

		const entry = container.querySelector('.entry') as HTMLDivElement;
		const select = entry.querySelector('select') as HTMLSelectElement;
		const reset = entry.querySelector('button') as HTMLButtonElement;

		expect(select).toBeTruthy();
		expect(reset).toBeTruthy();

		// Default selection
		expect(select.value).toBe('en');
		expect(values.language).toBe('en');

		// Options rendered correctly
		const renderedOptions = Array.from(select.options).map((o) => ({
			value: o.value,
			label: o.textContent,
		}));
		expect(renderedOptions).toEqual([
			{ value: 'en', label: 'English' },
			{ value: 'de', label: 'German' },
		]);

		// Change selection
		select.value = 'de';
		select.dispatchEvent(new Event('change', { bubbles: true }));

		expect(values.language).toBe('de');
		expect(changeHandler).toHaveBeenCalledTimes(1);
	});
});
