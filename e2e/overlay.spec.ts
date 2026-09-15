import { test, expect, type Page, type Locator } from '@playwright/test';
import { getMapStyle } from './helpers';

function section(page: Page, title: string): Locator {
	return page.locator(
		`.maplibregl-versatiles-styler details:has(summary .section-title:text-is("${title}"))`
	);
}

function row(scope: Locator, label: string): Locator {
	return scope.locator('.entry', { has: scope.page().locator(`label:text-is("${label}")`) });
}

/** A colour input by its option key, which each row carries as its hint. */
function colorInput(scope: Locator, key: string): Locator {
	return scope
		.locator('.color-container', { has: scope.page().locator(`label[title="${key}"]`) })
		.locator('input[type="color"]');
}

async function layer(page: Page, id: string) {
	return (await getMapStyle(page)).layers.find((l) => l.id === id);
}

async function hashConfig(page: Page): Promise<unknown> {
	const match = page.url().match(/config=([^&]+)/);
	if (!match) return {};
	return JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')));
}

async function open(page: Page, title: string): Promise<Locator> {
	const details = section(page, title);
	await details.locator('summary').click();
	return details;
}

test.beforeEach(async ({ page }) => {
	await page.goto('/#map=5/50/10&style=satellite');
	await expect.poll(async () => (await getMapStyle(page)).name).toBe('versatiles-satellite');
});

test('overlay sections are there while the overlay is on', async ({ page }) => {
	const titles = page.locator(
		'.maplibregl-versatiles-styler .maplibregl-pane summary .section-title'
	);
	await expect(titles).toHaveText([
		'Origin',
		'Base style',
		'Satellite imagery',
		'Overlay',
		'Overlay color adjustments',
		'Overlay colors',
		'Overlay fonts & text size',
		'Overlay layers',
		'Terrain & hillshade',
		'Map',
		'Labels',
		'Export',
	]);

	const overlay = await open(page, 'Overlay');
	await row(overlay, 'Overlay').locator('input[type="checkbox"]').uncheck();
	await expect(section(page, 'Overlay colors')).toHaveCount(0);
	await expect.poll(() => layer(page, 'label-place-city')).toBeUndefined();
	await expect.poll(() => hashConfig(page)).toEqual({ osmOverlay: false });
});

test('a new overlay theme brings its colors', async ({ page }) => {
	const overlay = await open(page, 'Overlay');
	const colors = await open(page, 'Overlay colors');
	const water = colorInput(colors, 'water');
	await expect(water).toHaveValue('#d8d8d8'); // gray

	await row(overlay, 'Theme').locator('select').selectOption('toner');
	await expect(water).toHaveValue('#d8e7f7');
	// the imagery treatment stays: white labels
	await expect(colorInput(colors, 'label')).toHaveValue('#ffffff');
	await expect.poll(() => hashConfig(page)).toEqual({ osmOverlay: { theme: 'toner' } });
});

test('overlay colors', async ({ page }) => {
	const colors = await open(page, 'Overlay colors');
	const input = colorInput(colors, 'labelWater');
	await input.fill('#00ff00');
	await input.dispatchEvent('change');
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ osmOverlay: { colors: { labelWater: '#00ff00' } } });
});

test('overlay fonts default to bold and can be changed', async ({ page }) => {
	const fonts = await open(page, 'Overlay fonts & text size');
	const allLabels = row(fonts, 'All labels').locator('button.font-button');
	await expect(allLabels).toHaveAccessibleName('All labels: Noto Sans Bold', { timeout: 10_000 });

	await allLabels.click();
	const dialog = page.getByRole('dialog', { name: 'Font for All labels' });
	// The overlay's bold style is kept when switching family
	await dialog.getByRole('option', { name: 'Fira Sans', exact: true }).click();
	await dialog.getByRole('button', { name: 'Close' }).click();
	await expect
		.poll(async () => (await layer(page, 'label-place-city'))?.layout?.['text-font'])
		.toEqual(['fira_sans_bold']);
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ osmOverlay: { text: { fonts: 'fira_sans_bold' } } });
});

test('overlay layers only list what the overlay draws', async ({ page }) => {
	const layers = await open(page, 'Overlay layers');
	await expect(row(layers, 'Roads')).toHaveCount(1);
	await expect(row(layers, 'Land')).toHaveCount(0);
	await expect(row(layers, 'Water')).toHaveCount(0);
	await expect(row(layers, 'Buildings')).toHaveCount(0);

	await row(layers, 'Labels').locator('input[type="checkbox"]').uncheck();
	await expect.poll(() => layer(page, 'label-place-city')).toBeUndefined();
	await expect.poll(() => hashConfig(page)).toEqual({ osmOverlay: { layers: { labels: false } } });
});

test('the sky follows the overlay water color', async ({ page }) => {
	const map = await open(page, 'Map');
	await expect(row(map, 'Sky Color').locator('input[type="color"]')).toHaveValue('#d8d8d8');
	await row(map, 'Projection').locator('select').selectOption('vertical-perspective');
	await expect.poll(() => hashConfig(page)).toEqual({ projection: 'vertical-perspective' });
});
