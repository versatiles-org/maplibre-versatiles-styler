import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('control renders on the map', async ({ page }) => {
	const toggle = page.locator('.maplibregl-versatiles-styler button.maplibregl-ctrl-icon');
	await expect(toggle).toBeAttached();
});

test('toggle button opens and closes the pane', async ({ page }) => {
	const toggle = page.locator('.maplibregl-versatiles-styler button.maplibregl-ctrl-icon');
	const pane = page.locator('.maplibregl-versatiles-styler .maplibregl-pane');

	// Demo starts with open: true, so pane is already present
	await expect(pane).toBeAttached();
	await toggle.click();
	await expect(pane).not.toBeAttached();
	await toggle.click();
	await expect(pane).toBeAttached();
});

test('all sidebar sections are present with correct titles', async ({ page }) => {
	const titles = page.locator(
		'.maplibregl-versatiles-styler .maplibregl-pane details summary .section-title'
	);

	const expectedTitles = [
		'Tile server',
		'Base style',
		'Layers',
		'Color adjustments',
		'Individual colors',
		'Labels',
		'Icons',
		'Terrain & hillshade',
		'Map',
	];
	await expect(titles).toHaveCount(expectedTitles.length);
	for (let i = 0; i < expectedTitles.length; i++) {
		await expect(titles.nth(i)).toHaveText(expectedTitles[i]);
	}
});

test('sections are grouped under headings', async ({ page }) => {
	const outline = await page
		.locator('.maplibregl-pane > h4.section-group, .maplibregl-pane > details')
		.evaluateAll((elements) =>
			elements.map((el) =>
				el.tagName === 'H4'
					? `# ${el.textContent}`
					: el.querySelector('.section-title')?.textContent
			)
		);
	expect(outline).toEqual([
		'# Setup',
		'Tile server',
		'# Style',
		'Base style',
		'# Content',
		'Layers',
		'# Appearance',
		'Color adjustments',
		'Individual colors',
		'Labels',
		'Icons',
		'# Scene',
		'Terrain & hillshade',
		'Map',
	]);
});

test('sections expand and collapse on click', async ({ page }) => {
	const details = page.locator(
		'.maplibregl-versatiles-styler .maplibregl-pane details:has(summary:has-text("Tile server"))'
	);

	await expect(details).not.toHaveAttribute('open', '');
	await details.locator('summary').click();
	await expect(details).toHaveAttribute('open', '');
	await details.locator('summary').click();
	await expect(details).not.toHaveAttribute('open', '');
});

test('the header links to GitHub', async ({ page }) => {
	const link = page.getByRole('link', { name: 'Improve me on GitHub' });
	await expect(link).toHaveAttribute(
		'href',
		'https://github.com/versatiles-org/maplibre-versatiles-styler'
	);
	await expect(link).toHaveAttribute('target', '_blank');
});

test('the header resets every change, and can undo it', async ({ page }) => {
	const labels = page.locator(
		'.maplibregl-versatiles-styler details:has(summary .section-title:text-is("Labels"))'
	);
	await labels.locator('summary').click();
	await labels.locator('.entry:has(label:text-is("Language")) select').selectOption('de');
	await expect(page).toHaveURL(/config=/);

	const resetAll = page.getByRole('button', { name: 'Reset all changes' });
	await expect(resetAll).toHaveAttribute('title', 'Reset all 1 changes');
	await resetAll.click();
	await expect(page).not.toHaveURL(/config=/);
	await expect(resetAll).toHaveCount(0);

	await page.getByRole('button', { name: 'Undo reset' }).click();
	await expect(page).toHaveURL(/config=/);
	await expect(labels.locator('.entry:has(label:text-is("Language")) select')).toHaveValue('de');
});

test('the header closes the pane; the control button opens it again', async ({ page }) => {
	const pane = page.locator('.maplibregl-versatiles-styler .maplibregl-pane');
	await expect(pane).toBeAttached();
	await page.getByRole('button', { name: 'Close the style editor' }).click();
	await expect(pane).not.toBeAttached();
	await page.locator('.maplibregl-versatiles-styler button.maplibregl-ctrl-icon').click();
	await expect(pane).toBeAttached();
});

test('a dark theme gives the panel dark colors', async ({ page }) => {
	const pane = page.locator('.maplibregl-versatiles-styler .maplibregl-pane');
	const background = () => pane.evaluate((el) => getComputedStyle(el).backgroundColor);
	const light = await background();

	await page
		.locator('.maplibregl-versatiles-styler .style-list label:has(input[value="toner-dark"])')
		.click();
	await expect.poll(background).not.toBe(light);
	await expect(page.locator('.maplibregl-map.versatiles-styler-dark')).toHaveCount(1);
});
