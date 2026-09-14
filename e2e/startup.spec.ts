import { test, expect, type Page } from '@playwright/test';
import { getMapStyle } from './helpers';

type StartupWindow = Window & {
	__setStyleCalls: string[];
	_map: { loaded(): boolean; once(type: string, listener: () => void): void };
};

/** Records every `map.setStyle()` by style name, from before the demo creates its map. */
async function recordSetStyle(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as StartupWindow & { maplibregl?: unknown };
		w.__setStyleCalls = [];
		let lib: { Map: { prototype: { setStyle: (...args: unknown[]) => unknown } } } | undefined;
		Object.defineProperty(window, 'maplibregl', {
			configurable: true,
			get: () => lib,
			set: (value) => {
				lib = value;
				const setStyle = value.Map.prototype.setStyle;
				value.Map.prototype.setStyle = function (style: { name?: string }, ...rest: unknown[]) {
					w.__setStyleCalls.push(style?.name ?? '');
					return setStyle.call(this, style, ...rest);
				};
			},
		});
	});
}

async function setStyleCallsUntilIdle(page: Page): Promise<string[]> {
	await page.waitForFunction(
		() => (window as unknown as StartupWindow).__setStyleCalls?.length > 0
	);
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				const map = (window as unknown as StartupWindow)._map;
				if (map.loaded()) resolve();
				else map.once('idle', () => resolve());
			})
	);
	return page.evaluate(() => (window as unknown as StartupWindow).__setStyleCalls);
}

function encodeConfig(config: unknown): string {
	return Buffer.from(JSON.stringify(config)).toString('base64url');
}

test.describe('startup', () => {
	test('sets the style exactly once before the map is idle', async ({ page }) => {
		await recordSetStyle(page);
		await page.goto('/');
		expect(await setStyleCallsUntilIdle(page)).toEqual(['versatiles-colorful']);
	});

	test('loads the TileJSONs in parallel and nothing else before the first style', async ({
		page,
	}) => {
		const requested: string[] = [];
		page.on('request', (request) => {
			const path = new URL(request.url()).pathname;
			if (/tiles\.json|index\.json/.test(path)) requested.push(path);
		});
		await recordSetStyle(page);
		await page.goto('/');
		await setStyleCallsUntilIdle(page);
		expect(requested.sort()).toEqual([
			'/tiles/elevation/tiles.json',
			'/tiles/osm/tiles.json',
			'/tiles/satellite/tiles.json',
		]);
	});

	test('opens a satellite link without switching style on the way', async ({ page }) => {
		await recordSetStyle(page);
		await page.goto('/#map=5/50/10&style=satellite');
		expect(await setStyleCallsUntilIdle(page)).toEqual(['versatiles-satellite']);
	});

	test('opens a link with terrain in one go', async ({ page }) => {
		await recordSetStyle(page);
		await page.goto(`/#map=5/50/10&config=${encodeConfig({ features: { terrain: true } })}`);
		expect(await setStyleCallsUntilIdle(page)).toEqual(['versatiles-colorful']);
		const style = await getMapStyle(page);
		expect(style).toHaveProperty('terrain');
	});

	test('maps a v5 style key to its theme', async ({ page }) => {
		await recordSetStyle(page);
		await page.goto('/#map=5/50/10&style=eclipse');
		expect(await setStyleCallsUntilIdle(page)).toEqual(['versatiles-colorful-dark']);
		await expect(page).toHaveURL(/style=colorful-dark/);
	});

	test('falls back to the theme defaults for a v5 config', async ({ page }) => {
		await recordSetStyle(page);
		await page.goto(`/#map=5/50/10&style=graybeard&config=${encodeConfig({ textScale: 2 })}`);
		expect(await setStyleCallsUntilIdle(page)).toEqual(['versatiles-gray']);
		await expect(page).toHaveURL(/style=gray(&|$)/);
		await expect(page).not.toHaveURL(/config=/);
	});

	test('keeps options in the hash across a reload', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
		const recolorDetails = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:has-text("Color adjustments"))'
		);
		await recolorDetails.locator('summary').click();
		const hueSlider = recolorDetails.locator('input[type="range"]').first();
		await hueSlider.fill('90');
		await hueSlider.dispatchEvent('change');
		await expect(page).toHaveURL(/config=/);

		const styleBefore = await getMapStyle(page);
		await page.reload();
		await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
		await expect(recolorDetails.locator('input[type="range"]').first()).toHaveValue('90');
		const styleAfter = await getMapStyle(page);
		expect(styleAfter.layers.map((l) => l.paint)).toEqual(styleBefore.layers.map((l) => l.paint));
	});
});
