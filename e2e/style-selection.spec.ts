import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

test.beforeEach(async ({ page }) => {
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('"colorful" is selected by default', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const colorfulRadio = styleList.locator('input[type="radio"][value="colorful"]');
	await expect(colorfulRadio).toBeChecked();

	const style = await getMapStyle(page);
	expect(style.name).toBe('versatiles-colorful');
});

test('lists every theme with its dark variant next to it', async ({ page }) => {
	const radios = page.locator('.maplibregl-versatiles-styler .style-list input[type="radio"]');
	await expect(radios.last()).toHaveValue('satellite');
	const values = await radios.evaluateAll((inputs) =>
		inputs.map((input) => (input as HTMLInputElement).value)
	);
	expect(values).toEqual([
		'colorful',
		'colorful-dark',
		'natural',
		'natural-dark',
		'muted',
		'muted-dark',
		'gray',
		'gray-dark',
		'toner',
		'toner-dark',
		'satellite',
	]);
});

test('shows the themes as a table: name, light, dark', async ({ page }) => {
	const table = page.locator('.maplibregl-versatiles-styler .style-list table');
	await expect(table.locator('thead th')).toHaveText(['light', 'dark']);
	await expect(table.locator('tbody th[scope="row"]')).toHaveText([
		'colorful',
		'natural',
		'muted',
		'gray',
		'toner',
		'satellite',
	]);

	const row = table.locator('tbody tr', { has: page.locator('th:text-is("gray")') });
	await expect(row.locator('td').nth(0).locator('input[type="radio"]')).toHaveValue('gray');
	await expect(row.locator('td').nth(1).locator('input[type="radio"]')).toHaveValue('gray-dark');
	await expect(row.getByRole('radio', { name: 'gray dark' })).toHaveCount(1);

	// satellite has no dark variant: its card sits in the light column, the dark cell stays empty
	const satelliteRow = table.locator('tbody tr', { has: page.locator('th:text-is("satellite")') });
	await expect(satelliteRow.locator('td').nth(0).locator('input[type="radio"]')).toHaveValue(
		'satellite'
	);
	await expect(satelliteRow.locator('td').nth(1).locator('label')).toHaveCount(0);
});

test('every theme card is the same size, on the golden ratio', async ({ page }) => {
	const cards = page.locator('.maplibregl-versatiles-styler .style-list .theme-card');
	// the satellite card only joins once its TileJSON has loaded
	await expect(cards).toHaveCount(11);
	const boxes = await cards.evaluateAll((nodes) =>
		nodes.map((node) => {
			const { x, width, height } = node.getBoundingClientRect();
			return { x, width, height };
		})
	);

	for (const box of boxes) {
		expect(box.width / box.height).toBeCloseTo(1.618, 2);
		expect(box.width).toBeCloseTo(boxes[0].width, 1);
		expect(box.height).toBeCloseTo(boxes[0].height, 1);
	}

	// two columns, so two distinct left edges — and the satellite card shares the light one
	const columns = [...new Set(boxes.map((box) => Math.round(box.x)))].sort((a, b) => a - b);
	expect(columns.length).toBe(2);
	expect(Math.round(boxes[boxes.length - 1].x)).toBe(columns[0]);
});

test('the style radios form one group', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="toner-dark"])').click();
	const checked = await styleList
		.locator('input[type="radio"]')
		.evaluateAll((inputs) => inputs.filter((i) => (i as HTMLInputElement).checked).length);
	expect(checked).toBe(1);
	const names = await styleList
		.locator('input[type="radio"]')
		.evaluateAll((inputs) => new Set(inputs.map((i) => (i as HTMLInputElement).name)).size);
	expect(names).toBe(1);
});

test('clicking another style changes selection', async ({ page }) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const colorfulRadio = styleList.locator('input[type="radio"][value="colorful"]');
	const mutedRadio = styleList.locator('input[type="radio"][value="muted"]');

	await expect(colorfulRadio).toBeChecked();
	await styleList.locator('label:has(input[value="muted"])').click();
	await expect(mutedRadio).toBeChecked();
	await expect(colorfulRadio).not.toBeChecked();
});

test('the map container is white for light themes, black for dark themes and satellite', async ({
	page,
}) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	const background = page.locator('.maplibregl-map');
	await expect(background).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await styleList.locator('label:has(input[value="colorful-dark"])').click();
	await expect(background).toHaveCSS('background-color', 'rgb(0, 0, 0)');
	await styleList.locator('label:has(input[value="toner"])').click();
	await expect(background).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await styleList.locator('label:has(input[value="satellite"])').click();
	await expect(background).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test('style change updates map style', async ({ page }) => {
	const styleBefore = await getMapStyle(page);
	expect(styleBefore.name).toBe('versatiles-colorful');

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="toner-dark"])').click();

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

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="colorful-dark"])').click();

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
