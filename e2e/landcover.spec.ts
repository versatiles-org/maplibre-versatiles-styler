import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

const tiles = ['https://example.com/tiles/osm/{z}/{x}/{y}'];

/** Stand-in TileJSON whose `land` layer starts at the given zoom. */
function tileJSON(landMinzoom: number) {
	return {
		tilejson: '3.0.0',
		tiles,
		vector_layers: [
			{ id: 'land', fields: { kind: 'String' }, minzoom: landMinzoom, maxzoom: 14 },
			{ id: 'water_polygons', fields: { kind: 'String' }, minzoom: landMinzoom, maxzoom: 14 },
		],
	};
}

async function landForestOpacity(page: import('@playwright/test').Page) {
	const style = await getMapStyle(page);
	return style.layers.find((layer) => layer.id === 'land-forest')?.paint?.['fill-opacity'];
}

test.describe('landcover detection', () => {
	test('flattens the low-zoom fills when the tiles carry landcover', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) => route.fulfill({ json: ['osm'] }));
		await page.route('**/tiles/osm/tiles.json', (route) => route.fulfill({ json: tileJSON(0) }));
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		// `forest` peaks at 0.1, so the ramp collapses to a constant
		await expect.poll(() => landForestOpacity(page)).toBe(0.1);
	});

	test('carries the detected flag into the exported style code', async ({ context, page }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.route('**/tiles/index.json', (route) => route.fulfill({ json: ['osm'] }));
		await page.route('**/tiles/osm/tiles.json', (route) => route.fulfill({ json: tileJSON(0) }));
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
		await expect.poll(() => landForestOpacity(page)).toBe(0.1);

		const exportDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:has-text("Export"))'
		);
		await exportDetails.locator('summary').click();
		page.once('dialog', (dialog) => dialog.dismiss());
		await exportDetails.locator('button', { hasText: 'Copy style code' }).click();

		const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardText).toContain('landcover: true');
	});

	test('keeps the plain Shortbread ramps when the tiles do not', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) => route.fulfill({ json: ['osm'] }));
		await page.route('**/tiles/osm/tiles.json', (route) => route.fulfill({ json: tileJSON(10) }));
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		await expect
			.poll(() => landForestOpacity(page))
			.toEqual({
				stops: [
					[7, 0],
					[8, 0.1],
				],
			});
	});
});
