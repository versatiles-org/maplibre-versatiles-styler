import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('"colorful" is selected by default', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const colorfulRadio = styleList.locator('input[type="radio"][value="colorful"]');
	await expect(colorfulRadio).toBeChecked();

	const style = await getMapStyle(page);
	expect(style.name).toBe('versatiles-colorful');
});

test('clicking another style changes selection', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const colorfulRadio = styleList.locator('input[type="radio"][value="colorful"]');
	const neutrinoLabel = styleList.locator('label:has(input[value="neutrino"])');
	const neutrinoRadio = styleList.locator('input[type="radio"][value="neutrino"]');

	await expect(colorfulRadio).toBeChecked();
	await neutrinoLabel.click();
	await expect(neutrinoRadio).toBeChecked();
	await expect(colorfulRadio).not.toBeChecked();
});

test('style change updates map style', async ({ page }) => {
	const styleBefore = await getMapStyle(page);
	expect(styleBefore.name).toBe('versatiles-colorful');

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="neutrino"])').click();

	const styleAfter = await getMapStyle(page);
	expect(styleAfter.name).toBe('versatiles-neutrino');

	// Layer IDs should differ between styles
	const layerIdsBefore = styleBefore.layers.map((l) => l.id);
	const layerIdsAfter = styleAfter.layers.map((l) => l.id);
	expect(layerIdsBefore).not.toEqual(layerIdsAfter);
});

test('style change updates color inputs', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Edit individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const firstColorInput = colorsDetails.locator('input[type="color"]').first();
	const colorfulValue = await firstColorInput.inputValue();

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="neutrino"])').click();

	const neutrinoValue = await firstColorInput.inputValue();
	expect(colorfulValue).not.toEqual(neutrinoValue);
});
