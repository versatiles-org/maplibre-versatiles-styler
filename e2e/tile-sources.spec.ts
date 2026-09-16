import { test, expect, type Page } from '@playwright/test';

type SourceName = 'osm' | 'satellite' | 'elevation';

/** Makes the given sources unavailable: their TileJSON answers 404. */
async function withoutSources(page: Page, ...names: SourceName[]) {
	for (const name of names) {
		await page.route(`**/tiles/${name}/tiles.json`, (route) =>
			route.fulfill({ status: 404, body: 'Not Found' })
		);
	}
}

async function open(page: Page) {
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
}

function styleValues(page: Page) {
	return page
		.locator('.maplibregl-versatiles-styler .style-list input[type="radio"]')
		.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
}

const THEMES = [
	'colorful',
	'colorful-dark',
	'natural',
	'natural-dark',
	'muted',
	'muted-dark',
	'gray',
	'gray-dark',
	'toner',
	'toner-dark',
];

test.describe('tile source discovery', () => {
	test('shows all styles when osm and satellite are available', async ({ page }) => {
		await open(page);
		await expect.poll(() => styleValues(page)).toEqual([...THEMES, 'satellite']);
	});

	test('shows only the themes when satellite is missing', async ({ page }) => {
		await withoutSources(page, 'satellite');
		await open(page);
		await expect.poll(() => styleValues(page)).toEqual(THEMES);
	});

	test('shows only satellite when osm is missing', async ({ page }) => {
		await withoutSources(page, 'osm');
		await open(page);
		await expect.poll(() => styleValues(page)).toEqual(['satellite']);
		await expect(
			page.locator('.maplibregl-versatiles-styler input[type="radio"][value="satellite"]')
		).toBeChecked();
	});

	test('treats a network failure like a missing source', async ({ page }) => {
		await page.route('**/tiles/satellite/tiles.json', (route) => route.abort('failed'));
		await open(page);
		await expect.poll(() => styleValues(page)).toEqual(THEMES);
	});

	test('does not ask for /tiles/index.json', async ({ page }) => {
		const requested: string[] = [];
		page.on('request', (request) => requested.push(request.url()));
		await open(page);
		await expect.poll(() => styleValues(page)).toContain('satellite');
		expect(requested.filter((url) => url.includes('/tiles/index.json'))).toEqual([]);
	});

	test('shows overlay disabled when osm is missing', async ({ page }) => {
		await withoutSources(page, 'osm');
		await open(page);

		const overlayDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary .section-title:text-is("Overlay"))'
		);
		await expect(overlayDetails).toBeAttached();
		const overlayCheckbox = overlayDetails.locator('input[type="checkbox"]');
		await expect(overlayCheckbox).toBeDisabled();
	});

	test('shows overlay enabled when osm and satellite are available', async ({ page }) => {
		await open(page);

		const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
		await styleList.locator('label:has(input[value="satellite"])').click();

		const overlayDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary .section-title:text-is("Overlay"))'
		);
		const overlayCheckbox = overlayDetails.locator('input[type="checkbox"]');
		await expect(overlayCheckbox).toBeEnabled();
		await expect(overlayCheckbox).toBeChecked();
	});

	test('disables terrain and hillshade when elevation is missing', async ({ page }) => {
		await withoutSources(page, 'elevation');
		await open(page);

		const elevationDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:has-text("Terrain & hillshade"))'
		);
		await expect(elevationDetails.locator('.section-description')).toContainText('Unavailable');
		const checkboxes = elevationDetails.locator('input[type="checkbox"]');
		await expect(checkboxes).toHaveCount(2);
		for (const checkbox of await checkboxes.all()) await expect(checkbox).toBeDisabled();
	});
});
