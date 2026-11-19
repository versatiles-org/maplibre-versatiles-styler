import { test, expect, type Page } from '@playwright/test';
import { getMapStyle } from './helpers';

const styler = '.maplibregl-versatiles-styler';

function bar(page: Page) {
	return page.locator(`${styler} .styler-quickbar`);
}

function card(page: Page, name: string) {
	return bar(page).getByRole('radio', { name, exact: true });
}

const styleName = async (page: Page) => (await getMapStyle(page)).name;

test('without the option, the closed styler is the single button', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator(`${styler} button.maplibregl-ctrl-icon`)).toBeVisible();
	await expect(bar(page)).toHaveCount(0);
});

test.describe('with the default styles', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/?quick');
		await bar(page).waitFor();
	});

	test('shows light, dark and satellite, and a button for the editor', async ({ page }) => {
		const radios = bar(page).getByRole('radio');
		await expect(radios).toHaveCount(3);
		await expect(card(page, 'colorful')).toBeChecked();
		await expect(card(page, 'colorful dark')).toBeAttached();
		await expect(card(page, 'satellite')).toBeEnabled();
		await expect(bar(page).getByRole('button', { name: 'Open the style editor' })).toBeVisible();
		// the bar stands for the closed styler: no editor button and no inspector beside it
		await expect(page.locator(`${styler} .styler-buttons`)).toHaveCount(0);
	});

	test('a click on a style puts it on the map', async ({ page }) => {
		await bar(page).locator('label[title="colorful dark"]').click();
		await expect(card(page, 'colorful dark')).toBeChecked();
		await expect.poll(() => styleName(page)).toBe('versatiles-colorful-dark');
		await expect(page.locator('.maplibregl-map.versatiles-styler-dark')).toHaveCount(1);

		await bar(page).locator('label[title="satellite"]').click();
		await expect.poll(() => styleName(page)).toBe('versatiles-satellite');
	});

	test('the arrow keys move through the styles', async ({ page }) => {
		await card(page, 'colorful').focus();
		await page.keyboard.press('ArrowRight');
		await expect(card(page, 'colorful dark')).toBeChecked();
		await expect(card(page, 'colorful dark')).toBeFocused();
		await expect.poll(() => styleName(page)).toBe('versatiles-colorful-dark');
	});

	test('the editor button opens the sidebar in its place, and closing it brings the bar back', async ({
		page,
	}) => {
		await bar(page).getByRole('button', { name: 'Open the style editor' }).click();
		const pane = page.locator(`${styler} .maplibregl-pane`);
		await expect(pane).toBeVisible();
		await expect(bar(page)).toHaveCount(0);
		// the focus goes to the button that took the place of the one clicked
		await expect(page.locator(`${styler} button.maplibregl-ctrl-icon`)).toBeFocused();

		await page.getByRole('button', { name: 'Close the style editor' }).click();
		await expect(pane).toHaveCount(0);
		await expect(bar(page).getByRole('button', { name: 'Open the style editor' })).toBeFocused();
	});

	test('a style chosen in the sidebar shows in the bar, or none when it has no button', async ({
		page,
	}) => {
		await bar(page).getByRole('button', { name: 'Open the style editor' }).click();
		await page.locator(`${styler} button.theme-button`).click();
		await page.locator(`${styler} .theme-picker label:has(input[value="gray"])`).click();
		await page.getByRole('button', { name: 'Close the style editor' }).click();
		await expect(bar(page).getByRole('radio', { checked: true })).toHaveCount(0);
		await expect.poll(() => styleName(page)).toBe('versatiles-gray');
	});

	test('closing the sidebar into the bar ends the inspection', async ({ page }) => {
		await bar(page).getByRole('button', { name: 'Open the style editor' }).click();
		const inspect = page.getByRole('button', { name: 'Inspect the map' });
		await inspect.click();
		await expect(inspect).toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Close the style editor' }).click();
		await bar(page).getByRole('button', { name: 'Open the style editor' }).click();
		await expect(inspect).toHaveAttribute('aria-pressed', 'false');
	});
});

test('a list names the styles of the bar, in its order', async ({ page }) => {
	await page.goto('/?quick=gray-dark,gray,nonexistent');
	await bar(page).waitFor();
	const names = await bar(page)
		.getByRole('radio')
		.evaluateAll((inputs) => inputs.map((input) => input.getAttribute('value')));
	expect(names).toEqual(['gray-dark', 'gray']);
});
