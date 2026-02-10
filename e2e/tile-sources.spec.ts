import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

function getStyleLabels(page: import('@playwright/test').Page) {
	return page.locator('.maplibregl-versatiles-styler .style-list label span').allTextContents();
}

test.describe('tile source discovery', () => {
	test('shows all styles when both osm and satellite are available', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) =>
			route.fulfill({ json: ['osm', 'satellite'] })
		);
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		const labels = await getStyleLabels(page);
		expect(labels).toEqual(['colorful', 'eclipse', 'graybeard', 'shadow', 'neutrino', 'satellite']);
	});

	test('shows only vector styles when satellite is missing', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) => route.fulfill({ json: ['osm'] }));
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		const labels = await getStyleLabels(page);
		expect(labels).toEqual(['colorful', 'eclipse', 'graybeard', 'shadow', 'neutrino']);
	});

	test('shows only satellite when osm is missing', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) => route.fulfill({ json: ['satellite'] }));
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		const labels = await getStyleLabels(page);
		expect(labels).toEqual(['satellite']);
	});

	test('falls back to all styles on fetch error', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) =>
			route.fulfill({ status: 500, body: 'Internal Server Error' })
		);
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		const labels = await getStyleLabels(page);
		expect(labels).toEqual(['colorful', 'eclipse', 'graybeard', 'shadow', 'neutrino', 'satellite']);
	});

	test('hides overlay checkbox when osm is missing', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) => route.fulfill({ json: ['satellite'] }));
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		// Satellite is the only style, open its options
		const satDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:text("Satellite options"))'
		);
		await expect(satDetails).toBeAttached();

		const overlayCheckbox = satDetails.locator('label:has-text("Overlay")');
		await expect(overlayCheckbox).not.toBeAttached();
	});

	test('shows overlay checkbox when both osm and satellite are available', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) =>
			route.fulfill({ json: ['osm', 'satellite'] })
		);
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		// Switch to satellite
		const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
		await styleList.locator('label:has(input[value="satellite"])').click();

		const satDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:text("Satellite options"))'
		);
		await expect(satDetails).toBeAttached();

		const overlayCheckbox = satDetails.locator('label:has-text("Overlay")');
		await expect(overlayCheckbox).toBeAttached();
	});

	test('extra sources beyond osm/satellite are ignored in style list', async ({ page }) => {
		await page.route('**/tiles/index.json', (route) =>
			route.fulfill({ json: ['osm', 'satellite', 'hillshade-vectors', 'terrain'] })
		);
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

		const labels = await getStyleLabels(page);
		expect(labels).toEqual(['colorful', 'eclipse', 'graybeard', 'shadow', 'neutrino', 'satellite']);
	});
});
