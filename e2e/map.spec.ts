import { test, expect, type Page, type Locator } from '@playwright/test';
import { getMapStyle } from './helpers';

function section(page: Page, title: string): Locator {
	return page.locator(
		`.maplibregl-versatiles-styler details:has(summary .section-title:text-is("${title}"))`
	);
}

function row(scope: Locator, label: string): Locator {
	return scope.locator('.entry', { has: scope.page().locator(`label:text-is("${label}")`) });
}

type FullStyle = { projection?: unknown; sky?: Record<string, unknown>; light?: unknown };

async function style(page: Page): Promise<FullStyle> {
	return (await getMapStyle(page)) as unknown as FullStyle;
}

async function hashConfig(page: Page): Promise<unknown> {
	const match = page.url().match(/config=([^&]+)/);
	if (!match) return {};
	return JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/')));
}

async function setRange(range: Locator, value: number) {
	await range.fill(String(value));
	await range.dispatchEvent('change');
}

async function setColor(input: Locator, value: string) {
	await input.fill(value);
	await input.dispatchEvent('change');
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
	await section(page, 'Map').locator('summary').click();
});

test('projection', async ({ page }) => {
	const map = section(page, 'Map');
	await expect(row(map, 'Projection').locator('select')).toHaveValue('globe');
	await row(map, 'Projection').locator('select').selectOption('mercator');
	await expect.poll(async () => (await style(page)).projection).toEqual({ type: 'mercator' });
	await expect.poll(() => hashConfig(page)).toEqual({ projection: 'mercator' });
});

test('sky can be turned off', async ({ page }) => {
	const map = section(page, 'Map');
	expect((await style(page)).sky).toBeDefined();
	await row(map, 'Sky').locator('input[type="checkbox"]').uncheck();
	await expect.poll(async () => (await style(page)).sky).toBeUndefined();
	await expect(row(map, 'Horizon Color')).toHaveCount(0);
	await expect.poll(() => hashConfig(page)).toEqual({ sky: false });
});

test('sky color follows the water color until it is set', async ({ page }) => {
	const map = section(page, 'Map');
	const skyColor = row(map, 'Sky Color');
	await expect(skyColor.locator('input[type="color"]')).toHaveValue('#bfd9f2');

	await setColor(skyColor.locator('input[type="color"]'), '#ff0000');
	await expect.poll(async () => (await style(page)).sky?.['sky-color']).toBe('#ff0000');
	await expect.poll(() => hashConfig(page)).toEqual({ sky: { skyColor: '#ff0000' } });

	await skyColor.locator('.input > button').click();
	await expect.poll(async () => (await style(page)).sky?.['sky-color']).toBe('#BFD9F2');
	await expect.poll(() => hashConfig(page)).toEqual({});
});

test('sky blends', async ({ page }) => {
	const map = section(page, 'Map');
	await setRange(row(map, 'Fog/Ground Blend').locator('input[type="range"]'), 20);
	await expect.poll(async () => (await style(page)).sky?.['fog-ground-blend']).toBe(0.2);
	await expect.poll(() => hashConfig(page)).toEqual({ sky: { fogGroundBlend: 0.2 } });
});

test('sun', async ({ page }) => {
	const map = section(page, 'Map');
	expect((await style(page)).light).toBeUndefined();
	await expect(row(map, 'Direction')).toHaveCount(0);

	await row(map, 'Sun').locator('input[type="checkbox"]').check();
	await expect.poll(() => hashConfig(page)).toEqual({ sun: true });

	await setRange(row(map, 'Direction').locator('input[type="range"]'), 90);
	await setRange(row(map, 'Intensity').locator('input[type="range"]'), 80);
	await expect
		.poll(async () => (await style(page)).light)
		.toMatchObject({ position: [1.15, 90, 30], color: '#ffffff', intensity: 0.8 });
	await expect.poll(() => hashConfig(page)).toEqual({ sun: { direction: 90, intensity: 0.8 } });

	await row(map, 'Intensity').locator('.input > button').click();
	await expect.poll(() => hashConfig(page)).toEqual({ sun: { direction: 90 } });
});
