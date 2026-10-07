import { test, expect, type Locator, type Page } from '@playwright/test';
import { OMT_SCHEMA } from '@versatiles/style/omt';
import { PROTOMAPS_SCHEMA } from '@versatiles/style/protomaps';
import { byteRange, pmtilesArchive } from './pmtiles-archive';
import { getMapStyle, openThemePicker } from './helpers';

const OPENFREEMAP = 'https://tiles.openfreemap.org';
const MAPTERHORN = 'https://tiles.mapterhorn.com';
const PROTOMAPS = 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles';

type Layers = Record<string, { fields: readonly string[] }>;
const vectorLayers = (schema: Layers) =>
	Object.entries(schema).map(([id, layer]) => ({
		id,
		fields: Object.fromEntries(layer.fields.map((field) => [field, 'String'])),
	}));

/** Answers the range requests for a PMTiles archive at `url`. */
async function mockArchive(page: Page, url: string, archive: Uint8Array) {
	await page.route(url, (route) => {
		const { body, contentRange } = byteRange(archive, route.request().headers().range);
		return route.fulfill({
			status: 206,
			body: Buffer.from(body),
			headers: { 'Content-Range': contentRange, 'Access-Control-Allow-Origin': '*' },
		});
	});
}

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
				vector_layers: vectorLayers(OMT_SCHEMA),
			},
		})
	);
	await mockArchive(
		page,
		PROTOMAPS,
		pmtilesArchive({
			attribution: '© OpenStreetMap',
			vector_layers: vectorLayers(PROTOMAPS_SCHEMA),
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

	test('Protomaps is drawn from a PMTiles archive, with the Protomaps style', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'protomaps');
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);
		await expect(sources.locator('summary')).toContainText('Protomaps');
		await expect(row(sources, 'Archive').locator('input')).toHaveValue(PROTOMAPS);

		const style = await getMapStyle(page);
		expect(style.sources.protomaps).toMatchObject({
			type: 'vector',
			tiles: [`pmtiles://${PROTOMAPS}/{z}/{x}/{y}.mvt`],
			maxzoom: 15,
		});
		expect(style.glyphs).toContain('https://tiles.versatiles.org/assets/glyphs/');
	});

	test('another archive can be named, and Mapterhorn added to it', async ({ page }) => {
		const other = 'https://archives.example.org/extract.pmtiles';
		await open(page);
		await mockArchive(
			page,
			other,
			pmtilesArchive({ vector_layers: vectorLayers(PROTOMAPS_SCHEMA) }, { maxZoom: 13 })
		);
		const sources = await chooseProvider(page, 'protomaps');
		const archive = row(sources, 'Archive').locator('input');
		await archive.fill(other);
		await archive.dispatchEvent('change');
		await row(sources, 'Elevation').locator('select').selectOption({ label: 'Mapterhorn' });

		const elevation = section(page, 'Terrain & hillshade');
		await elevation.locator('summary').click();
		await row(elevation, 'Hillshade').locator('input[type="checkbox"]').check();
		await expect.poll(() => sourceNames(page)).toEqual(['elevation', 'protomaps']);
		const style = await getMapStyle(page);
		expect(style.sources.protomaps).toMatchObject({
			tiles: [`pmtiles://${other}/{z}/{x}/{y}.mvt`],
			maxzoom: 13,
		});
	});

	test('an archive that cannot be read leaves no style to pick', async ({ page }) => {
		await open(page);
		await page.route('https://archives.example.org/missing.pmtiles', (route) =>
			route.fulfill({ status: 404 })
		);
		const sources = await chooseProvider(page, 'protomaps');
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);
		const archive = row(sources, 'Archive').locator('input');
		await archive.fill('https://archives.example.org/missing.pmtiles');
		await archive.dispatchEvent('change');
		// Without vector tiles and without imagery there is no style left to pick.
		await expect(page.locator('.maplibregl-versatiles-styler button.theme-button')).toHaveCount(0);
	});
});
