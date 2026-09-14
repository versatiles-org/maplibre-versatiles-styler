import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.locator('.maplibregl-versatiles-styler').waitFor({ state: 'attached' });
});

function labelsSection(page: import('@playwright/test').Page) {
	return page.locator('.maplibregl-versatiles-styler details:has(summary:has-text("Labels"))');
}

test('language select offers local, browser and the tileset languages', async ({ page }) => {
	const labels = labelsSection(page);
	await labels.locator('summary').click();

	const select = labels.locator('select');
	await expect(select.locator('option[value="de"]')).toHaveText('Deutsch', { timeout: 10_000 });
	await expect(select.locator('option').nth(0)).toHaveAttribute('value', 'local');
	await expect(select.locator('option').nth(1)).toHaveAttribute('value', 'user');
	// transliterations and regional variants are not offered
	await expect(select.locator('option[value="int"], option[value="latin"]')).toHaveCount(0);
});

test('choosing a language changes the label field', async ({ page }) => {
	const labels = labelsSection(page);
	await labels.locator('summary').click();

	const textField = async () => {
		const style = await getMapStyle(page);
		return JSON.stringify(
			style.layers.find((l) => l.id === 'label-place-city')?.layout?.['text-field']
		);
	};
	const before = await textField();
	await labels.locator('select').selectOption('de');
	await expect.poll(textField).not.toEqual(before);
	expect(await textField()).toContain('name_de');
});

test('"Only this language" is disabled for local names', async ({ page }) => {
	const labels = labelsSection(page);
	await labels.locator('summary').click();

	const strict = labels.locator('input[type="checkbox"]');
	await expect(strict).toBeDisabled();
	await labels.locator('select').selectOption('en');
	await expect(strict).toBeEnabled();
});
