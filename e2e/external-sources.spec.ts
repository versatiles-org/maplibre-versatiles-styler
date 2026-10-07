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

/** The row of a source that is not typed, which says what was found of it. */
function found(scope: Locator, name: string): Locator {
	return scope.locator('.entry.source-found', { hasText: name });
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

	test('going back to a provider restores what was set for it', async ({ page }) => {
		await open(page);
		let sources = await chooseProvider(page, 'openfreemap');
		await row(sources, 'Elevation').locator('select').selectOption({ label: 'Mapterhorn' });
		await chooseProvider(page, 'versatiles');
		sources = await chooseProvider(page, 'openfreemap');
		await expect(row(sources, 'Elevation').locator('select')).toHaveValue(
			`${MAPTERHORN}/tilejson.json`
		);
	});
});

test.describe('the state of the tile sources', () => {
	test('a VersaTiles server shows what it provides', async ({ page }) => {
		await page.route('**/tiles/satellite/tiles.json', (route) => route.fulfill({ status: 404 }));
		await open(page);
		const sources = section(page, 'Tile sources');
		await sources.locator('summary').click();
		await expect(found(sources, 'Vector tiles')).toContainText(
			/Shortbread · zoom 0–14 · \d+ languages/
		);
		await expect(found(sources, 'Elevation')).toContainText('zoom 0–12');
		await expect(found(sources, 'Satellite')).toContainText('Not on this server');
	});

	test('OpenFreeMap shows the schema of its tiles', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'openfreemap');
		await expect(found(sources, 'Vector tiles')).toContainText('OpenMapTiles · zoom 0–14');
	});

	test('an archive that cannot be read says so', async ({ page }) => {
		await open(page);
		await page.route('https://archives.example.org/missing.pmtiles', (route) =>
			route.fulfill({ status: 404 })
		);
		const sources = await chooseProvider(page, 'protomaps');
		const archive = row(sources, 'Archive');
		await expect(archive).toContainText('Protomaps · zoom 0–15');
		await archive.locator('input').fill('https://archives.example.org/missing.pmtiles');
		await archive.locator('input').dispatchEvent('change');
		await expect(archive.locator('.source-status.error')).toHaveText(
			'No vector tiles could be loaded from this address.'
		);
	});
});

test.describe('custom tile sources', () => {
	const CUSTOM = 'https://custom.example.org';

	/** Types an address into a row of the custom sources. */
	async function setAddress(sources: Locator, label: string, address: string) {
		const input = row(sources, label).locator('input');
		await input.fill(address);
		await input.dispatchEvent('change');
	}

	async function mockTileJSON(page: Page, name: string, extra: object = {}) {
		await page.route(`${CUSTOM}/${name}.json`, (route) =>
			route.fulfill({
				json: {
					tilejson: '3.0.0',
					tiles: [`${CUSTOM}/${name}/{z}/{x}/{y}`],
					minzoom: 0,
					maxzoom: 10,
					...extra,
				},
			})
		);
	}

	test.beforeEach(async ({ page }) => {
		await page.route(`${CUSTOM}/**`, (route) => route.fulfill({ status: 204 }));
		await mockTileJSON(page, 'omt', { vector_layers: vectorLayers(OMT_SCHEMA) });
		await mockTileJSON(page, 'parcels', {
			vector_layers: [{ id: 'parcels', fields: { owner: 'String' } }],
		});
		await mockTileJSON(page, 'imagery');
		await mockArchive(
			page,
			`${CUSTOM}/extract.pmtiles`,
			pmtilesArchive({ vector_layers: vectorLayers(PROTOMAPS_SCHEMA) }, { maxZoom: 9 })
		);
	});

	test('start as the sources in use, and take any address', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'custom');
		await expect(sources.locator('summary')).toContainText('Custom');
		await expect(row(sources, 'Vector tiles').locator('input')).toHaveValue(
			'https://tiles.versatiles.org/tiles/osm/tiles.json'
		);
		await expect(row(sources, 'Vector tiles')).toContainText('Shortbread');

		await setAddress(sources, 'Vector tiles', `${CUSTOM}/omt.json`);
		await expect(row(sources, 'Vector tiles')).toContainText('OpenMapTiles · zoom 0–10');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		// The imagery of the server is still there, and with it the satellite style.
		const picker = await openThemePicker(page);
		await expect(picker.locator('input[value="satellite"]')).toHaveCount(1);
	});

	test('a source is removed by emptying its address', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'custom');
		await setAddress(sources, 'Satellite', '');
		await expect(row(sources, 'Satellite').locator('.source-status')).toHaveCount(0);
		const picker = await openThemePicker(page);
		await expect(picker.locator('input[value="colorful"]')).toHaveCount(1);
		await expect(picker.locator('input[value="satellite"]')).toHaveCount(0);
	});

	test('a PMTiles archive is told by its name', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'custom');
		await setAddress(sources, 'Vector tiles', `${CUSTOM}/extract.pmtiles`);
		await expect(row(sources, 'Vector tiles')).toContainText('Protomaps · zoom 0–9');
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);
		const style = await getMapStyle(page);
		expect(style.sources.protomaps).toMatchObject({
			tiles: [`pmtiles://${CUSTOM}/extract.pmtiles/{z}/{x}/{y}.mvt`],
		});
	});

	test('tiles of the wrong kind are refused', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'custom');
		await setAddress(sources, 'Vector tiles', `${CUSTOM}/imagery.json`);
		await expect(row(sources, 'Vector tiles').locator('.source-status.error')).toHaveText(
			'No vector tiles could be loaded from this address.'
		);
		await setAddress(sources, 'Satellite', `${CUSTOM}/omt.json`);
		await expect(row(sources, 'Satellite').locator('.source-status.error')).toHaveText(
			'No image tiles could be loaded from this address.'
		);
	});

	test('the schema of tiles that do not tell it can be chosen', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'custom');
		await expect(row(sources, 'Schema')).toHaveCount(0);

		await setAddress(sources, 'Vector tiles', `${CUSTOM}/parcels.json`);
		await expect(row(sources, 'Vector tiles')).toContainText('Unknown schema');
		// Taken for Shortbread until someone says otherwise.
		await expect.poll(() => sourceNames(page)).toContain('versatiles-shortbread');

		await row(sources, 'Schema').locator('select').selectOption('protomaps');
		await expect(row(sources, 'Vector tiles')).toContainText('Protomaps · zoom 0–10');
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);

		// Other tiles have a schema of their own.
		await setAddress(sources, 'Vector tiles', `${CUSTOM}/omt.json`);
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		await expect(row(sources, 'Schema')).toHaveCount(0);
	});

	test('fonts and icons come from the server named for them', async ({ page }) => {
		await open(page);
		const sources = await chooseProvider(page, 'custom');
		await setAddress(sources, 'Fonts & icons', CUSTOM);
		await expect
			.poll(async () => (await getMapStyle(page)).glyphs)
			.toBe(`${CUSTOM}/assets/glyphs/{fontstack}/{range}.pbf`);
	});
});

test.describe('the tile sources travel with the style', () => {
	/** The sources the hash names, decoded. */
	async function hashSources(page: Page): Promise<unknown> {
		const match = /sources=([^&]+)/.exec(new URL(page.url()).hash);
		if (!match) return undefined;
		return JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')));
	}

	test('a link names them, and opens with them', async ({ page }) => {
		await open(page);
		expect(await hashSources(page)).toBeUndefined();
		const sources = await chooseProvider(page, 'openfreemap');
		await row(sources, 'Elevation').locator('select').selectOption({ label: 'Mapterhorn' });
		await expect
			.poll(() => hashSources(page))
			.toEqual({
				provider: 'openfreemap',
				vector: `${OPENFREEMAP}/planet`,
				elevation: `${MAPTERHORN}/tilejson.json`,
				assets: 'https://tiles.versatiles.org',
			});

		await page.reload();
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		const reopened = section(page, 'Tile sources');
		await expect(reopened.locator('summary')).toContainText('OpenFreeMap');
		await reopened.locator('summary').click();
		await expect(row(reopened, 'Provider').locator('select')).toHaveValue('openfreemap');
		await expect(row(reopened, 'Elevation').locator('select')).toHaveValue(
			`${MAPTERHORN}/tilejson.json`
		);
	});

	test('the page\u2019s own server is left out of the link again', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'openfreemap');
		await expect.poll(() => hashSources(page)).toBeDefined();
		await chooseProvider(page, 'versatiles');
		await expect.poll(() => hashSources(page)).toBeUndefined();
	});

	test('a styler that offers no other sources does not take them from a link', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'openfreemap');
		await expect.poll(() => hashSources(page)).toBeDefined();
		const link = new URL(page.url());
		link.searchParams.set('external', '0');

		await page.goto(link.href);
		await page.reload();
		await expect.poll(() => sourceNames(page)).toContain('versatiles-shortbread');
		await expect.poll(() => hashSources(page)).toBeUndefined();
	});

	test('an exported style brings its sources back when it is imported', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'openfreemap');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);

		await page.getByRole('button', { name: 'Export' }).click();
		const exportDialog = page.getByRole('dialog', { name: 'Export style' });
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			exportDialog.getByRole('button', { name: 'Download' }).click(),
		]);
		const stream = await download.createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream) chunks.push(chunk as Buffer);
		const json = Buffer.concat(chunks).toString('utf8');
		expect(JSON.parse(json).metadata['versatiles:sources']).toMatchObject({
			provider: 'openfreemap',
		});
		await exportDialog.getByRole('button', { name: 'Close' }).first().click();

		await chooseProvider(page, 'versatiles');
		await expect.poll(() => sourceNames(page)).toContain('versatiles-shortbread');

		await page.locator('.styler-toolbar').getByRole('button', { name: 'Import…' }).click();
		const importDialog = page.getByRole('dialog', { name: 'Import style' });
		// A whole style is a lot to type: it is put in at once, as a paste is.
		await importDialog.getByRole('textbox').evaluate((element, value) => {
			(element as HTMLTextAreaElement).value = value;
			element.dispatchEvent(new Event('input', { bubbles: true }));
		}, json);
		await importDialog.getByRole('button', { name: 'Check' }).click();
		await expect(importDialog.locator('.import-origin')).toContainText(
			`Also switch the tile sources to ${OPENFREEMAP}/planet`
		);
		await importDialog.getByRole('button', { name: 'Apply to the map' }).click();
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		await expect(section(page, 'Tile sources').locator('summary')).toContainText('OpenFreeMap');
	});

	test('the code for a PMTiles archive says what MapLibre needs to read it', async ({ page }) => {
		await open(page);
		await chooseProvider(page, 'protomaps');
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);

		await page.getByRole('button', { name: 'Export' }).click();
		const dialog = page.getByRole('dialog', { name: 'Export style' });
		await expect(dialog).toContainText('register the pmtiles protocol');
		await dialog.getByRole('tab', { name: 'Code' }).click();
		await expect(dialog).toContainText("maplibregl.addProtocol('pmtiles', new Protocol().tile);");
		await expect(dialog).toContainText(`protomaps: "pmtiles://${PROTOMAPS}"`);
		await expect(dialog).not.toContainText('inlineSources');
	});
});

test.describe('a server with a tileset under another name', () => {
	const TILESET = 'https://tiles.versatiles.org/tiles/planet/tiles.json';

	test.beforeEach(async ({ page }) => {
		await page.route('https://tiles.versatiles.org/tiles/planet/**', (route) =>
			route.fulfill({ status: 204 })
		);
		await page.route(TILESET, (route) =>
			route.fulfill({
				json: {
					tilejson: '3.0.0',
					tiles: ['/tiles/planet/{z}/{x}/{y}'],
					minzoom: 0,
					maxzoom: 14,
					vector_layers: vectorLayers(OMT_SCHEMA),
				},
			})
		);
	});

	test('is styled for the schema its tiles have, without offering other sources', async ({
		page,
	}) => {
		await open(page, '/?external=0&vector=/tiles/planet/tiles.json#panel=open');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		const style = await getMapStyle(page);
		expect(style.sources.openmaptiles).toMatchObject({
			tiles: ['https://tiles.versatiles.org/tiles/planet/{z}/{x}/{y}'],
		});

		const server = section(page, 'Tile server');
		await server.locator('summary').click();
		await expect(found(server, 'Vector tiles')).toContainText('OpenMapTiles · zoom 0–14');
		await expect(found(server, 'Satellite')).toContainText('zoom');
		await expect(row(server, 'Provider')).toHaveCount(0);
	});

	test('keeps its tileset when the styler comes back to it from another provider', async ({
		page,
	}) => {
		await open(page, '/?vector=/tiles/planet/tiles.json#panel=open');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		await chooseProvider(page, 'protomaps');
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);
		// The hash is written a moment after the change.
		await expect.poll(() => page.url()).toContain('sources=');
		await page.reload();
		await expect.poll(() => sourceNames(page)).toEqual(['protomaps']);

		const sources = await chooseProvider(page, 'versatiles');
		await expect.poll(() => sourceNames(page)).toEqual(['openmaptiles']);
		await expect(found(sources, 'Vector tiles')).toContainText('OpenMapTiles');
	});
});
