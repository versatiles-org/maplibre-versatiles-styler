import { describe, it, expect } from 'vitest';
import { removeRecursively } from './utils';
import { styles } from '@versatiles/style';

describe('removeRecursively', () => {
	it('removes identical properties from current options compared to default options', () => {
		const current = { a: 1, b: 2, c: { d: 3, e: 4, f: { g: 5, h: 6 } }, i: 7 };
		const defaults = { a: 1, b: 20, c: { d: 3, e: 40, f: { g: 50, h: 6 } }, i: 70 };
		const expected = { b: 2, c: { e: 4, f: { g: 5 } }, i: 7 };

		const result = removeRecursively(current, defaults);

		expect(result).toEqual(expected);
	});

	const tests = [
		{ path: 'baseUrl', value: 'https://example.org' },
		{ path: 'tiles', value: ['https://example.org'] },
		{ path: 'hideLabels', value: true },
		{ path: 'language', value: 'de' },
		{ path: 'language', value: '', expectedEmpty: true },
		{ path: 'language', value: null, expectedEmpty: true },
		{ path: 'language', value: undefined, expectedEmpty: true },
		{ path: 'colors.water', value: '#0000ff' },
		{ path: 'colors.water', value: undefined, expectedEmpty: true },
		{ path: 'fonts.regular', value: 'Helvetica' },
		{ path: 'fonts.regular', value: undefined, expectedEmpty: true },
		{ path: 'recolor.invertBrightness', value: true },
		{ path: 'recolor.invertBrightness', value: false, expectedEmpty: true },
		{ path: 'recolor.rotate', value: 12 },
		{ path: 'recolor.tintColor', value: 'F00' },
	];

	describe('handles single style changes correctly', () => {
		const style = styles.colorful;
		const defaultOptions = style.getOptions();

		for (const test of tests) {
			const pathParts = test.path.split('.');
			const obj = JSON.parse(JSON.stringify(defaultOptions));
			setNestedValue(obj, pathParts, test.value);
			const result = removeRecursively(obj, defaultOptions);

			let expected: unknown = {};
			if (test.expectedEmpty) {
				expected = undefined;
			} else {
				setNestedValue(expected, pathParts, test.value);
				if (JSON.stringify(expected) === '{}') expected = undefined;
			}

			it(`setting ${test.path} to ${JSON.stringify(test.value)}`, () => {
				expect(result).toEqual(expected);
			});
		}

		function setNestedValue(obj: any, path: string[], value: any) {
			for (let i = 0; i < path.length; i++) {
				const part = path[i];
				if (!(part in obj)) obj[part] = {};
				if (i === path.length - 1) {
					if (value === undefined) {
						delete obj[part];
					} else {
						obj[part] = value;
					}
				} else {
					obj = obj[part];
				}
			}
		}
	});
});
