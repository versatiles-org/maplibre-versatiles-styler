import { test, expect, type Page } from '@playwright/test';
import { colorAt, colorsAcross, distance, distinctColors, hex, saturation, shoot } from './ink';

/**
 * What the engines really paint. Runs in every browser: a rule that reads fine can still draw nothing —
 * the hue track was white in Firefox while its CSS looked right in all three.
 */

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/#map=6/48/10');
	await page.waitForSelector('.maplibregl-pane button.color-swatch', {
		state: 'attached',
		timeout: 30_000,
	});
	await page.waitForTimeout(1500);
});

function section(page: Page, title: string) {
	return page.locator(
		`.maplibregl-versatiles-styler details:has(summary .section-title:text-is("${title}"))`
	);
}

async function openColorPicker(page: Page) {
	const colors = section(page, 'Individual colors');
	await colors.locator('summary').click();
	// the water color, so the picker opens on a blue
	await colors
		.locator('.color-container', { has: page.locator('label[title="water"]') })
		.locator('button.color-swatch')
		.click();
	const picker = page.getByRole('dialog', { name: 'Color for Water' });
	await expect(picker).toBeVisible();
	await page.waitForTimeout(400);
	return picker;
}

test('the hue track shows the whole spectrum', async ({ page }) => {
	const picker = await openColorPicker(page);
	const track = picker.locator('.color-track-slot.color-track-hue');
	const colors = colorsAcross(await shoot(track));

	expect(distinctColors(colors), `hue track: ${colors.map(hex).join(' ')}`).toBeGreaterThanOrEqual(
		6
	);
	for (const color of colors) {
		expect(saturation(color), `hue track: ${colors.map(hex).join(' ')}`).toBeGreaterThan(100);
	}
});

test('the alpha track runs from the checkerboard to the color', async ({ page }) => {
	const picker = await openColorPicker(page);
	const track = picker.locator('.color-track-slot.color-track-alpha');
	const image = await shoot(track);
	const left = colorAt(image, 0.04, 0.5);
	// short of the right end, where the thumb sits at full alpha
	const right = colorAt(image, 0.75, 0.5);

	// the right end is the color itself, the left end the checkerboard behind it
	expect(distance(right, { r: 0xbf, g: 0xd9, b: 0xf2 }), `right ${hex(right)}`).toBeLessThan(40);
	expect(distance(left, right), `${hex(left)} → ${hex(right)}`).toBeGreaterThan(30);
});

test('the color area is drawn in both directions', async ({ page }) => {
	const picker = await openColorPicker(page);
	const image = await shoot(picker.locator('.color-area'));
	const topLeft = colorAt(image, 0.04, 0.04);
	const topRight = colorAt(image, 0.96, 0.04);
	const bottom = colorAt(image, 0.5, 0.96);

	expect(distance(topLeft, { r: 255, g: 255, b: 255 }), `top left ${hex(topLeft)}`).toBeLessThan(
		40
	);
	expect(saturation(topRight), `top right ${hex(topRight)}`).toBeGreaterThan(100);
	expect(Math.max(bottom.r, bottom.g, bottom.b), `bottom ${hex(bottom)}`).toBeLessThan(40);
});

test('a slider shows its filled part, and a mixed slider does not', async ({ page }) => {
	const labels = section(page, 'Labels');
	await labels.locator('summary').click();
	const size = labels.locator('.entry:has(label:text-is("Size"))');
	const range = size.locator('input[type="range"]');
	await range.fill('200');
	await range.dispatchEvent('change');
	await page.waitForTimeout(300);

	const image = await shoot(range);
	const filled = colorAt(image, 0.1, 0.5);
	const empty = colorAt(image, 0.95, 0.5);
	expect(saturation(filled), `filled ${hex(filled)}`).toBeGreaterThan(40);
	expect(saturation(empty), `empty ${hex(empty)}`).toBeLessThan(20);
});

test('a theme card is painted in the colors of its theme', async ({ page }) => {
	const card = section(page, 'Base style').locator('.theme-card').first();
	const image = await shoot(card);
	// two rows: the water and the park sit in different parts of the card
	const colors = [...colorsAcross(image, 9, 0.3), ...colorsAcross(image, 9, 0.85)];

	// the colorful theme: land, water and a street, at least three tones
	expect(distinctColors(colors, 16), `card: ${colors.map(hex).join(' ')}`).toBeGreaterThanOrEqual(
		3
	);
	const water = colors.find((color) => distance(color, { r: 0xbf, g: 0xd9, b: 0xf2 }) < 30);
	expect(water, `card: ${colors.map(hex).join(' ')}`).toBeDefined();
});

test('a color swatch shows its color, and transparency as a checkerboard', async ({ page }) => {
	const colors = section(page, 'Individual colors');
	await colors.locator('summary').click();
	const water = colors
		.locator('.color-container', { has: page.locator('label[title="water"]') })
		.locator('button.color-swatch');
	const opaque = await shoot(water);
	expect(distance(colorAt(opaque, 0.5, 0.5), { r: 0xbf, g: 0xd9, b: 0xf2 })).toBeLessThan(24);

	const field = colors
		.locator('.color-container', { has: page.locator('label[title="water"]') })
		.locator('input.color-text');
	await field.fill('#BFD9F220');
	await field.press('Enter');
	await page.waitForTimeout(300);

	// the right half shows the color over the checkerboard: light squares and gray ones
	const faded = await shoot(water);
	const squares = colorsAcross(faded, 8, 0.3).concat(colorsAcross(faded, 8, 0.8));
	expect(
		distinctColors(squares, 10),
		`swatch: ${squares.map(hex).join(' ')}`
	).toBeGreaterThanOrEqual(2);
});
