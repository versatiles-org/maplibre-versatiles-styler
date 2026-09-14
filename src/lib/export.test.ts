import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadStyle, copyStyleCode } from './export';
import type { StyleSpecification } from 'maplibre-gl';

describe('downloadStyle', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('creates a download link and triggers click', () => {
		const mockElement = {
			setAttribute: vi.fn(),
			click: vi.fn(),
			remove: vi.fn(),
		};
		vi.spyOn(document, 'createElement').mockReturnValue(
			mockElement as unknown as HTMLAnchorElement
		);
		vi.spyOn(document.body, 'appendChild').mockImplementation(
			(node) => node as unknown as HTMLAnchorElement
		);

		const style = { version: 8, sources: {}, layers: [] } as unknown as StyleSpecification;
		downloadStyle(style);

		expect(document.createElement).toHaveBeenCalledWith('a');
		expect(mockElement.setAttribute).toHaveBeenCalledWith(
			'href',
			expect.stringContaining('data:text/json;charset=utf-8,')
		);
		expect(mockElement.setAttribute).toHaveBeenCalledWith('download', 'style.json');
		expect(document.body.appendChild).toHaveBeenCalled();
		expect(mockElement.click).toHaveBeenCalled();
		expect(mockElement.remove).toHaveBeenCalled();
	});

	it('encodes style as JSON in the data URL', () => {
		const mockElement = {
			setAttribute: vi.fn(),
			click: vi.fn(),
			remove: vi.fn(),
		};
		vi.spyOn(document, 'createElement').mockReturnValue(
			mockElement as unknown as HTMLAnchorElement
		);
		vi.spyOn(document.body, 'appendChild').mockImplementation(
			(node) => node as unknown as HTMLAnchorElement
		);

		const style = { version: 8, sources: {}, layers: [] } as unknown as StyleSpecification;
		downloadStyle(style);

		const hrefCall = mockElement.setAttribute.mock.calls.find((c: string[]) => c[0] === 'href');
		const dataUrl = hrefCall![1] as string;
		const json = decodeURIComponent(dataUrl.replace('data:text/json;charset=utf-8,', ''));
		expect(JSON.parse(json)).toEqual(style);
	});
});

describe('copyStyleCode', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('copies the code to the clipboard', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode("import { osm } from '@versatiles/style';");

		expect(writeText).toHaveBeenCalledWith("import { osm } from '@versatiles/style';");
	});

	it('shows alert after copying', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode('');

		expect(alertSpy).toHaveBeenCalledWith('Style code copied to clipboard');
	});
});
