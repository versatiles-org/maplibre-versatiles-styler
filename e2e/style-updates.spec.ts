import { test, expect, type Page } from '@playwright/test';

/**
 * Style changes go through MapLibre's style diff, which keeps the loaded tiles and repaints in place.
 * These tests check that a diffed map looks the same as a map loaded fresh with the same options, and
 * that the changes MapLibre cannot diff are applied as full reloads (`src/lib/style_update.ts`).
 */

type UpdatesWindow = Window & {
	__setStyle: { diff?: boolean; validate?: boolean }[];
	__diffWarnings: string[];
	_map: {
		loaded(): boolean;
		once(type: string, listener: () => void): void;
		getStyle(): { transition?: unknown };
	};
};

const VIEW = 'map=13/52.52/13.405';
// The map, clear of the sidebar on the left and the controls on the right.
const CLIP = { x: 420, y: 100, width: 760, height: 520 };

function hashFor(options: { style?: string; config?: object }): string {
	const parts = [VIEW];
	if (options.style) parts.push(`style=${options.style}`);
	if (options.config) {
		parts.push(`config=${Buffer.from(JSON.stringify(options.config)).toString('base64url')}`);
	}
	return '#' + parts.join('&');
}

async function record(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as UpdatesWindow;
		w.__setStyle = [];
		w.__diffWarnings = [];
		const warn = console.warn;
		console.warn = (...args: unknown[]) => {
			if (String(args[0]).includes('style diff')) w.__diffWarnings.push(String(args[0]));
			warn(...args);
		};
		let lib: { Map: { prototype: { setStyle: (...args: unknown[]) => unknown } } } | undefined;
		Object.defineProperty(window, 'maplibregl', {
			configurable: true,
			get: () => lib,
			set: (value) => {
				lib = value;
				const setStyle = value.Map.prototype.setStyle;
				value.Map.prototype.setStyle = function (
					style: unknown,
					options?: { diff?: boolean; validate?: boolean }
				) {
					w.__setStyle.push({ diff: options?.diff, validate: options?.validate });
					return setStyle.call(this, style, options);
				};
			},
		});
	});
}

/** Waits for the `count`-th `setStyle`, the map to be idle after it, and symbols to fade in. */
async function settle(page: Page, count: number) {
	await page.waitForFunction(
		(n) => (window as unknown as UpdatesWindow).__setStyle.length >= n,
		count
	);
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				const map = (window as unknown as UpdatesWindow)._map;
				if (map.loaded()) resolve();
				else map.once('idle', () => resolve());
			})
	);
	await page.waitForTimeout(1000);
}

async function setStyleCalls(page: Page) {
	return page.evaluate(() => (window as unknown as UpdatesWindow).__setStyle);
}

async function diffWarnings(page: Page) {
	return page.evaluate(() => (window as unknown as UpdatesWindow).__diffWarnings);
}

/** Loads the base view, then applies `hash` as a change to the running map. */
async function edit(page: Page, hash: string) {
	await record(page);
	await page.goto('/' + `#${VIEW}`);
	await settle(page, 1);
	await page.evaluate((h) => (location.hash = h), hash);
	await settle(page, 2);
}

/** Share of pixels that differ clearly between two PNG screenshots. */
async function differingPixels(page: Page, a: Buffer, b: Buffer): Promise<number> {
	return page.evaluate(
		async ([pngA, pngB]) => {
			const read = async (base64: string) => {
				const image = new Image();
				image.src = `data:image/png;base64,${base64}`;
				await image.decode();
				const canvas = new OffscreenCanvas(image.width, image.height);
				const context = canvas.getContext('2d')!;
				context.drawImage(image, 0, 0);
				return context.getImageData(0, 0, image.width, image.height).data;
			};
			const [x, y] = await Promise.all([read(pngA), read(pngB)]);
			let differing = 0;
			for (let i = 0; i < x.length; i += 4) {
				const d = Math.max(
					Math.abs(x[i] - y[i]),
					Math.abs(x[i + 1] - y[i + 1]),
					Math.abs(x[i + 2] - y[i + 2])
				);
				if (d > 40) differing++;
			}
			return differing / (x.length / 4);
		},
		[a.toString('base64'), b.toString('base64')]
	);
}

const DIFFED: [string, { style?: string; config?: object }][] = [
	['a recolor', { config: { recolor: { rotateHue: 180 } } }],
	['a color', { config: { colors: { water: '#ff0000' } } }],
	['hidden labels', { config: { layers: { labels: false } } }],
	['a font', { config: { text: { fonts: 'fira_sans_regular' } } }],
	['hillshade', { config: { features: { hillshade: true } } }],
	['a theme', { style: 'colorful-dark' }],
	['satellite', { style: 'satellite' }],
];

test.describe('style updates', () => {
	for (const [name, options] of DIFFED) {
		test(`${name} is diffed and looks like a fresh load`, async ({ browser, page }) => {
			await edit(page, hashFor(options));
			expect(await setStyleCalls(page)).toEqual([
				{ diff: false, validate: false },
				{ diff: true, validate: false },
			]);
			expect(await diffWarnings(page)).toEqual([]);
			const edited = await page.screenshot({ clip: CLIP });

			const fresh = await browser.newPage();
			await record(fresh);
			await fresh.goto('/' + hashFor(options));
			await settle(fresh, 1);
			const reference = await fresh.screenshot({ clip: CLIP });

			expect(await differingPixels(fresh, edited, reference)).toBeLessThan(0.005);
			await fresh.close();
		});
	}

	test('a color edit is final in the first frames: no paint transition', async ({ page }) => {
		await record(page);
		await page.goto('/' + `#${VIEW}`);
		await settle(page, 1);
		expect(
			await page.evaluate(() => (window as unknown as UpdatesWindow)._map.getStyle().transition)
		).toEqual({
			duration: 0,
			delay: 0,
		});

		await page.evaluate(
			(h) => (location.hash = h),
			hashFor({ config: { recolor: { rotateHue: 180 } } })
		);
		await page.waitForFunction(() => (window as unknown as UpdatesWindow).__setStyle.length >= 2);
		// Two animation frames after setStyle: with MapLibre's default 300 ms transition, the colors
		// would still be on their way here.
		await page.evaluate(
			() =>
				new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				)
		);
		const early = await page.screenshot({ clip: CLIP });
		await settle(page, 2);
		const final = await page.screenshot({ clip: CLIP });
		expect(await differingPixels(page, early, final)).toBeLessThan(0.005);
	});

	test('terrain is applied as a full reload', async ({ page }) => {
		await edit(page, hashFor({ config: { features: { terrain: true } } }));
		expect(await setStyleCalls(page)).toEqual([
			{ diff: false, validate: false },
			{ diff: false, validate: false },
		]);
		expect(await diffWarnings(page)).toEqual([]);
	});

	test('a new origin is applied as a full reload', async ({ page }) => {
		await record(page);
		await page.goto('/' + `#${VIEW}`);
		await settle(page, 1);
		const origin = page.locator(
			'.maplibregl-versatiles-styler details:has(summary:has-text("Origin"))'
		);
		await origin.locator('summary').click();
		const input = origin.locator('input[type="text"]');
		await input.fill('https://tiles.versatiles.org/');
		await input.dispatchEvent('change');
		await settle(page, 2);
		expect(await setStyleCalls(page)).toEqual([
			{ diff: false, validate: false },
			{ diff: false, validate: false },
		]);
	});
});
