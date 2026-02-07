import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../assets/control-style.scss?inline', () => ({
	default: '.test { color: red; }',
}));

import { ensureStylesInjected } from './styles';

describe('ensureStylesInjected', () => {
	beforeEach(() => {
		document.head.querySelectorAll('style[data-versatiles-styler]').forEach((el) => el.remove());
	});

	it('injects a <style> element into document.head', () => {
		ensureStylesInjected();

		const el = document.head.querySelector('style[data-versatiles-styler]');
		expect(el).not.toBeNull();
		expect(el!.getAttribute('type')).toBe('text/css');
		expect(el!.textContent).toBe('.test { color: red; }');
	});

	it('does not inject a second <style> element on repeated calls', () => {
		ensureStylesInjected();
		ensureStylesInjected();

		const els = document.head.querySelectorAll('style[data-versatiles-styler]');
		expect(els.length).toBe(1);
	});
});
