import { test, expect } from '@playwright/test';
import { osm } from '@versatiles/style';
import { getMapStyle, openThemePicker, selectStyle } from './helpers';

/** The vector themes, in the order the style lists them: the styler offers every one. */
const THEMES: string[] = [...osm.palettes];
/** The palettes of this project; every other theme is a lookalike. */
const OWN = ['colorful', 'natural', 'muted', 'gray', 'toner'];

const button = '.maplibregl-versatiles-styler button.theme-button';

test.beforeEach(async ({ page }) => {
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('"colorful" is selected by default', async ({ page }) => {
	await expect(page.locator(button)).toHaveText(/colorful/);
	await expect(page.locator(button)).toHaveAccessibleName('Base style: colorful');
	const picker = await openThemePicker(page);
	await expect(picker.locator('input[type="radio"][value="colorful"]')).toBeChecked();

	const style = await getMapStyle(page);
	expect(style.name).toBe('versatiles-colorful');
});

test('the picker is closed until the button is clicked, and closes on Escape', async ({ page }) => {
	const picker = page.locator('.maplibregl-versatiles-styler .theme-picker');
	await expect(picker).toHaveCount(0);
	await expect(page.locator(button)).toHaveAttribute('aria-expanded', 'false');

	await page.locator(button).click();
	await expect(picker).toBeVisible();
	await expect(page.locator(button)).toHaveAttribute('aria-expanded', 'true');
	// the focus is on the current style, so the arrow keys start from it
	await expect(picker.locator('input[value="colorful"]')).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(picker).toHaveCount(0);
	await expect(page.locator(button)).toBeFocused();
});

test('lists every theme with its dark variant next to it', async ({ page }) => {
	const picker = await openThemePicker(page);
	const radios = picker.locator('input[type="radio"]');
	await expect(radios.last()).toHaveValue('satellite');
	const values = await radios.evaluateAll((inputs) =>
		inputs.map((input) => (input as HTMLInputElement).value)
	);
	expect(values).toEqual([...THEMES, 'satellite']);
});

test('groups the styles: own palettes as light and dark pairs, lookalikes, imagery', async ({
	page,
}) => {
	const picker = await openThemePicker(page);
	await expect(picker.locator('h5')).toHaveText(['Lookalikes', 'Imagery']);

	// a column per palette: the light theme above the dark one, the name below
	const pairs = picker.locator('.theme-pairs');
	await expect(pairs.locator('> .theme-caption')).toHaveText(OWN);
	const box = async (key: string) => {
		const rect = await pairs.locator(`label:has(input[value="${key}"])`).boundingBox();
		if (!rect) throw new Error(`no card for ${key}`);
		return rect;
	};
	const [light, dark, next] = [await box('gray'), await box('gray-dark'), await box('toner')];
	expect(dark.x).toBeCloseTo(light.x, 0);
	expect(dark.y).toBeGreaterThan(light.y);
	expect(next.y).toBeCloseTo(light.y, 0);
	expect(next.x).toBeGreaterThan(light.x);
	await expect(pairs.getByRole('radio', { name: 'gray dark' })).toHaveCount(1);

	// every other theme is a lookalike, named below its card
	const lookalikes = THEMES.filter((theme) => !OWN.includes(theme.replace(/-dark$/, '')));
	const grids = picker.locator('.theme-grid:not(.theme-pairs)');
	await expect(grids.nth(0).locator('.theme-caption')).toHaveText(lookalikes);
	await expect(grids.nth(1).locator('.theme-caption')).toHaveText(['satellite']);
});

test('every theme card is the same size, on the golden ratio', async ({ page }) => {
	const picker = await openThemePicker(page);
	const cards = picker.locator('.theme-card');
	// the satellite card only joins once its TileJSON has loaded
	await expect(cards).toHaveCount(THEMES.length + 1);
	const boxes = await cards.evaluateAll((nodes) =>
		nodes.map((node) => {
			const { x, width, height } = node.getBoundingClientRect();
			return { x, width, height };
		})
	);

	for (const box of boxes) {
		expect(box.width / box.height).toBeCloseTo(1.618, 1);
		expect(box.width).toBeCloseTo(boxes[0].width, 0);
		expect(box.height).toBeCloseTo(boxes[0].height, 0);
	}

	// five columns, shared by all three groups — and the satellite card starts a row
	const columns = [...new Set(boxes.map((box) => Math.round(box.x)))].sort((a, b) => a - b);
	expect(columns.length).toBe(5);
	expect(Math.round(boxes[boxes.length - 1].x)).toBe(columns[0]);
});

test('the style radios form one group', async ({ page }) => {
	await selectStyle(page, 'toner-dark');
	const radios = (await openThemePicker(page)).locator('input[type="radio"]');
	const checked = await radios.evaluateAll(
		(inputs) => inputs.filter((i) => (i as HTMLInputElement).checked).length
	);
	expect(checked).toBe(1);
	const names = await radios.evaluateAll(
		(inputs) => new Set(inputs.map((i) => (i as HTMLInputElement).name)).size
	);
	expect(names).toBe(1);
});

test('clicking another style selects it and closes the picker', async ({ page }) => {
	const picker = await openThemePicker(page);
	await picker.locator('label:has(input[value="muted"])').click();
	await expect(picker).toHaveCount(0);
	await expect(page.locator(button)).toHaveText(/muted/);
	await expect(page.locator(button)).toBeFocused();

	const reopened = await openThemePicker(page);
	await expect(reopened.locator('input[value="muted"]')).toBeChecked();
	await expect(reopened.locator('input[value="colorful"]')).not.toBeChecked();
});

test('the arrow keys change the style while the picker stays open; Enter closes it', async ({
	page,
}) => {
	const picker = await openThemePicker(page);
	await expect(picker.locator('input[value="colorful"]')).toBeFocused();

	await page.keyboard.press('ArrowRight');
	await expect(picker.locator('input[value="colorful-dark"]')).toBeChecked();
	await expect(picker).toBeVisible();
	await expect.poll(async () => (await getMapStyle(page)).name).toBe('versatiles-colorful-dark');
	await expect(page.locator(button)).toHaveText(/colorful-dark/);

	await page.keyboard.press('Enter');
	await expect(picker).toHaveCount(0);
	await expect(page.locator(button)).toBeFocused();
});

test('a dark theme without a light one gets the dark panel', async ({ page }) => {
	await selectStyle(page, 'fnord');
	await expect(page.locator('.maplibregl-map')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
	await expect(page.locator('.maplibregl-map.versatiles-styler-dark')).toHaveCount(1);
});

test('the map container is white for light themes, black for dark themes and satellite', async ({
	page,
}) => {
	const background = page.locator('.maplibregl-map');
	await expect(background).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await selectStyle(page, 'colorful-dark');
	await expect(background).toHaveCSS('background-color', 'rgb(0, 0, 0)');
	await selectStyle(page, 'toner');
	await expect(background).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await selectStyle(page, 'satellite');
	await expect(background).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test('style change updates map style', async ({ page }) => {
	const styleBefore = await getMapStyle(page);
	expect(styleBefore.name).toBe('versatiles-colorful');

	await selectStyle(page, 'toner-dark');

	await expect.poll(async () => (await getMapStyle(page)).name).toBe('versatiles-toner-dark');
	const styleAfter = await getMapStyle(page);

	// All themes share their layers; the paint differs.
	const paint = (style: typeof styleBefore) => style.layers.map((l) => JSON.stringify(l.paint));
	expect(paint(styleAfter)).not.toEqual(paint(styleBefore));
});

test('style change updates color inputs', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const firstColorInput = colorsDetails.locator('input.color-text').first();
	const colorfulValue = await firstColorInput.inputValue();

	await selectStyle(page, 'colorful-dark');

	await expect(firstColorInput).not.toHaveValue(colorfulValue);
});

test('individual colors are grouped', async ({ page }) => {
	const colorsDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colorsDetails.locator('summary').click();

	const groups = await colorsDetails.locator('.subsection-title').allTextContents();
	expect(groups).toEqual(expect.arrayContaining(['Base', 'Nature', 'Road', 'Label']));
});
