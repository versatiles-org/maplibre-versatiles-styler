import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

function colorsSection(page: import('@playwright/test').Page) {
	return page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
}

/** A color row by its option key, which each row carries as its hint. */
function colorRow(page: import('@playwright/test').Page, key: string) {
	return page.locator('.maplibregl-versatiles-styler .color-container', {
		has: page.locator(`label[title="${key}"]`),
	});
}

async function hashConfig(page: import('@playwright/test').Page): Promise<unknown> {
	const match = page.url().match(/config=([^&]+)/);
	if (!match) return {};
	return JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')));
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('color inputs render with values and reset buttons disabled', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const colorInputs = colorsDetails.locator('input.color-text');
	const count = await colorInputs.count();
	expect(count).toBeGreaterThan(0);

	const resetButtons = colorsDetails.locator('.color-container button.reset');
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
	const colorInput = firstEntry.locator('input.color-text');
	const resetButton = firstEntry.locator('button.reset');

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
	const colorInput = firstEntry.locator('input.color-text');
	const resetButton = firstEntry.locator('button.reset');

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

test('"Color adjustments" has 1 checkbox, 7 ranges, and 2 color fields', async ({ page }) => {
	const recolorDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
	);
	await recolorDetails.locator('summary').click();

	const checkboxes = recolorDetails.locator('input[type="checkbox"]');
	await expect(checkboxes).toHaveCount(1);

	const ranges = recolorDetails.locator('input[type="range"]');
	await expect(ranges).toHaveCount(7);

	const colorPickers = recolorDetails.locator('input.color-text');
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

test.describe('gamma and contrast sliders', () => {
	function recolorRow(page: import('@playwright/test').Page, label: string) {
		return page
			.locator('.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))')
			.locator('.entry', { has: page.locator(`label:text-is("${label}")`) });
	}

	async function hashConfig(page: import('@playwright/test').Page): Promise<unknown> {
		const match = page.url().match(/config=([^&]+)/);
		if (!match) return {};
		return JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')));
	}

	test.beforeEach(async ({ page }) => {
		await page
			.locator(
				'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments")) summary'
			)
			.click();
	});

	test('gamma starts at 1 in the middle and moves in steps of 0.01', async ({ page }) => {
		const gamma = recolorRow(page, 'Gamma');
		const range = gamma.locator('input[type="range"]');
		const max = Number(await range.getAttribute('max'));
		await expect(range).toHaveValue(String(max / 2));
		await expect(gamma.locator('.value')).toHaveText('1');

		await range.focus();
		await page.keyboard.press('ArrowRight');
		await expect(gamma.locator('.value')).toHaveText('1.01');
		await expect.poll(() => hashConfig(page)).toEqual({ recolor: { gamma: 1.01 } });

		await page.keyboard.press('ArrowLeft');
		await page.keyboard.press('ArrowLeft');
		await expect(gamma.locator('.value')).toHaveText('0.99');

		await gamma.locator('button.reset').click();
		await expect(gamma.locator('.value')).toHaveText('1');
		await expect.poll(() => hashConfig(page)).toEqual({});
	});

	test('gamma and contrast reach 0.1 and 10', async ({ page }) => {
		for (const [label, low, high] of [
			['Gamma', '0.1', '10'],
			['Contrast', '10%', '1000%'],
		]) {
			const row = recolorRow(page, label);
			const range = row.locator('input[type="range"]');
			await range.fill('0');
			await range.dispatchEvent('change');
			await expect(row.locator('.value')).toHaveText(low);
			await range.fill(String(await range.getAttribute('max')));
			await range.dispatchEvent('change');
			await expect(row.locator('.value')).toHaveText(high);
		}
		await expect.poll(() => hashConfig(page)).toEqual({ recolor: { gamma: 10, contrast: 10 } });
	});
});

test.describe('color field', () => {
	test.beforeEach(async ({ page }) => {
		await colorsSection(page).locator('summary').click();
	});

	test('takes a color with alpha, and shows it over a checkerboard', async ({ page }) => {
		const water = colorRow(page, 'water');
		const field = water.locator('input.color-text');
		await expect(field).toHaveValue('#BFD9F2');

		await field.fill('rgba(255, 0, 0, 0.5)');
		await field.press('Enter');
		await expect(field).toHaveValue('#FF000080');
		await expect.poll(() => hashConfig(page)).toEqual({ colors: { water: '#FF000080' } });

		const swatch = water.locator('.color-swatch');
		const background = await swatch.evaluate((el) => getComputedStyle(el).backgroundImage);
		expect(background).toContain('conic-gradient');
		await expect(swatch).toHaveCSS('--swatch', '#FF000080');
		await expect(swatch).toHaveCSS('--swatch-opaque', '#FF0000');
	});

	test('takes hsl() and short hex, and normalizes them', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		await field.fill('hsl(120, 50%, 50%)');
		await field.press('Enter');
		await expect(field).toHaveValue('#40BF40');
		await field.fill('#abc');
		await field.blur();
		await expect(field).toHaveValue('#AABBCC');
		await expect.poll(() => hashConfig(page)).toEqual({ colors: { water: '#AABBCC' } });
	});

	test('rejects text that is no color, and Escape restores the value', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		await field.fill('banana');
		await field.press('Enter');
		await expect(field).toHaveValue('#BFD9F2');
		await expect(field).toHaveAttribute('aria-invalid', 'true');
		await field.pressSequentially('#1');
		await expect(field).toHaveAttribute('aria-invalid', 'false');

		await field.fill('#123456');
		await field.press('Escape');
		await expect(field).toHaveValue('#BFD9F2');
		await expect.poll(() => hashConfig(page)).toEqual({});
	});

	test('colors of options without alpha drop it', async ({ page }) => {
		const recolor = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
		);
		await recolor.locator('summary').click();
		const tint = recolor
			.locator('.entry', { has: page.locator('label:text-is("Tint Color")') })
			.locator('input.color-text');
		await tint.fill('#00ff0080');
		await tint.press('Enter');
		await expect(tint).toHaveValue('#00FF00');
	});
});

test.describe('color picker', () => {
	type Page = import('@playwright/test').Page;

	async function openPicker(page: Page, key: string, title: string) {
		await colorRow(page, key).locator('button.color-swatch').click();
		const dialog = page.getByRole('dialog', { name: `Color for ${title}` });
		await expect(dialog).toBeVisible();
		return dialog;
	}

	/** The paint of the water layers, to see the map change. */
	async function waterPaint(page: Page): Promise<string> {
		const style = await getMapStyle(page);
		return JSON.stringify(style.layers.filter((l) => l.id.startsWith('water')).map((l) => l.paint));
	}

	async function areaPoint(dialog: import('@playwright/test').Locator, x: number, y: number) {
		const box = (await dialog.locator('.color-area').boundingBox())!;
		return { x: box.x + box.width * x, y: box.y + box.height * y };
	}

	test.beforeEach(async ({ page }) => {
		await colorsSection(page).locator('summary').click();
	});

	test('dragging in the area updates the map before the pointer is released', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		const before = await waterPaint(page);
		const dialog = await openPicker(page, 'water', 'Water');

		const start = await areaPoint(dialog, 0.2, 0.2);
		const end = await areaPoint(dialog, 0.9, 0.4);
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(end.x, end.y, { steps: 10 });

		// still dragging
		await expect.poll(() => waterPaint(page)).not.toBe(before);
		const dragged = await field.inputValue();
		expect(dragged).not.toBe('#BFD9F2');

		await page.mouse.up();
		await expect.poll(() => hashConfig(page)).toEqual({ colors: { water: dragged } });
	});

	test('hue and alpha sliders; no alpha slider for colors without alpha', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		const dialog = await openPicker(page, 'water', 'Water');
		await dialog.getByRole('slider', { name: 'Hue' }).fill('0');
		await expect(field).toHaveValue(/^#F2/);
		await dialog.getByRole('slider', { name: 'Alpha' }).fill('50');
		await expect(field).toHaveValue(/80$/);
		await expect(dialog.locator('.color-picker-slider output').last()).toHaveText('50 %');
		await dialog.getByRole('button', { name: 'Close' }).click();

		const recolor = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
		);
		await recolor.locator('summary').click();
		await recolor
			.locator('.entry', { has: page.locator('label:text-is("Tint Color")') })
			.locator('button.color-swatch')
			.click();
		const tint = page.getByRole('dialog', { name: 'Color for Tint Color' });
		await expect(tint.getByRole('slider', { name: 'Hue' })).toBeVisible();
		await expect(tint.getByRole('slider', { name: 'Alpha' })).toHaveCount(0);
	});

	test('Escape restores the old color on the map and in the hash', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		const before = await waterPaint(page);
		const dialog = await openPicker(page, 'water', 'Water');
		const point = await areaPoint(dialog, 0.9, 0.1);
		await page.mouse.click(point.x, point.y);
		await expect(field).not.toHaveValue('#BFD9F2');
		await expect.poll(() => waterPaint(page)).not.toBe(before);

		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(field).toHaveValue('#BFD9F2');
		await expect.poll(() => waterPaint(page)).toBe(before);
		await expect.poll(() => hashConfig(page)).toEqual({});
		await expect(colorRow(page, 'water').locator('button.color-swatch')).toBeFocused();
	});

	test('the old swatch reverts; Close keeps the new color', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		const dialog = await openPicker(page, 'water', 'Water');
		let point = await areaPoint(dialog, 0.9, 0.1);
		await page.mouse.click(point.x, point.y);
		await expect(field).not.toHaveValue('#BFD9F2');

		await dialog.getByRole('button', { name: 'Back to the old color, #BFD9F2' }).click();
		await expect(field).toHaveValue('#BFD9F2');

		point = await areaPoint(dialog, 0.5, 0.5);
		await page.mouse.click(point.x, point.y);
		const chosen = await field.inputValue();
		expect(chosen).not.toBe('#BFD9F2');
		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).toHaveCount(0);
		await expect.poll(() => hashConfig(page)).toEqual({ colors: { water: chosen } });
	});

	test('the area works with the keyboard; Enter keeps the color', async ({ page }) => {
		const field = colorRow(page, 'water').locator('input.color-text');
		const dialog = await openPicker(page, 'water', 'Water');
		const area = dialog.getByRole('slider', { name: 'Saturation and brightness' });
		await expect(area).toBeFocused();
		const before = await area.getAttribute('aria-valuetext');

		await page.keyboard.press('Shift+ArrowRight');
		await page.keyboard.press('ArrowDown');
		await expect(area).not.toHaveAttribute('aria-valuetext', before!);
		await expect(field).not.toHaveValue('#BFD9F2');
		const chosen = await field.inputValue();

		await page.keyboard.press('Enter');
		await expect(dialog).toHaveCount(0);
		await expect.poll(() => hashConfig(page)).toEqual({ colors: { water: chosen } });
	});
});
