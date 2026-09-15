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

function fontButton(page: Page, label: string): Locator {
	return row(page, label).locator('button.font-button');
}

function picker(page: Page, label: string): Locator {
	return page.getByRole('dialog', { name: `Font for ${label}` });
}

/** Opens the picker of a row and picks a face by its title. */
async function chooseFont(page: Page, label: string, title: string) {
	await fontButton(page, label).click();
	await expect(picker(page, label)).toBeVisible();
	await picker(page, label).getByRole('option', { name: title, exact: true }).click();
	await expect(picker(page, label)).toHaveCount(0);
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
	await expect(fontButton(page, 'All labels')).toBeAttached({ timeout: 10_000 });
}

test('a picker lists the server’s faces by family, with previews drawn from the glyphs', async ({
	page,
}) => {
	await openFonts(page);
	// The theme mixes regular and bold faces
	await expect(fontButton(page, 'All labels')).toHaveAccessibleName('All labels: Mixed');
	await expect(fontButton(page, 'Places')).toHaveAccessibleName('Places: Noto Sans Regular');

	await fontButton(page, 'All labels').click();
	const dialog = picker(page, 'All labels');
	await expect(dialog.locator('.font-picker-family', { hasText: 'Fira Sans' })).toHaveCount(1);
	await expect(dialog.getByRole('option', { name: 'Noto Sans Bold', exact: true })).toHaveCount(1);

	// Previews are drawn on canvas once they scroll into view
	const notoBold = dialog.getByRole('option', { name: 'Noto Sans Bold', exact: true });
	await notoBold.scrollIntoViewIfNeeded();
	const drawn = notoBold.locator('.font-preview.ready canvas');
	await expect(drawn).toBeVisible({ timeout: 10_000 });
	const inked = await drawn.evaluate((canvas: HTMLCanvasElement) => {
		const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
		let count = 0;
		for (let i = 3; i < data.length; i += 4) if (data[i] > 128) count++;
		return count;
	});
	expect(inked).toBeGreaterThan(50);
});

test('the picker opens beside the sidebar, not clipped by it', async ({ page }) => {
	await openFonts(page);
	await fontButton(page, 'Water').click();
	const box = await picker(page, 'Water').boundingBox();
	const pane = await page.locator('.maplibregl-pane').boundingBox();
	expect(box!.x).toBeGreaterThanOrEqual(pane!.x + pane!.width);
	expect(box!.width).toBeGreaterThan(300);
	await expect(picker(page, 'Water').getByRole('button', { name: 'Close' })).toBeVisible();
});

test('shows one font button per group', async ({ page }) => {
	await openFonts(page);
	for (const label of ['Places', 'Streets', 'Water', 'Boundaries', 'POIs', 'House numbers']) {
		await expect(fontButton(page, label)).toHaveCount(1);
	}
});

test('"All labels" sets every label and stores a single face', async ({ page }) => {
	await openFonts(page);
	await chooseFont(page, 'All labels', 'Fira Sans Regular');

	await expect.poll(() => textFont(page, 'label-place-city')).toEqual(['fira_sans_regular']);
	expect(await textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_regular']);
	await expect.poll(() => hashConfig(page)).toEqual({ text: { fonts: 'fira_sans_regular' } });
	await expect(fontButton(page, 'All labels')).toHaveAccessibleName(
		'All labels: Fira Sans Regular'
	);
});

test('a group sets only that group', async ({ page }) => {
	await openFonts(page);
	const placesBefore = await textFont(page, 'label-place-city');
	await chooseFont(page, 'Water', 'Fira Sans Italic');

	await expect
		.poll(() => textFont(page, 'label-water-river'))
		.toEqual(['fira_sans_regular_italic']);
	expect(await textFont(page, 'label-water-area-major')).toEqual(['fira_sans_regular_italic']);
	expect(await textFont(page, 'label-place-city')).toEqual(placesBefore);
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ text: { fonts: { water: 'fira_sans_regular_italic' } } });
});

test('a topic sets only that topic', async ({ page }) => {
	await openFonts(page);
	const lakesBefore = await textFont(page, 'label-water-area-major');
	await row(page, 'Water').locator('button.expander').click();
	await chooseFont(page, 'Rivers', 'Fira Sans Italic');

	await expect
		.poll(() => textFont(page, 'label-water-river'))
		.toEqual(['fira_sans_regular_italic']);
	expect(await textFont(page, 'label-water-area-major')).toEqual(lakesBefore);
	await expect(fontButton(page, 'Water')).toHaveAccessibleName('Water: Mixed');
	await expect
		.poll(() => hashConfig(page))
		.toEqual({ text: { fonts: { water: { rivers: 'fira_sans_regular_italic' } } } });
});

test('resetting a group restores the theme’s faces', async ({ page }) => {
	await openFonts(page);
	const refsBefore = await textFont(page, 'label-motorway-shield');
	await chooseFont(page, 'Streets', 'Fira Sans Light');
	await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_light']);

	await row(page, 'Streets').locator('button.reset').click();
	await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(refsBefore);
	await expect.poll(() => hashConfig(page)).toEqual({});
});

test('restores font choices from the hash', async ({ page }) => {
	await openFonts(page);
	await chooseFont(page, 'Boundaries', 'Fira Sans Bold');
	await expect(page).toHaveURL(/config=/);

	await page.reload();
	await fontsSection(page).locator('summary').click();
	await expect(fontButton(page, 'Boundaries')).toHaveAccessibleName('Boundaries: Fira Sans Bold', {
		timeout: 10_000,
	});
	expect(await textFont(page, 'label-boundary-state')).toEqual(['fira_sans_bold']);
});

test('search and keyboard: filter, pick with Enter, Escape closes', async ({ page }) => {
	await openFonts(page);
	await fontButton(page, 'Places').click();
	const dialog = picker(page, 'Places');
	await expect(dialog.getByRole('combobox', { name: 'Search fonts' })).toBeFocused();

	await page.keyboard.type('lato bold');
	const options = dialog.getByRole('option');
	await expect(options.first()).toHaveAccessibleName(/^Lato .*Bold/);
	const names = await options.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
	for (const name of names) expect(name).toMatch(/^Lato .*Bold/);

	await page.keyboard.press('ArrowDown');
	const second = await options.nth(1).getAttribute('data-face');
	await page.keyboard.press('Enter');
	await expect(dialog).toHaveCount(0);
	await expect(fontButton(page, 'Places')).toBeFocused();
	await expect.poll(() => hashConfig(page)).toEqual({ text: { fonts: { places: second } } });

	await fontButton(page, 'Places').click();
	await page.keyboard.press('Escape');
	await expect(picker(page, 'Places')).toHaveCount(0);
	await expect(fontButton(page, 'Places')).toBeFocused();
});

test('a click outside closes the picker without a change', async ({ page }) => {
	await openFonts(page);
	await fontButton(page, 'POIs').click();
	await expect(picker(page, 'POIs')).toBeVisible();
	await page.mouse.click(900, 600);
	await expect(picker(page, 'POIs')).toHaveCount(0);
	await expect.poll(() => hashConfig(page)).toEqual({});
});

test('warns when a face lacks the letters of the label language', async ({ page }) => {
	await openFonts(page);
	const labels = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Labels"))'
	);
	await labels.locator('summary').click();
	await labels.locator('select').selectOption('ar');

	await fontButton(page, 'All labels').click();
	const option = picker(page, 'All labels').getByRole('option', {
		name: 'Fira Sans Regular',
		exact: true,
	});
	await expect(option.locator('.font-picker-warning')).toHaveCount(1);
	await option.click();
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
