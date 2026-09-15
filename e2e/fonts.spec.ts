import { test, expect, type Page, type Locator } from '@playwright/test';
import { getMapStyle } from './helpers';

function labelsSection(page: Page): Locator {
	return page.locator(
		'.maplibregl-versatiles-styler details:has(summary .section-title:text-is("Labels"))'
	);
}

/** The row of an input in the labels section, by its label. */
function row(page: Page, label: string): Locator {
	return labelsSection(page).locator('.entry', {
		has: page.locator(`label:text-is("${label}")`),
	});
}

/** Chooses the labels the style rows apply to: `'all'`, `'streets'`, `'streets.refs'`, … */
async function applyTo(page: Page, path: string) {
	await row(page, 'Apply to').locator('select').selectOption(path);
}

function fontButton(page: Page): Locator {
	return row(page, 'Font').locator('button.font-button');
}

function picker(page: Page, title: string): Locator {
	return page.getByRole('dialog', { name: `Font for ${title}` });
}

function familyOption(dialog: Locator, family: string): Locator {
	return dialog.getByRole('option', { name: family, exact: true });
}

async function openPicker(page: Page, title: string): Promise<Locator> {
	await fontButton(page).click();
	const dialog = picker(page, title);
	await expect(dialog).toBeVisible();
	return dialog;
}

/** Picks a family in the picker, optionally a style, and closes the picker. */
async function chooseFont(
	page: Page,
	title: string,
	family: string,
	style: { width?: string; weight?: string; italic?: boolean } = {}
) {
	const dialog = await openPicker(page, title);
	await familyOption(dialog, family).click();
	if (style.width) {
		await dialog
			.getByRole('group', { name: 'Width' })
			.getByRole('button', { name: style.width, exact: true })
			.click();
	}
	if (style.weight) {
		await dialog
			.getByRole('group', { name: 'Weight' })
			.getByRole('button', { name: style.weight, exact: true })
			.click();
	}
	if (style.italic !== undefined) {
		await dialog.getByRole('checkbox', { name: 'Italic' }).setChecked(style.italic);
	}
	await dialog.getByRole('button', { name: 'Close' }).click();
	await expect(dialog).toHaveCount(0);
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

async function layer(page: Page, layerId: string) {
	const style = await getMapStyle(page);
	return style.layers.find((l) => l.id === layerId);
}

async function openFonts(page: Page) {
	await page.goto('/');
	await labelsSection(page).locator('summary').click();
	await expect(fontButton(page)).toBeAttached({ timeout: 10_000 });
}

test.describe('font picker', () => {
	test('lists font families with one preview each, loading only a few glyph files', async ({
		page,
	}) => {
		const glyphFiles: string[] = [];
		page.on('request', (r) => {
			if (/\/assets\/glyphs\/[^/]+\/0-255\.pbf$/.test(r.url())) glyphFiles.push(r.url());
		});
		await openFonts(page);
		await expect(fontButton(page)).toHaveAccessibleName('Font: Mixed');
		await applyTo(page, 'places');
		await expect(fontButton(page)).toHaveAccessibleName('Font: Noto Sans Regular');
		await applyTo(page, 'all');

		const dialog = await openPicker(page, 'All labels');
		await expect(familyOption(dialog, 'Fira Sans')).toContainText('54 styles');
		await expect(familyOption(dialog, 'Noto Sans')).toBeVisible();
		// Faces are no entries of their own
		await expect(dialog.getByRole('option', { name: 'Fira Sans Thin', exact: true })).toHaveCount(
			0
		);

		const drawn = dialog.locator('.font-preview.ready canvas').first();
		await expect(drawn).toBeVisible({ timeout: 10_000 });
		const inked = await drawn.evaluate((canvas: HTMLCanvasElement) => {
			const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
			let count = 0;
			for (let i = 3; i < data.length; i += 4) if (data[i] > 128) count++;
			return count;
		});
		expect(inked).toBeGreaterThan(50);
		await page.waitForTimeout(1000);
		expect(new Set(glyphFiles).size).toBeLessThanOrEqual(14);
	});

	test('opens beside the sidebar, not clipped by it', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'water');
		const dialog = await openPicker(page, 'Water');
		const box = await dialog.boundingBox();
		const pane = await page.locator('.maplibregl-pane').boundingBox();
		expect(box!.x).toBeGreaterThanOrEqual(pane!.x + pane!.width);
		expect(box!.width).toBeGreaterThan(300);
	});

	test('"All labels" sets every label and stores a single font', async ({ page }) => {
		await openFonts(page);
		await chooseFont(page, 'All labels', 'Fira Sans');

		await expect.poll(() => textFont(page, 'label-place-city')).toEqual(['fira_sans_regular']);
		expect(await textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_regular']);
		await expect.poll(() => hashConfig(page)).toEqual({ text: { font: 'fira_sans_regular' } });
		await expect(fontButton(page)).toHaveAccessibleName('Font: Fira Sans Regular');
	});

	test('a new family keeps the style of the current face', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'streets.refs');
		await expect(fontButton(page)).toHaveAccessibleName('Font: Noto Sans Bold');
		await chooseFont(page, 'Route numbers', 'Fira Sans');
		await expect(fontButton(page)).toHaveAccessibleName('Font: Fira Sans Bold');
		await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_bold']);
	});

	test('width, weight and italic pick a face of the family', async ({ page }) => {
		await openFonts(page);
		const placesBefore = await textFont(page, 'label-place-city');
		await applyTo(page, 'water');
		await chooseFont(page, 'Water', 'Fira Sans', {
			width: 'Condensed',
			weight: 'Light',
			italic: true,
		});

		await expect(fontButton(page)).toHaveAccessibleName('Font: Fira Sans Condensed Light Italic');
		await expect
			.poll(() => textFont(page, 'label-water-river'))
			.toEqual(['fira_sans_condensed_light_italic']);
		expect(await textFont(page, 'label-place-city')).toEqual(placesBefore);
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ text: { water: { font: 'fira_sans_condensed_light_italic' } } });
	});

	test('a topic sets only that topic', async ({ page }) => {
		await openFonts(page);
		const lakesBefore = await textFont(page, 'label-water-area-major');
		await applyTo(page, 'water.rivers');
		await chooseFont(page, 'Rivers', 'Fira Sans', { italic: true });

		await expect
			.poll(() => textFont(page, 'label-water-river'))
			.toEqual(['fira_sans_regular_italic']);
		expect(await textFont(page, 'label-water-area-major')).toEqual(lakesBefore);
		await applyTo(page, 'water');
		await expect(fontButton(page)).toHaveAccessibleName('Font: Mixed');
	});

	test('search finds a style; Enter picks it and closes, Escape closes', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'places');
		const dialog = await openPicker(page, 'Places');
		await expect(dialog.getByRole('combobox', { name: 'Search fonts' })).toBeFocused();

		await page.keyboard.type('fira cond light');
		await expect(familyOption(dialog, 'Fira Sans')).toContainText('Fira Sans Condensed Light');
		await expect(familyOption(dialog, 'Lato')).toHaveCount(0);
		await page.keyboard.press('Enter');
		await expect(dialog).toHaveCount(0);
		await expect(fontButton(page)).toBeFocused();
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ text: { places: { font: 'fira_sans_condensed_light' } } });

		await openPicker(page, 'Places');
		await page.keyboard.press('Escape');
		await expect(picker(page, 'Places')).toHaveCount(0);
		await expect(fontButton(page)).toBeFocused();
	});

	test('a click outside closes the picker without a change', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'pois');
		await openPicker(page, 'POIs');
		await page.mouse.click(900, 600);
		await expect(picker(page, 'POIs')).toHaveCount(0);
		await expect.poll(() => hashConfig(page)).toEqual({});
	});
});

test.describe('reusing fonts', () => {
	test('"Used in this style" lists the faces in use with their labels; a click applies one', async ({
		page,
	}) => {
		await openFonts(page);
		await applyTo(page, 'pois');
		const dialog = await openPicker(page, 'POIs');
		const bold = dialog.getByRole('option', { name: /^Noto Sans Bold, used by/ });
		await expect(bold).toHaveAccessibleName(
			'Noto Sans Bold, used by Route numbers, Points of interest'
		);
		await bold.click();
		await expect(dialog).toHaveCount(0);
		await expect(fontButton(page)).toHaveAccessibleName('Font: Noto Sans Bold');
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ text: { pois: { transit: { font: 'noto_sans_bold' } } } });
	});

	test('Ctrl/Cmd+C and Ctrl/Cmd+V copy a font from some labels to others', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'streets.refs');
		await fontButton(page).focus();
		await page.keyboard.press('ControlOrMeta+c');
		await applyTo(page, 'places');
		await fontButton(page).focus();
		await page.keyboard.press('ControlOrMeta+v');

		await expect(fontButton(page)).toHaveAccessibleName('Font: Noto Sans Bold');
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ text: { places: { font: 'noto_sans_bold' } } });
	});
});

test.describe('language filter', () => {
	test('hides families without the letters, and stays set for other labels until reset', async ({
		page,
	}) => {
		await openFonts(page);
		await applyTo(page, 'places');
		let dialog = await openPicker(page, 'Places');
		await expect(familyOption(dialog, 'Libre Baskerville')).toHaveCount(1);

		await dialog.getByRole('button', { name: 'Languages' }).click();
		await dialog.getByRole('checkbox', { name: 'Ελληνικά' }).check();
		await expect(familyOption(dialog, 'Libre Baskerville')).toHaveCount(0);
		await expect(familyOption(dialog, 'Fira Sans')).toHaveCount(1);
		await expect(dialog.locator('.font-picker-hidden')).toContainText('1 family hidden');
		await page.keyboard.press('Escape');

		await applyTo(page, 'water');
		dialog = await openPicker(page, 'Water');
		await expect(dialog.getByRole('button', { name: 'Languages (1)' })).toBeVisible();
		await expect(familyOption(dialog, 'Libre Baskerville')).toHaveCount(0);

		await dialog.locator('.font-picker-hidden').getByRole('button', { name: 'Show all' }).click();
		await expect(familyOption(dialog, 'Libre Baskerville')).toHaveCount(1);
		await expect(dialog.getByRole('button', { name: 'Languages', exact: true })).toBeVisible();
	});

	test('offers the label language first, and marks families without its letters', async ({
		page,
	}) => {
		await openFonts(page);
		await row(page, 'Language').locator('select').selectOption('ar');

		const dialog = await openPicker(page, 'All labels');
		await expect(familyOption(dialog, 'Fira Sans').locator('.font-picker-warning')).toContainText(
			'lacks letters for'
		);
		await dialog.getByRole('button', { name: 'Languages' }).click();
		await expect(dialog.locator('.font-picker-filter-options label').first()).toContainText(
			'label language'
		);

		await familyOption(dialog, 'Fira Sans').click();
		await page.keyboard.press('Escape');
		await expect(row(page, 'Font').locator('.warning')).toContainText(
			'Fira Sans Regular may lack the letters for'
		);
	});
});

test('resetting the font of a group restores the theme’s faces', async ({ page }) => {
	await openFonts(page);
	const refsBefore = await textFont(page, 'label-motorway-shield');
	await applyTo(page, 'streets');
	await chooseFont(page, 'Streets', 'Fira Sans', { weight: 'Light' });
	await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(['fira_sans_light']);

	await row(page, 'Font').locator('button.reset').click();
	await expect.poll(() => textFont(page, 'label-motorway-shield')).toEqual(refsBefore);
	await expect.poll(() => hashConfig(page)).toEqual({});
});

test('restores font choices from the hash', async ({ page }) => {
	await openFonts(page);
	await applyTo(page, 'boundaries');
	await chooseFont(page, 'Boundaries', 'Fira Sans', { weight: 'Bold' });
	await expect(page).toHaveURL(/config=/);

	await page.reload();
	await labelsSection(page).locator('summary').click();
	await applyTo(page, 'boundaries');
	await expect(fontButton(page)).toHaveAccessibleName('Font: Fira Sans Bold', {
		timeout: 10_000,
	});
	expect(await textFont(page, 'label-boundary-state')).toEqual(['fira_sans_bold']);
});

test('offers a text field when the server publishes no face list', async ({ page }) => {
	await page.route('**/assets/glyphs/font_families.json', (route) =>
		route.fulfill({ status: 404, body: 'Not Found' })
	);
	await page.goto('/');
	await labelsSection(page).locator('summary').click();

	const font = row(page, 'Font').locator('input[type="text"]');
	await expect(font).toBeAttached({ timeout: 10_000 });
	await font.fill('fira_sans_regular');
	await font.dispatchEvent('change');
	await expect.poll(() => textFont(page, 'label-place-city')).toEqual(['fira_sans_regular']);
});

test.describe('label style', () => {
	async function typeValue(page: Page, label: string, text: string) {
		await row(page, label).locator('button.value').click();
		await page.keyboard.type(text);
		await page.keyboard.press('Enter');
	}

	test('a group sets all its topics; above it the value shows as mixed', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'streets');
		await expect(row(page, 'Halo width').locator('button.value')).toHaveText('Mixed');
		await typeValue(page, 'Halo width', '3');

		await expect
			.poll(async () => (await layer(page, 'label-motorway-shield'))?.paint?.['text-halo-width'])
			.toBe(3);
		expect((await layer(page, 'label-water-river'))?.paint?.['text-halo-width']).toBe(2);
		await expect.poll(() => hashConfig(page)).toEqual({ text: { streets: { haloWidth: 3 } } });

		await applyTo(page, 'all');
		await expect(row(page, 'Halo width').locator('button.value')).toHaveText('Mixed');
		await applyTo(page, 'streets.exits');
		await expect(row(page, 'Halo width').locator('button.value')).toHaveText('3 px');
	});

	test('capitalization of a topic', async ({ page }) => {
		await openFonts(page);
		await applyTo(page, 'places');
		await expect(row(page, 'Capitalization').locator('select')).toHaveValue('');
		await applyTo(page, 'places.hamlets');
		const select = row(page, 'Capitalization').locator('select');
		await expect(select).toHaveValue('uppercase');
		await select.selectOption('none');

		await expect
			.poll(async () => (await layer(page, 'label-place-hamlet'))?.layout?.['text-transform'])
			.toBeUndefined();
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ text: { places: { hamlets: { transform: 'none' } } } });
	});

	test('"Apply to" marks labels with changes, and its reset restores the selected labels', async ({
		page,
	}) => {
		await openFonts(page);
		await applyTo(page, 'water.lakes');
		await typeValue(page, 'Letter spacing', '0.1');
		await applyTo(page, 'places');
		await typeValue(page, 'Size', '150');

		const options = row(page, 'Apply to').locator('option');
		await expect(options.filter({ hasText: '•' })).toHaveText([
			'All labels •',
			/Places •/,
			/Cities •/,
			/Villages •/,
			/Hamlets •/,
			/Districts •/,
			/Water •/,
			/Lakes •/,
		]);

		await applyTo(page, 'water');
		await row(page, 'Apply to').locator('button.reset').click();
		await expect.poll(() => hashConfig(page)).toEqual({ text: { places: { scale: 1.5 } } });
		await expect(row(page, 'Apply to').locator('select')).toHaveValue('water');
	});
});
