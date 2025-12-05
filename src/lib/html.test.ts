import { describe, it, expect, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).DOMParser = dom.window.DOMParser;

// Mock the SCSS import before importing the module under test
vi.mock('../assets/control-style.scss', () => ({
	default: '.mocked-style { color: hotpink; }'
}));

import { createElementsFromHTML, ensureStylesInjected } from './html';

afterEach(() => {
	// Clean up any styles we injected between tests
	if (typeof document === 'undefined') return;
	const head = document.head;
	const injected = head.querySelectorAll('style[data-versatiles-styler]');
	injected.forEach((el) => el.remove());
});

describe('createElementsFromHTML', () => {
	it('returns a mapping from name attribute to element', () => {
		const html = `
			<div>
				<button name="foo">Foo</button>
				<input name="bar" value="baz" />
				<span>No name</span>
				<div name="nested">
					<span>Inside</span>
				</div>
			</div>
		`;

		const elements = createElementsFromHTML(html);

		// Keys exist
		expect(Object.keys(elements).sort()).toEqual(['bar', 'foo', 'nested']);

		// Correct elements are mapped
		expect(elements.foo.tagName).toBe('BUTTON');
		expect(elements.foo.textContent).toContain('Foo');

		expect((elements.bar as HTMLInputElement).value).toBe('baz');

		expect(elements.nested.tagName).toBe('DIV');
	});

	it('removes the name attribute from all mapped elements', () => {
		const html = `
			<div>
				<button name="foo">Foo</button>
				<input name="bar" />
			</div>
		`;

		const elements = createElementsFromHTML(html);

		expect(elements.foo.getAttribute('name')).toBeNull();
		expect(elements.bar.getAttribute('name')).toBeNull();
	});

	it('returns an empty object when there are no named elements', () => {
		const html = `
			<div>
				<span>no name here</span>
				<p>just text</p>
			</div>
		`;

		const elements = createElementsFromHTML(html);

		expect(elements).toEqual({});
	});
});

describe('ensureStylesInjected', () => {
	it('injects a style element into document.head with the expected attributes', () => {
		expect(document.head.querySelectorAll('style[data-versatiles-styler]').length).toBe(0);

		ensureStylesInjected();

		const styles = document.head.querySelectorAll('style[data-versatiles-styler]');
		expect(styles.length).toBe(1);

		const styleEl = styles[0] as HTMLStyleElement;
		expect(styleEl.tagName.toLowerCase()).toBe('style');
		expect(styleEl.getAttribute('type')).toBe('text/css');
		expect(styleEl.getAttribute('data-versatiles-styler')).toBe('');
		// From our SCSS mock above
		expect(styleEl.textContent).toContain('.mocked-style');
	});

	it('injects a new style element on each call (no internal guard)', () => {
		function checkStyles(n: number) {
			expect(document.head.querySelectorAll('style[data-versatiles-styler]')).toHaveLength(n);
		}

		checkStyles(0);
		ensureStylesInjected();
		checkStyles(1);
		ensureStylesInjected();
		checkStyles(1);
	});

	it('does nothing when document is undefined (and does not throw)', () => {
		// jsdom always has document, so we temporarily remove it
		const originalDocument = (globalThis as any).document;

		try {
			delete (globalThis as any).document;

			expect(() => ensureStylesInjected()).not.toThrow();
		} finally {
			(globalThis as any).document = originalDocument;
		}
	});
});
