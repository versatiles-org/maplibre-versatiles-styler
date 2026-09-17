import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	byteLength,
	copyText,
	downloadStyle,
	downloadText,
	formatSize,
	shareLink,
	styleJson,
} from './export';
import type { StyleSpecification } from 'maplibre-gl';

const style = { version: 8, sources: {}, layers: [] } as unknown as StyleSpecification;

describe('styleJson', () => {
	it('pretty-prints by default', () => {
		expect(styleJson(style)).toBe(JSON.stringify(style, null, 2));
		expect(styleJson(style)).toContain('\n');
	});

	it('minifies on request, and the two parse to the same style', () => {
		const minified = styleJson(style, 'minified');
		expect(minified).not.toContain('\n');
		expect(minified).toBe(JSON.stringify(style));
		expect(JSON.parse(minified)).toEqual(JSON.parse(styleJson(style, 'pretty')));
	});

	it('minified is smaller than pretty for a style with content', () => {
		const real = {
			version: 8,
			sources: { x: { type: 'vector', tiles: ['https://example.org/{z}/{x}/{y}'] } },
			layers: [{ id: 'a', type: 'background', paint: { 'background-color': '#fff' } }],
		} as unknown as StyleSpecification;
		expect(styleJson(real, 'minified').length).toBeLessThan(styleJson(real, 'pretty').length);
	});
});

describe('formatSize', () => {
	it.each([
		[0, '0 B'],
		[999, '999 B'],
		[1000, '1.0 kB'],
		[340_000, '340.0 kB'],
		[1_100_000, '1.1 MB'],
	])('%i → %s', (bytes, expected) => {
		expect(formatSize(bytes)).toBe(expected);
	});
});

describe('byteLength', () => {
	it('counts UTF-8 bytes, not characters', () => {
		expect(byteLength('abc')).toBe(3);
		// a character outside the BMP is four bytes, and two UTF-16 code units
		expect('🗺'.length).toBe(2);
		expect(byteLength('🗺')).toBe(4);
		expect(byteLength('ü')).toBe(2);
	});
});

describe('downloadText', () => {
	const createObjectURL = vi.fn((_blob?: unknown) => 'blob:fake');
	const revokeObjectURL = vi.fn();

	beforeEach(() => {
		vi.restoreAllMocks();
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		Object.assign(URL, { createObjectURL, revokeObjectURL });
	});

	afterEach(() => vi.restoreAllMocks());

	function mockAnchor() {
		const element = { setAttribute: vi.fn(), click: vi.fn(), remove: vi.fn() };
		vi.spyOn(document, 'createElement').mockReturnValue(element as unknown as HTMLAnchorElement);
		vi.spyOn(document.body, 'appendChild').mockImplementation(
			(node) => node as unknown as HTMLAnchorElement
		);
		return element;
	}

	it('downloads through a blob URL, not a data: URL', () => {
		// a style.json is hundreds of kilobytes; encodeURIComponent of that is slow and far larger
		const element = mockAnchor();
		downloadText('{"a":1}', 'style.json');

		expect(createObjectURL).toHaveBeenCalledOnce();
		expect(element.setAttribute).toHaveBeenCalledWith('href', 'blob:fake');
		expect(element.setAttribute).toHaveBeenCalledWith('download', 'style.json');
		expect(element.click).toHaveBeenCalled();
		expect(element.remove).toHaveBeenCalled();
	});

	it('releases the object URL, so the blob is not held in memory', () => {
		mockAnchor();
		downloadText('{"a":1}', 'style.json');
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
	});

	it('downloadStyle writes the chosen format', () => {
		mockAnchor();
		const blobs: Blob[] = [];
		createObjectURL.mockImplementation((blob: unknown) => {
			blobs.push(blob as Blob);
			return 'blob:fake';
		});

		downloadStyle(style, 'minified');
		expect(blobs).toHaveLength(1);
		expect(blobs[0].size).toBe(byteLength(JSON.stringify(style)));
	});
});

describe('copyText', () => {
	beforeEach(() => vi.restoreAllMocks());

	it('copies to the clipboard, and says nothing itself', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyText("import { osm } from '@versatiles/style';");

		expect(writeText).toHaveBeenCalledWith("import { osm } from '@versatiles/style';");
		// the styler reports it in the dialog instead of interrupting with a browser dialog
		expect(alertSpy).not.toHaveBeenCalled();
	});
});

describe('shareLink', () => {
	it('is the current URL, which already carries the whole configuration', () => {
		expect(shareLink(true)).toBe(window.location.href);
	});

	it('is undefined without the hash, where the URL says nothing about the style', () => {
		expect(shareLink(false)).toBeUndefined();
	});
});
