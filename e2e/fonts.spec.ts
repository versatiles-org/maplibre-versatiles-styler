import { test, expect, type Page, type Locator } from '@playwright/test';
import { getMapStyle } from './helpers';

function fontsSection(page: Page): Locator {
	return page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Fonts & text size"))'
	);
}

/** The row of an input in the fonts section, by its label. */
function row(page: Page, label: string): Locator {
	return fontsSection(page).locator('.entry', {
		has: page.locator(`label:text-is("${label}")`),
	});
}

async function textFont(page: Page, layerId: string): Promise<unknown> {
	const style = await getMapStyle(page);
	return style.layers.find((layer) => layer.id === layerId)?.layout?.['text-font'];
}

/** The options stored in the URL hash. */
async function hashConfig(page: Page): Promise<unknown> {
	const match = page.url().match(/config=([^&]+)/);
	if (!match) return {};
	const json = atob(match[1].replace(/-/g, '+').replace(/_/g, '/'));
	return JSON.parse(json);
}

async function openFonts(page: Page) {
	await page.goto('/');
	await fontsSection(page).locator('summary').click();
	await expect(row(page, 'All labels').locator('select')).toBeAttached({ timeout: 10_000 });
}

test('lists the server’s faces grouped by family', async ({ page }) => {
	await openFonts(page);
	const select = row(page, 'All labels').locator('select');
	await expect(select.locator('optgroup[label="Fira Sans"]')).toHaveCount(1);
	await expect(
		select.locator('optgroup[label="Noto Sans"] option', { hasText: 'Noto Sans Bold' })
	).toHaveCount(1);
	// The theme mixes regular and bold faces
	await expect(select).toHaveValue('');
	await expect(select.locator('option:checked')).toHaveText('Mixed');
});

test('shows one select per group', async ({ page }) => {
	await openFonts(page);
	for (const label of ['Places', 'Streets', 'Water', 'Boundaries', 'POIs', 'House numbers']) {
		await expect(row(page, label).locator('select')).toHaveCount(1);
	}
});

test('"All labels" sets every label and stores a single face', async ({ page }) => {
	await openFonts(page);
	await row(page, 'All labels').locator('select').selectOption('fira_sans_regular');

	await expect.poll(() => textFont(page, 'label-place-city')).toEqual(['fira_sans_regular']);
	expect(await textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_regular']);
	await expect.poll(() => hashConfig(page)).toEqual({ text: { fonts: 'fira_sans_regular' } });
});

test('a group select sets only that group', async ({ page }) => {
	await openFonts(page);
	const placesBefore = await textFont(page, 'label-place-city');
	await row(page, 'Water').locator('select').selectOption('fira_sans_regular_italic');

	await expect
		.poll(() => textFont(page, 'label-water-river'))
		.toEqual(['fira_sans_regular_italic']);
	expect(await textFont(page, 'label-water-area-major')).toEqual(['fira_sans_regular_italic']);
	expect(await textFont(page, 'label-place-city')).toEqual(placesBefore);
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ text: { fonts: { water: 'fira_sans_regular_italic' } } });
});

test('a topic select sets only that topic', async ({ page }) => {
	await openFonts(page);
	const lakesBefore = await textFont(page, 'label-water-area-major');
	await row(page, 'Water').locator('button.expander').click();
	await row(page, 'Rivers').locator('select').selectOption('fira_sans_regular_italic');

	await expect
		.poll(() => textFont(page, 'label-water-river'))
		.toEqual(['fira_sans_regular_italic']);
	expect(await textFont(page, 'label-water-area-major')).toEqual(lakesBefore);
	await expect(row(page, 'Water').locator('select')).toHaveValue('');
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ text: { fonts: { water: { rivers: 'fira_sans_regular_italic' } } } });
});

test('resetting a group restores the theme’s faces', async ({ page }) => {
	await openFonts(page);
	const refsBefore = await textFont(page, 'label-motorway-shield');
	const streets = row(page, 'Streets');
	await streets.locator('select').selectOption('fira_sans_light');
	await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_light']);

	await streets.locator('.input > button').click();
	await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(refsBefore);
	await expect.poll(() => hashConfig(page)).toEqual({});
});

test('restores font choices from the hash', async ({ page }) => {
	await openFonts(page);
	await row(page, 'Boundaries').locator('select').selectOption('fira_sans_bold');
	await expect(page).toHaveURL(/config=/);

	await page.reload();
	await fontsSection(page).locator('summary').click();
	await expect(row(page, 'Boundaries').locator('select')).toHaveValue('fira_sans_bold', {
		timeout: 10_000,
	});
	expect(await textFont(page, 'label-boundary-state')).toEqual(['fira_sans_bold']);
});

test('warns when a face lacks the letters of the label language', async ({ page }) => {
	await openFonts(page);
	const labels = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Labels"))'
	);
	await labels.locator('summary').click();
	await labels.locator('select').selectOption('ar');

	await row(page, 'All labels').locator('select').selectOption('fira_sans_regular');
	await expect(row(page, 'All labels').locator('.warning')).toContainText(
		'Fira Sans Regular may lack the letters for'
	);

	await labels.locator('select').selectOption('de');
	await expect(row(page, 'All labels').locator('.warning')).toHaveCount(0);
});

test('offers text fields when the server publishes no face list', async ({ page }) => {
	await page.route('**/assets/glyphs/font_families.json', (route) =>
		route.fulfill({ status: 404, body: 'Not Found' })
	);
	await page.goto('/');
	await fontsSection(page).locator('summary').click();

	const allLabels = row(page, 'All labels').locator('input[type="text"]');
	await expect(allLabels).toBeAttached({ timeout: 10_000 });
	await allLabels.fill('fira_sans_regular');
	await allLabels.dispatchEvent('change');
	await expect.poll(() => textFont(page, 'label-place-city')).toEqual(['fira_sans_regular']);
});
