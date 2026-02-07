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

test('all 6 details sections are present with correct titles', async ({ page }) => {
	const summaries = page.locator('.maplibregl-versatiles-styler .maplibregl-pane details summary');
	await expect(summaries).toHaveCount(6);

	const expectedTitles = [
		'Select origin',
		'Select a base style',
		'Edit individual colors',
		'Modify all colors',
		'Select Options',
		'Export',
	];
	for (let i = 0; i < expectedTitles.length; i++) {
		await expect(summaries.nth(i)).toHaveText(expectedTitles[i]);
	}
});

test('sections expand and collapse on click', async ({ page }) => {
	const details = page.locator(
		'.maplibregl-versatiles-styler .maplibregl-pane details:has(summary:text("Export"))'
	);

	await expect(details).not.toHaveAttribute('open', '');
	await details.locator('summary').click();
	await expect(details).toHaveAttribute('open', '');
	await details.locator('summary').click();
	await expect(details).not.toHaveAttribute('open', '');
});

test('GitHub footer link is present', async ({ page }) => {
	const link = page.locator('.maplibregl-versatiles-styler .github-link a');
	await expect(link).toHaveAttribute(
		'href',
		'https://github.com/versatiles-org/maplibre-versatiles-styler'
	);
	await expect(link).toHaveText('Improve me on GitHub');
});
