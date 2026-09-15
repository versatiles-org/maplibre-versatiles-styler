import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * A section's reset button is also its "changed" indicator: it is shown only while the section differs
 * from its defaults.
 */

function section(page: Page, title: string): Locator {
	return page.locator(
		`.maplibregl-versatiles-styler details:has(summary .section-title:text-is("${title}"))`
	);
}

function row(scope: Locator, label: string): Locator {
	return scope.locator('.entry', { has: scope.page().locator(`label:text-is("${label}")`) });
}

/** The titles of the sections that show a reset button. */
function changedSections(page: Page): Promise<string[]> {
	return page
		.locator('.maplibregl-versatiles-styler summary:has(.section-reset) .section-title')
		.allTextContents();
}

async function type(page: Page, scope: Locator, label: string, text: string) {
	await row(scope, label).locator('button.value').click();
	await page.keyboard.type(text);
	await page.keyboard.press('Enter');
}

test('no section shows a reset button while nothing is changed', async ({ page }) => {
	await page.goto('/');
	await expect(section(page, 'Map')).toBeAttached();
	expect(await changedSections(page)).toEqual([]);
});

test('a change shows the reset button of its section only; resetting hides it', async ({
	page,
}) => {
	await page.goto('/');
	const labels = section(page, 'Labels');
	await labels.locator('summary').click();
	await type(page, labels, 'Size', '150');
	await expect.poll(() => changedSections(page)).toEqual(['Labels']);

	const layers = section(page, 'Layers');
	await layers.locator('summary').click();
	await row(layers, '3D buildings').locator('input[type="checkbox"]').check();
	await expect.poll(() => changedSections(page)).toEqual(['Layers', 'Labels']);

	await labels.locator('.section-reset').click();
	await expect.poll(() => changedSections(page)).toEqual(['Layers']);
	await expect(row(labels, 'Size').locator('button.value')).toHaveText('100%');
	// resetting does not fold the section
	await expect(labels).toHaveAttribute('open', '');
});

test('setting a value back by hand hides the reset button too', async ({ page }) => {
	await page.goto('/');
	const map = section(page, 'Map');
	await map.locator('summary').click();
	await row(map, 'Projection').locator('select').selectOption('mercator');
	await expect.poll(() => changedSections(page)).toEqual(['Map']);
	await row(map, 'Projection').locator('select').selectOption('globe');
	await expect.poll(() => changedSections(page)).toEqual([]);
});

test('satellite: the overlay sections report their own changes', async ({ page }) => {
	await page.goto('/#style=satellite');
	await expect(section(page, 'Overlay colors')).toBeAttached();
	expect(await changedSections(page)).toEqual([]);

	// A new theme brings its own colors: the colors are the theme's defaults, not a change.
	const overlay = section(page, 'Overlay');
	await overlay.locator('summary').click();
	await row(overlay, 'Theme').locator('select').selectOption('toner');
	await expect.poll(() => changedSections(page)).toEqual(['Overlay']);

	const imagery = section(page, 'Satellite imagery');
	await imagery.locator('summary').click();
	await type(page, imagery, 'Opacity', '50');
	await expect.poll(() => changedSections(page)).toEqual(['Satellite imagery', 'Overlay']);

	await overlay.locator('.section-reset').click();
	await expect(row(overlay, 'Theme').locator('select')).toHaveValue('gray');
	await expect.poll(() => changedSections(page)).toEqual(['Satellite imagery']);
});
