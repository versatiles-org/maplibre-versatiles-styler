import { test, expect, type Locator, type Page } from '@playwright/test';
import { OMT_SCHEMA } from '@versatiles/style/omt';
import { getMapStyle, openThemePicker } from './helpers';

const OPENFREEMAP = 'https://tiles.openfreemap.org';
const MAPTERHORN = 'https://tiles.mapterhorn.com';

/**
 * Stands in for the other providers, so that the tests do not depend on their servers: the TileJSONs
 * are answered here, and every tile is an empty one.
 */
async function mockProviders(page: Page) {
	await page.route(`${OPENFREEMAP}/**`, (route) => route.fulfill({ status: 204 }));
	await page.route(`${OPENFREEMAP}/planet`, (route) =>
		route.fulfill({
			json: {
				tilejson: '3.0.0',
				tiles: [`${OPENFREEMAP}/planet/test/{z}/{x}/{y}.pbf`],
				minzoom: 0,
				maxzoom: 14,
				vector_layers: Object.entries(OMT_SCHEMA).map(([id, layer]) => ({
					id,
					fields: Object.fromEntries(layer.fields.map((field) => [field, 'String'])),
				})),
			},
		})
	);
	await page.route(`${MAPTERHORN}/**`, (route) => route.fulfill({ status: 204 }));
	// As Mapterhorn publishes it: without a `maxzoom`.
	await page.route(`${MAPTERHORN}/tilejson.json`, (route) =>
		route.fulfill({
			json: {
				tilejson: '3.0.0',
				tiles: [`${MAPTERHORN}/{z}/{x}/{y}.webp`],
				encoding: 'terrarium',
			},
		})
	);
}

function section(page: Page, title: string): Locator {
	return page.locator(`.maplibregl-versatiles-styler details:has(summary:has-text("${title}"))`);
}

function row(scope: Locator, label: string): Locator {
	return scope.locator('.entry', { has: scope.page().locator(`label:text-is("${label}")`) });
}

async function open(page: Page, url = '/#panel=open') {
	await mockProviders(page);
	await page.goto(url);
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
}

/** Opens the tile sources and picks a provider. */
async function chooseProvider(page: Page, provider: string): Promise<Locator> {
	const sources = section(page, 'Tile sources');
	if (!(await row(sources, 'Provider').isVisible())) await sources.locator('summary').click();
	await row(sources, 'Provider').locator('select').selectOption(provider);
	return sources;
}

async function sourceNames(page: Page): Promise<string[]> {
	return Object.keys((await getMapStyle(page)).sources).sort();
}

test.describe('tiles of other providers', () => {
	test('are not offered unless the page asks for them', async ({ page }) => {
		await open(page, '/?external=0#panel=open');
		const server = section(page, 'Tile server');
		await server.locator('summary').click();
		await expect(row(server, 'Origin')).toBeVisible();
		await expect(row(server, 'Provider')).toHaveCount(0);
		await expect(section(page, 'Tile sources')).toHaveCount(0);
	});

	test('OpenFreeMap is drawn with the OpenMapTiles style, and the assets of VersaTiles', async ({
		page,
	}) => {
		await open(page);
		await expect.poll(() => sourceNames(page)).toContain('versatiles-shortbread');

		const sources = await chooseProvider(page, 'openfreemap');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		await expect(sources.locator('summary')).toContainText('OpenFreeMap');
		await expect(row(sources, 'Origin')).toHaveCount(0);

		const style = await getMapStyle(page);
		expect(style.glyphs).toContain('https://tiles.versatiles.org/assets/glyphs/');
		expect(style.layers.length).toBeGreaterThan(100);
	});

	test('OpenFreeMap has no satellite style', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'openfreemap');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		const picker = await openThemePicker(page);
		await expect(picker.locator('input[value="colorful"]')).toHaveCount(1);
		await expect(picker.locator('input[value="satellite"]')).toHaveCount(0);
	});

	test('elevation for OpenFreeMap comes from Mapterhorn, once it is chosen', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'openfreemap');
		const elevation = section(page, 'Terrain & hillshade');
		await elevation.locator('summary').click();
		const hillshade = row(elevation, 'Hillshade').locator('input[type="checkbox"]');
		await expect(hillshade).toBeDisabled();

		await row(sources, 'Elevation').locator('select').selectOption({ label: 'Mapterhorn' });
		await expect(hillshade).toBeEnabled();
		await hillshade.check();
		await expect.poll(() => sourceNames(page)).toEqual(['elevation', 'openmaptiles']);
		const style = await getMapStyle(page);
		expect(style.sources.elevation).toMatchObject({
			type: 'raster-dem',
			tiles: [`${MAPTERHORN}/{z}/{x}/{y}.webp`],
			maxzoom: 12,
		});
	});

	test('going back to VersaTiles restores its server and its tiles', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'openfreemap');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);

		const sources = await chooseProvider(page, 'versatiles');
		await expect.poll(() => sourceNames(page)).toContain('versatiles-shortbread');
		await expect(row(sources, 'Origin').locator('input')).toHaveValue(
			'https://tiles.versatiles.org'
		);
	});

	test('the code for OpenFreeMap is for an npm project only', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'openfreemap');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);

		await page.getByRole('button', { name: 'Export' }).click();
		const dialog = page.getByRole('dialog', { name: 'Export style' });
		await dialog.getByRole('tab', { name: 'Code' }).click();
		await expect(dialog).toContainText("from '@versatiles/style/omt'");
		await expect(dialog.getByRole('radio', { name: 'HTML page' })).toHaveCount(0);
	});
});
