import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { getMapStyle } from './helpers';

const tiles = ['https://example.com/tiles/{z}/{x}/{y}'];
const land = { id: 'land', fields: { kind: 'String' }, minzoom: 10, maxzoom: 14 };
const landcover = { id: 'landcover', fields: { kind: 'String' }, minzoom: 0, maxzoom: 7 };

/** Stand-in Shortbread TileJSON, with the land cover merged in or not. */
function osmTileJSON(merged: boolean) {
	return { tilejson: '3.0.0', tiles, vector_layers: merged ? [land, landcover] : [land] };
}

/** Stand-in TileJSON of the land cover on its own, as `landcover-vectors` has it. */
const landcoverTileJSON = { tilejson: '3.0.0', tiles, maxzoom: 10, vector_layers: [landcover] };

/** Serves the stand-ins: the vector tiles, and the land cover tileset or a 404 in its place. */
async function serve(page: Page, osm: object, ownLandcover: boolean) {
	await page.route('**/tiles/osm/tiles.json', (route) => route.fulfill({ json: osm }));
	await page.route('**/tiles/landcover-vectors/tiles.json', (route) =>
		ownLandcover ? route.fulfill({ json: landcoverTileJSON }) : route.fulfill({ status: 404 })
	);
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
}

/** The source of the land cover's forest, or `undefined` while the style has none. */
async function landcoverSource(page: Page): Promise<unknown> {
	const style = await getMapStyle(page);
	const layer = style.layers.find((layer) => layer.id === 'landcover-land-forest');
	return (layer as { source?: unknown } | undefined)?.source;
}

test.describe('land cover', () => {
	test('draws the land cover tileset of the server under the vector tiles', async ({ page }) => {
		await serve(page, osmTileJSON(false), true);
		await expect.poll(() => landcoverSource(page)).toBe('versatiles-landcover');
		await expect(page.locator('.source-found', { hasText: 'Land cover' })).toContainText(
			'zoom 0–10'
		);
	});

	test('draws the land cover that the vector tiles carry themselves', async ({ page }) => {
		await serve(page, osmTileJSON(true), false);
		await expect.poll(() => landcoverSource(page)).toBe('versatiles-shortbread');
	});

	test('draws no land cover where there is none', async ({ page }) => {
		await serve(page, osmTileJSON(false), false);
		await expect.poll(async () => (await getMapStyle(page)).layers.length).toBeGreaterThan(0);
		expect(await landcoverSource(page)).toBeUndefined();
		await expect(page.locator('.source-found', { hasText: 'Land cover' })).toContainText(
			'Not on this server'
		);
	});

	test('carries the land cover into the exported style code', async ({ context, page }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await serve(page, osmTileJSON(false), true);
		await expect.poll(() => landcoverSource(page)).toBe('versatiles-landcover');

		await page.getByRole('button', { name: 'Export' }).click();
		const panel = page.getByRole('dialog', { name: 'Export style' });
		await panel.getByRole('tab', { name: 'Code' }).click();
		await panel.getByRole('button', { name: 'Copy the code snippet' }).click();

		const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardText).toContain('landcover: true');
	});
});
