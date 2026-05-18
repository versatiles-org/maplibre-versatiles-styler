import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('color inputs render with values and reset buttons disabled', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
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

test('modifying a color updates the map style', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const styleBefore = await getMapStyle(page);

	const firstEntry = colorsDetails.locator('.color-container').first();
	const colorInput = firstEntry.locator('input[type="color"]');
	const resetButton = firstEntry.locator('button');

	await expect(resetButton).toBeDisabled();

	await colorInput.fill('#ff0000');
	await colorInput.dispatchEvent('change');

	await expect(resetButton).toBeEnabled();

	const styleAfter = await getMapStyle(page);

	// At least one layer's paint properties should differ
	const changedLayers = styleAfter.layers.filter((layerAfter) => {
		const layerBefore = styleBefore.layers.find((l) => l.id === layerAfter.id);
		if (!layerBefore) return true;
		return JSON.stringify(layerAfter.paint) !== JSON.stringify(layerBefore.paint);
	});
	expect(changedLayers.length).toBeGreaterThan(0);
});

test('reset restores default map style', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const styleBefore = await getMapStyle(page);

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

	const styleAfterReset = await getMapStyle(page);

	// Style should match the original after reset
	const layerPaintsBefore = styleBefore.layers.map((l) => JSON.stringify(l.paint));
	const layerPaintsAfterReset = styleAfterReset.layers.map((l) => JSON.stringify(l.paint));
	expect(layerPaintsAfterReset).toEqual(layerPaintsBefore);
});

test('"Color adjustments" has 1 checkbox, 7 ranges, and 2 color pickers', async ({ page }) => {
	const recolorDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
	);
	await recolorDetails.locator('summary').click();

	const checkboxes = recolorDetails.locator('input[type="checkbox"]');
	await expect(checkboxes).toHaveCount(1);

	const ranges = recolorDetails.locator('input[type="range"]');
	await expect(ranges).toHaveCount(7);

	const colorPickers = recolorDetails.locator('input[type="color"]');
	await expect(colorPickers).toHaveCount(2);
});

test('recolor slider changes map style', async ({ page }) => {
	const recolorDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
	);
	await recolorDetails.locator('summary').click();

	const styleBefore = await getMapStyle(page);

	// Change "Rotate Hue" slider (first range input)
	const hueSlider = recolorDetails.locator('input[type="range"]').first();
	await hueSlider.fill('180');
	await hueSlider.dispatchEvent('change');

	const styleAfter = await getMapStyle(page);

	// Many layers should have different paint colors after hue rotation
	const changedLayers = styleAfter.layers.filter((layerAfter) => {
		const layerBefore = styleBefore.layers.find((l) => l.id === layerAfter.id);
		if (!layerBefore) return true;
		return JSON.stringify(layerAfter.paint) !== JSON.stringify(layerBefore.paint);
	});
	expect(changedLayers.length).toBeGreaterThan(5);
});

interface MapLike {
	once(type: string, listener: () => void): void;
}
type StylerWindow = Window & { _map?: MapLike };

test('changing Rotate Hue repaints the map canvas', async ({ page }) => {
	const waitForMapIdle = () =>
		page.evaluate(
			() =>
				new Promise<void>((resolve) => {
					const map = (window as StylerWindow)._map;
					if (!map) return resolve();
					map.once('idle', () => resolve());
					setTimeout(resolve, 6000);
				})
		);

	// Open "Color adjustments" up front so the panel size is identical for
	// both screenshots.
	const recolorDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
	);
	await recolorDetails.locator('summary').click();

	// Let the map fully load and settle.
	await waitForMapIdle();

	// Screenshot a map region clear of the top-left panel and top-right controls.
	const clip = { x: 520, y: 400, width: 360, height: 220 };
	const before = await page.screenshot({ clip });

	// Change "Rotate Hue".
	const hueSlider = recolorDetails.locator('input[type="range"]').first();
	await hueSlider.fill('180');
	await hueSlider.dispatchEvent('change');

	await waitForMapIdle();
	const after = await page.screenshot({ clip });

	// The visible map must actually repaint.
	expect(Buffer.compare(before, after)).not.toBe(0);
});
