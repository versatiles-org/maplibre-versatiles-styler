import { test, expect, type Page } from '@playwright/test';
import { getMapStyle } from './helpers';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Import style' });

/** Opens the import dialog from the Setup group of the sidebar. */
async function openImport(page: Page) {
	await getMapStyle(page);
	const section = page.locator('details:has(summary .section-title:text-is("Import"))');
	await section.locator('summary').click();
	await section.getByRole('button', { name: 'Import a style…' }).click();
	await expect(dialog(page)).toBeVisible();
	return dialog(page);
}

/** Pastes `text` and runs the check, returning the report. */
async function check(panel: ReturnType<typeof dialog>, text: string) {
	await panel.getByRole('textbox').fill(text);
	await panel.getByRole('button', { name: 'Check' }).click();
	return panel.locator('.import-report');
}

test.beforeEach(async ({ page }) => {
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('is reachable from the Setup group, not hidden in the export menu', async ({ page }) => {
	const panel = await openImport(page);
	await expect(panel.getByRole('textbox')).toBeVisible();
	// nothing can be applied before something has been checked
	await expect(panel.getByRole('button', { name: 'Apply to the map' })).toBeDisabled();
});

test('takes a styler link and applies it', async ({ page }) => {
	const panel = await openImport(page);

	const report = await check(
		panel,
		'https://example.org/#style=toner&config=eyJ0ZXh0Ijp7InNjYWxlIjoxLjV9fQ'
	);
	await expect(report).toContainText('a styler link');
	await expect(report).toContainText('toner');

	await panel.getByRole('button', { name: 'Apply to the map' }).click();
	await expect(dialog(page)).toBeHidden();

	// the panel now shows the imported theme, and the hash carries it
	const baseStyle = page.locator('details:has(summary .section-title:text-is("Base style"))');
	await expect(baseStyle.locator('.section-value')).toHaveText('toner');
	await expect(page).toHaveURL(/style=toner/);
});

test('takes an options object', async ({ page }) => {
	const panel = await openImport(page);

	const report = await check(panel, '{"theme":"gray-dark","text":{"scale":1.5}}');
	await expect(report).toContainText('an options object');
	await expect(report).toContainText('gray-dark');
	await expect(report).toContainText('1 changed setting');

	await panel.getByRole('button', { name: 'Apply to the map' }).click();
	const baseStyle = page.locator('details:has(summary .section-title:text-is("Base style"))');
	await expect(baseStyle.locator('.section-value')).toHaveText('gray-dark');
});

test('explains a bad option instead of failing silently', async ({ page }) => {
	const panel = await openImport(page);

	await panel.getByRole('textbox').fill('{"theme":"gray","nonsense":true}');
	await panel.getByRole('button', { name: 'Check' }).click();

	const error = panel.locator('.import-error');
	await expect(error).toBeVisible();
	await expect(error).toContainText('not valid');
	// the library names the key and lists what is valid in its place
	await expect(error).toContainText('nonsense');
	await expect(error).toContainText('known keys here');
	// and nothing can be applied
	await expect(panel.getByRole('button', { name: 'Apply to the map' })).toBeDisabled();
});

test('explains a v5 option in terms of its v6 replacement', async ({ page }) => {
	const panel = await openImport(page);

	await panel.getByRole('textbox').fill('{"theme":"gray","colors":{"wood":"#123456"}}');
	await panel.getByRole('button', { name: 'Check' }).click();

	await expect(panel.locator('.import-error')).toContainText('natureWood');
});

test('rejects text that is neither a link nor JSON', async ({ page }) => {
	const panel = await openImport(page);

	await panel.getByRole('textbox').fill('just some words');
	await panel.getByRole('button', { name: 'Check' }).click();

	await expect(panel.locator('.import-error')).toContainText('not valid JSON');
});

test('round-trips a style.json exported from this styler, exactly', async ({ page }) => {
	// Export a style with a distinctive setting…
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="muted"])').click();

	await getMapStyle(page);
	await page.getByRole('button', { name: 'Export' }).click();
	const exportPanel = page.getByRole('dialog', { name: 'Export style' });
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		exportPanel.getByRole('button', { name: 'Download' }).click(),
	]);
	const file = await download.path();
	await exportPanel.getByRole('button', { name: 'Close' }).click();

	// …switch away, then import the file back. Through the file picker rather than the textarea: it is
	// what someone actually does with a downloaded file, and pasting half a megabyte is slow.
	await styleList.locator('label:has(input[value="colorful"])').click();

	const panel = await openImport(page);
	await panel.locator('input[type="file"]').setInputFiles(file);
	const report = panel.locator('.import-report');

	// read from the recorded options, not reconstructed — so there is nothing to warn about at all
	await expect(report).toContainText('a style.json from this styler');
	await expect(report).toContainText('muted');
	await expect(report).not.toContainText('Worth knowing');
	await expect(report).not.toContainText('close copy');

	await panel.getByRole('button', { name: 'Apply to the map' }).click();
	const baseStyle = page.locator('details:has(summary .section-title:text-is("Base style"))');
	await expect(baseStyle.locator('.section-value')).toHaveText('muted');
});

test('warns before applying a style it had to reconstruct', async ({ page }) => {
	const panel = await openImport(page);

	// A style with no record of its options: it has to be read by working out what it draws. Built here
	// from the styler's own export with the metadata stripped, so the test needs no fixture file.
	const foreign = await page.evaluate(async () => {
		const style = (
			window as unknown as { _map: { getStyle(): Record<string, unknown> } }
		)._map.getStyle();
		const { metadata: _metadata, ...rest } = style;
		return JSON.stringify(rest);
	});

	const report = await check(panel, foreign);
	await expect(report).toContainText('a MapLibre style');
	// it says plainly that this is a close copy, before anything is applied
	await expect(report).toContainText('close copy');
	// how much of the palette was actually read, rather than taken from the theme
	await expect(report).toContainText(/\d+ of \d+ colours were read from the style/);
	// re-reading one of our own styles is the best case there is: notes, not warnings
	await expect(report).not.toContainText('Worth knowing');
	await expect(report.locator('.import-notes summary')).toContainText(/\d+ more notes?/);
	await expect(page.getByRole('dialog', { name: 'Import style' })).toBeVisible();
});

test('offers the discarded colours when several layers paint one setting', async ({ page }) => {
	const panel = await openImport(page);

	// Four symbol layers matching the same probe feature: the topmost wins, and the three it passed
	// over are what the dialog offers back as swatches.
	const stacked = JSON.stringify({
		version: 8,
		sources: { omt: { type: 'vector', url: 'https://example.org/t.json' } },
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
			...['#16a085', '#8e44ad', '#c0392b', '#d35400'].map((color, i) => ({
				id: `poi-${i}`,
				type: 'symbol',
				source: 'omt',
				'source-layer': 'poi',
				layout: { 'text-field': '{name}', 'text-font': ['Noto Sans Regular'] },
				paint: { 'text-color': color },
			})),
		],
	});

	const report = await check(panel, stacked);
	await expect(report).toContainText('Worth knowing');
	await expect(report).toContainText('colours were drawn for');

	const swatches = report.locator('.import-swatches').first();
	await expect(swatches.locator('li')).toHaveCount(4);
	// the winner is marked, not merely listed first
	await expect(swatches.locator('li.won')).toHaveCount(1);
	await expect(swatches.locator('li.won')).toContainText('#D35400');
});

test('closes on Escape without applying anything', async ({ page }) => {
	const panel = await openImport(page);
	await check(panel, '{"theme":"toner"}');

	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeHidden();

	const baseStyle = page.locator('details:has(summary .section-title:text-is("Base style"))');
	await expect(baseStyle.locator('.section-value')).toHaveText('colorful');
});
