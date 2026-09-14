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

test('lists every theme with its dark variant next to it', async ({ page }) => {
	const radios = page.locator('.maplibregl-versatiles-styler .style-list input[type="radio"]');
	await expect(radios.last()).toHaveValue('satellite');
	const values = await radios.evaluateAll((inputs) =>
		inputs.map((input) => (input as HTMLInputElement).value)
	);
	expect(values).toEqual([
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
		'satellite',
	]);
});

test('clicking another style changes selection', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const colorfulRadio = styleList.locator('input[type="radio"][value="colorful"]');
	const mutedRadio = styleList.locator('input[type="radio"][value="muted"]');

	await expect(colorfulRadio).toBeChecked();
	await styleList.locator('label:has(input[value="muted"])').click();
	await expect(mutedRadio).toBeChecked();
	await expect(colorfulRadio).not.toBeChecked();
});

test('style change updates map style', async ({ page }) => {
	const styleBefore = await getMapStyle(page);
	expect(styleBefore.name).toBe('versatiles-colorful');

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="toner-dark"])').click();

	await expect.poll(async () => (await getMapStyle(page)).name).toBe('versatiles-toner-dark');
	const styleAfter = await getMapStyle(page);

	// All themes share their layers; the paint differs.
	const paint = (style: typeof styleBefore) => style.layers.map((l) => JSON.stringify(l.paint));
	expect(paint(styleAfter)).not.toEqual(paint(styleBefore));
});

test('style change updates color inputs', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const firstColorInput = colorsDetails.locator('input[type="color"]').first();
	const colorfulValue = await firstColorInput.inputValue();

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="colorful-dark"])').click();

	await expect(firstColorInput).not.toHaveValue(colorfulValue);
});

test('individual colors are grouped', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const groups = await colorsDetails.locator('.subsection-title').allTextContents();
	expect(groups).toEqual(expect.arrayContaining(['Base', 'Nature', 'Road', 'Label']));
});
