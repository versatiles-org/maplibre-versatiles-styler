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

	it('copies formatted code to clipboard', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode('colorful', { baseUrl: 'https://example.org' });

		const code = writeText.mock.calls[0][0] as string;
		expect(code).toContain("import { colorful } from '@versatiles/style';");
		expect(code).toContain('colorful(');
	});

	it('strips quotes from JSON keys', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode('colorful', { baseUrl: 'https://example.org' });

		const code = writeText.mock.calls[0][0] as string;
		expect(code).toContain('baseUrl:');
		expect(code).not.toContain('"baseUrl":');
	});

	it('handles empty options', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode('colorful', undefined as never);

		const code = writeText.mock.calls[0][0] as string;
		expect(code).toBe("import { colorful } from '@versatiles/style';\nconst style = colorful();");
	});

	it('adds await for satellite style', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode('satellite', { rasterOpacity: 0.5 });

		const code = writeText.mock.calls[0][0] as string;
		expect(code).toContain("import { satellite } from '@versatiles/style';");
		expect(code).toContain('await satellite(');
	});

	it('shows alert after copying', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		await copyStyleCode('satellite', {});

		expect(alertSpy).toHaveBeenCalledWith('Style code copied to clipboard');
	});
});
