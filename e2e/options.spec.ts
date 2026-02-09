import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('font selects load and show options', async ({ page }) => {
	const optionsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Other options"))'
	);
	await optionsDetails.locator('summary').click();

	const fontRegularSelect = optionsDetails.locator('select').first();
	await expect(fontRegularSelect).toBeAttached({ timeout: 10_000 });

	const options = fontRegularSelect.locator('option');
	expect(await options.count()).toBeGreaterThan(1);
});

test('changing font updates map style text-font', async ({ page }) => {
	const optionsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Other options"))'
	);
	await optionsDetails.locator('summary').click();

	const fontRegularSelect = optionsDetails.locator('select').first();
	await expect(fontRegularSelect).toBeAttached({ timeout: 10_000 });

	const styleBefore = await getMapStyle(page);

	// Pick a different font (second option)
	const secondOption = await fontRegularSelect.locator('option').nth(1).getAttribute('value');
	await fontRegularSelect.selectOption(secondOption!);
	await fontRegularSelect.dispatchEvent('change');

	const styleAfter = await getMapStyle(page);

	// Find symbol layers that have text-font in layout
	const symbolLayersBefore = styleBefore.layers.filter(
		(l) => l.type === 'symbol' && l.layout?.['text-font']
	);
	const symbolLayersAfter = styleAfter.layers.filter(
		(l) => l.type === 'symbol' && l.layout?.['text-font']
	);

	expect(symbolLayersBefore.length).toBeGreaterThan(0);
	expect(symbolLayersAfter.length).toBeGreaterThan(0);

	// At least one symbol layer should have a different text-font
	const fontChanged = symbolLayersAfter.some((layerAfter) => {
		const layerBefore = symbolLayersBefore.find((l) => l.id === layerAfter.id);
		if (!layerBefore) return true;
		return (
			JSON.stringify(layerAfter.layout?.['text-font']) !==
			JSON.stringify(layerBefore.layout?.['text-font'])
		);
	});
	expect(fontChanged).toBe(true);
});

test('language select loads with entries', async ({ page }) => {
	const optionsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Other options"))'
	);
	await optionsDetails.locator('summary').click();

	const selects = optionsDetails.locator('select');
	await expect(selects).toHaveCount(3, { timeout: 10_000 });

	const languageSelect = selects.nth(2);
	const options = languageSelect.locator('option');
	expect(await options.count()).toBeGreaterThan(1);
});
