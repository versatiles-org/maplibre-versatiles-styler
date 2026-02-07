import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('color inputs render with values and reset buttons disabled', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Edit individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const colorInputs = colorsDetails.locator('input[type="color"]');
	const count = await colorInputs.count();
	expect(count).toBeGreaterThan(0);

	const resetButtons = colorsDetails.locator('.color-container button');
	for (let i = 0; i < (await resetButtons.count()); i++) {
		await expect(resetButtons.nth(i)).toBeDisabled();
	}
});

test('modifying a color enables reset button', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Edit individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const firstEntry = colorsDetails.locator('.color-container').first();
	const colorInput = firstEntry.locator('input[type="color"]');
	const resetButton = firstEntry.locator('button');

	await expect(resetButton).toBeDisabled();

	await colorInput.fill('#ff0000');
	await colorInput.dispatchEvent('change');

	await expect(resetButton).toBeEnabled();
});

test('reset restores default and disables button', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Edit individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const firstEntry = colorsDetails.locator('.color-container').first();
	const colorInput = firstEntry.locator('input[type="color"]');
	const resetButton = firstEntry.locator('button');

	const originalValue = await colorInput.inputValue();

	await colorInput.fill('#ff0000');
	await colorInput.dispatchEvent('change');
	await expect(resetButton).toBeEnabled();

	await resetButton.click();
	await expect(resetButton).toBeDisabled();
	await expect(colorInput).toHaveValue(originalValue);
});

test('"Modify all colors" has 1 checkbox, 7 ranges, and 2 color pickers', async ({ page }) => {
	const recolorDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Modify all colors"))'
	);
	await recolorDetails.locator('summary').click();

	const checkboxes = recolorDetails.locator('input[type="checkbox"]');
	await expect(checkboxes).toHaveCount(1);

	const ranges = recolorDetails.locator('input[type="range"]');
	await expect(ranges).toHaveCount(7);

	const colorPickers = recolorDetails.locator('input[type="color"]');
	await expect(colorPickers).toHaveCount(2);
});
