import { test, expect, type Page, type Locator } from '@playwright/test';

function section(page: Page, title: string): Locator {
	return page.locator(`.maplibregl-versatiles-styler details:has(summary:has-text("${title}"))`);
}

function row(scope: Locator, label: string): Locator {
	return scope.locator('.entry', { has: scope.page().locator(`label:text-is("${label}")`) });
}

async function hashConfig(page: Page): Promise<unknown> {
	const match = page.url().match(/config=([^&]+)/);
	if (!match) return {};
	return JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')));
}

test.beforeEach(async ({ page }) => {
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test.describe('typing a slider value', () => {
	test('click the value, type a number, press Enter', async ({ page }) => {
		const labels = section(page, 'Labels');
		await labels.locator('summary').click();
		const textScale = row(labels, 'Size');

		await textScale.locator('button.value').click();
		const field = textScale.locator('input.value-input');
		await expect(field).toBeFocused();
		await expect(field).toHaveValue('100');

		await page.keyboard.type('150'); // replaces the selected text
		await page.keyboard.press('Enter');
		await expect(field).toHaveCount(0);
		await expect(textScale.locator('button.value')).toHaveText('150%');
		await expect(textScale.locator('input[type="range"]')).toHaveValue('150');
		await expect.poll(() => hashConfig(page)).toEqual({ text: { scale: 1.5 } });
	});

	test('Escape cancels, leaving the field applies', async ({ page }) => {
		const icons = section(page, 'Icons');
		await icons.locator('summary').click();
		const iconScale = row(icons, 'Size');

		await iconScale.locator('button.value').click();
		await page.keyboard.type('250');
		await page.keyboard.press('Escape');
		await expect(iconScale.locator('button.value')).toHaveText('100%');

		await iconScale.locator('button.value').click();
		await page.keyboard.type('80');
		await iconScale.locator('input.value-input').blur();
		await expect(iconScale.locator('button.value')).toHaveText('80%');
		await expect.poll(() => hashConfig(page)).toEqual({ icon: { scale: 0.8 } });
	});

	test('invalid text keeps the value; numbers are clamped to the range', async ({ page }) => {
		const labels = section(page, 'Labels');
		await labels.locator('summary').click();
		const textScale = row(labels, 'Size');
		const value = textScale.locator('button.value');

		await value.click();
		await page.keyboard.type('abc');
		await page.keyboard.press('Enter');
		await expect(value).toHaveText('100%');

		await value.click();
		await page.keyboard.type('999%');
		await page.keyboard.press('Enter');
		await expect(value).toHaveText('300%');
	});

	test('logarithmic sliders take typed values, with a decimal comma', async ({ page }) => {
		const recolor = section(page, 'Color adjustments');
		await recolor.locator('summary').click();
		const gamma = row(recolor, 'Gamma');

		await gamma.locator('button.value').click();
		await page.keyboard.type('2,5');
		await page.keyboard.press('Enter');
		await expect(gamma.locator('button.value')).toHaveText('2.5');
		await expect.poll(() => hashConfig(page)).toEqual({ recolor: { gamma: 2.5 } });
	});

	test('layer opacity can be typed', async ({ page }) => {
		const layers = section(page, 'Layers');
		await layers.locator('summary').click();
		const roads = row(layers, 'Roads');

		await roads.locator('button.value').click();
		await page.keyboard.type('42');
		await page.keyboard.press('Enter');
		await expect(roads.locator('button.value')).toHaveText('42%');
		await expect.poll(() => hashConfig(page)).toEqual({ layers: { roads: 0.42 } });
	});

	test('the value button is keyboard accessible and names its setting', async ({ page }) => {
		const labels = section(page, 'Labels');
		await labels.locator('summary').click();
		const button = labels.getByRole('button', { name: 'Spacing: 100%. Enter a value' });
		await button.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('textbox', { name: 'Spacing' })).toBeFocused();
	});
});
