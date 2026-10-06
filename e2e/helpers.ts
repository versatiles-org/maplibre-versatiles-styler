import type { Locator, Page } from '@playwright/test';

export interface MapStyle {
	version: number;
	name?: string;
	glyphs?: string;
	sources: Record<string, unknown>;
	layers: Array<{
		id: string;
		type: string;
		paint?: Record<string, unknown>;
		layout?: Record<string, unknown>;
	}>;
}

interface MapLike {
	getStyle(): MapStyle | undefined;
	once(type: string, listener: () => void): void;
}

/**
 * Reads the map's current style, waiting out any reload in progress.
 *
 * MapLibre's `Style.serialize()` bails while `_loaded` is false, so `map.getStyle()` returns
 * `undefined` for a frame or two after every `setStyle()` — and the styler reloads the style
 * whenever an option, the font list or the TileJSON arrives. Sampling that window would hand
 * a test `undefined` instead of a style.
 */
export async function getMapStyle(page: Page): Promise<MapStyle> {
	return page.evaluate(async () => {
		const map = (window as unknown as { _map: MapLike })._map;
		for (;;) {
			const style = map.getStyle();
			if (style) return style;
			// No `await` between the check and the listener, so the event cannot be missed.
			await new Promise<void>((resolve) => map.once('style.load', () => resolve()));
		}
	});
}

/** Opens the theme picker, if it is not open, and returns it. */
export async function openThemePicker(page: Page): Promise<Locator> {
	const picker = page.locator('.maplibregl-versatiles-styler .theme-picker');
	if ((await picker.count()) === 0) {
		await page.locator('.maplibregl-versatiles-styler button.theme-button').click();
	}
	await picker.waitFor();
	return picker;
}

/** Picks a base style in the theme picker, which closes on the click: a theme, or `satellite`. */
export async function selectStyle(page: Page, key: string): Promise<void> {
	const picker = await openThemePicker(page);
	await picker.locator(`label:has(input[value="${key}"])`).click();
	await picker.waitFor({ state: 'detached' });
}
