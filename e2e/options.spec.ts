import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('font selects load and show options', async ({ page }) => {
	const optionsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Select Options"))'
	);
	await optionsDetails.locator('summary').click();

	const fontRegularSelect = optionsDetails.locator('select').first();
	await expect(fontRegularSelect).toBeAttached({ timeout: 10_000 });

	const options = fontRegularSelect.locator('option');
	expect(await options.count()).toBeGreaterThan(1);
});

test('language select loads with entries', async ({ page }) => {
	const optionsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Select Options"))'
	);
	await optionsDetails.locator('summary').click();

	const selects = optionsDetails.locator('select');
	await expect(selects).toHaveCount(3, { timeout: 10_000 });

	const languageSelect = selects.nth(2);
	const options = languageSelect.locator('option');
	expect(await options.count()).toBeGreaterThan(1);
});
