import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('"colorful" is selected by default', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const colorfulRadio = styleList.locator('input[type="radio"][value="colorful"]');
	await expect(colorfulRadio).toBeChecked();
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
