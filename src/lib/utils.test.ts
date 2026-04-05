import { describe, it, expect } from 'vitest';
import { deepClone, removeRecursively } from './utils';
import { styles } from '@versatiles/style';

describe('deepClone', () => {
	it('returns a new object equal in value but not in reference', () => {
		const original = { a: 1, b: { c: 2 } };
		const cloned = deepClone(original);
		expect(cloned).toEqual(original);
		expect(cloned).not.toBe(original);
		expect(cloned.b).not.toBe(original.b);
	});

	it('clones arrays', () => {
		const original = [1, [2, 3]];
		const cloned = deepClone(original);
		expect(cloned).toEqual(original);
		expect(cloned).not.toBe(original);
	});
});

describe('removeRecursively', () => {
	it('removes identical properties compared to defaults', () => {
		const current = { a: 1, b: 2, c: { d: 3, e: 4, f: { g: 5, h: 6 } }, i: 7 };
		const defaults = { a: 1, b: 20, c: { d: 3, e: 40, f: { g: 50, h: 6 } }, i: 70 };
		expect(removeRecursively(current, defaults)).toEqual({ b: 2, c: { e: 4, f: { g: 5 } }, i: 7 });
	});

	it('returns undefined when all properties match defaults', () => {
		expect(removeRecursively({ a: 1 }, { a: 1 })).toBeUndefined();
	});

	it('returns undefined for equal arrays', () => {
		expect(removeRecursively([1, 2, 3], [1, 2, 3])).toBeUndefined();
	});

	it('returns the array when arrays differ', () => {
		expect(removeRecursively([1, 2, 3], [1, 2, 4])).toEqual([1, 2, 3]);
	});

	it('returns undefined for undefined', () => {
		expect(removeRecursively(undefined, {})).toBeUndefined();
	});

	it('returns undefined for null', () => {
		expect(removeRecursively(null, null)).toBeUndefined();
	});

	it('handles non-plain-object defaults when current is an object', () => {
		// defaults is a primitive — falls back to {} so all keys are kept
		expect(removeRecursively({ a: 1 }, 42)).toEqual({ a: 1 });
	});

	it('throws for unsupported types', () => {
		expect(() => removeRecursively(() => {}, null)).toThrow('unsupported type');
	});

	describe('handles single style changes correctly', () => {
		const defaultOptions = styles.colorful.getOptions();

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

		for (const test of tests) {
			it(`setting ${test.path} to ${JSON.stringify(test.value)}`, () => {
				const pathParts = test.path.split('.');
				const obj = deepClone(defaultOptions);
				setNestedValue(obj, pathParts, test.value);
				const result = removeRecursively(obj, defaultOptions);

				let expected: unknown = {};
				if (test.expectedEmpty) {
					expected = undefined;
				} else {
					setNestedValue(expected, pathParts, test.value);
					if (JSON.stringify(expected) === '{}') expected = undefined;
				}

				expect(result).toEqual(expected);
			});
		}
	});
});
