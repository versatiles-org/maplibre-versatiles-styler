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
		.locator('input.color-text');
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
	await page.goto('/#map=5/50/10&style=satellite&panel=open');
	await expect.poll(async () => (await getMapStyle(page)).name).toBe('versatiles-satellite');
});

test('overlay sections are there while the overlay is on', async ({ page }) => {
	const titles = page.locator(
		'.maplibregl-versatiles-styler .maplibregl-pane summary .section-title'
	);
	await expect(titles).toHaveText([
		'Tile server',
		'Import',
		'Base style',
		'Satellite imagery',
		'Overlay',
		'Overlay layers',
		'Overlay colors',
		'Overlay color adjustments',
		'Overlay labels',
		'Overlay icons',
		'Terrain & hillshade',
		'Map',
	]);

	const overlay = await open(page, 'Overlay');
	await row(overlay, 'Overlay').locator('input[type="checkbox"]').uncheck();
	await expect(section(page, 'Overlay colors')).toHaveCount(0);
	// without an overlay there is nothing to style: no "Appearance" group
	await expect(page.locator('.maplibregl-pane h4.section-group')).toHaveText([
		'Setup',
		'Style',
		'Content',
		'Scene',
	]);
	await expect.poll(() => layer(page, 'label-place-city')).toBeUndefined();
	await expect.poll(() => hashConfig(page)).toEqual({ osmOverlay: false });
});

test('a new overlay theme brings its colors', async ({ page }) => {
	const overlay = await open(page, 'Overlay');
	const colors = await open(page, 'Overlay colors');
	const water = colorInput(colors, 'water');
	await expect(water).toHaveValue('#D7D7D7'); // gray

	await row(overlay, 'Theme').locator('select').selectOption('toner');
	await expect(water).toHaveValue('#D8E7F7');
	// the imagery treatment stays: labels lightened for legibility over the photo
	await expect(colorInput(colors, 'label')).toHaveValue('#E4E4E4');
	await expect.poll(() => hashConfig(page)).toEqual({ osmOverlay: { theme: 'toner' } });
});

test('overlay colors', async ({ page }) => {
	const colors = await open(page, 'Overlay colors');
	const input = colorInput(colors, 'labelWater');
	await input.fill('#00ff00');
	await input.dispatchEvent('change');
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ osmOverlay: { colors: { labelWater: '#00FF00' } } });
});

test('overlay fonts default to bold and can be changed', async ({ page }) => {
	const labels = await open(page, 'Overlay labels');
	const allLabels = row(labels, 'Font').locator('button.font-button');
	await expect(allLabels).toHaveAccessibleName('Font: Noto Sans Bold', { timeout: 10_000 });

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
		.toEqual({ osmOverlay: { text: { font: 'fira_sans_bold' } } });
});

test('overlay layers only list what the overlay draws', async ({ page }) => {
	const layers = await open(page, 'Overlay layers');
	await expect(row(layers, 'Roads')).toHaveCount(1);
	await expect(row(layers, 'Land')).toHaveCount(0);
	await expect(row(layers, 'Water')).toHaveCount(0);
	await expect(row(layers, 'Buildings')).toHaveCount(0);

	await layers.getByRole('checkbox', { name: 'Show Labels' }).uncheck();
	await expect.poll(() => layer(page, 'label-place-city')).toBeUndefined();
	await expect.poll(() => hashConfig(page)).toEqual({ osmOverlay: { layers: { labels: false } } });
});

test('the sky follows the overlay water color', async ({ page }) => {
	const map = await open(page, 'Map');
	await expect(row(map, 'Sky Color').locator('input.color-text')).toHaveValue('#D7D7D7');
	await row(map, 'Projection').locator('select').selectOption('vertical-perspective');
	await expect.poll(() => hashConfig(page)).toEqual({ projection: 'vertical-perspective' });
});
