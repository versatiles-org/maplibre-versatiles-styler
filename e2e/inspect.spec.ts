import { test, expect, type Page } from '@playwright/test';
import { getMapStyle } from './helpers';

/** The point of a label the map is drawing, which is a feature every style has. */
async function labelPoint(page: Page): Promise<{ x: number; y: number; id: string }> {
	return page.evaluate(() => {
		const map = (
			window as unknown as {
				_map: {
					queryRenderedFeatures(): {
						layer: { id: string; type: string };
						geometry: { type: string; coordinates: [number, number] };
					}[];
					project(coordinates: [number, number]): { x: number; y: number };
				};
			}
		)._map;
		for (const feature of map.queryRenderedFeatures()) {
			if (feature.layer.type !== 'symbol' || feature.geometry.type !== 'Point') continue;
			const point = map.project(feature.geometry.coordinates);
			// Clear of the sidebar and of the window's edges, so the click lands on the map.
			if (point.x > 380 && point.x < 1100 && point.y > 80 && point.y < 600) {
				return { x: Math.round(point.x), y: Math.round(point.y), id: feature.layer.id };
			}
		}
		throw new Error('no label on screen to click');
	});
}

async function inspectAt(page: Page, point: { x: number; y: number }) {
	await page.getByRole('button', { name: 'Inspect the map' }).click();
	await page.mouse.click(point.x, point.y);
	await expect(page.locator('.inspect-popup')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/#map=12/52.52/13.40&panel=open&style=colorful');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
	await getMapStyle(page);
	// The layers can only be hit once they are drawn.
	await page.waitForFunction(() =>
		(window as unknown as { _map: { loaded(): boolean } })._map.loaded()
	);
});

test('the inspector is off until it is turned on', async ({ page }) => {
	const button = page.getByRole('button', { name: 'Inspect the map' });
	await expect(button).toHaveAttribute('aria-pressed', 'false');
	await page.mouse.click(800, 400);
	await expect(page.locator('.inspect-popup')).toHaveCount(0);

	await button.click();
	await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('a click names the layer, its group and the source layer it came from', async ({ page }) => {
	const label = await labelPoint(page);
	await inspectAt(page, label);

	const popup = page.locator('.inspect-popup');
	// The style layer's own ID, so the same layer can be found in an exported style.json.
	await expect(popup.locator('.inspect-meta code').first()).toHaveText(label.id);
	await expect(popup.locator('.inspect-title').first()).toContainText('›');
	// A label layer says which topic of the Labels section styles its text.
	await expect(popup.locator('.inspect-note').first()).toContainText('in Labels');
});

test('the feature properties are listed by name', async ({ page }) => {
	const label = await labelPoint(page);
	await inspectAt(page, label);

	await page.locator('.inspect-popup .inspect-properties summary').first().click();
	const names = await page
		.locator('.inspect-popup .inspect-properties')
		.first()
		.locator('dt')
		.allInnerTexts();
	expect(names.length).toBeGreaterThan(1);
	expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});

test('the color of what was clicked can be changed in the popup', async ({ page }) => {
	const label = await labelPoint(page);
	await inspectAt(page, label);

	const field = page.locator('.inspect-popup input.color-text').first();
	await field.fill('#ff0000');
	await field.press('Enter');

	// The map is rebuilt with it: the color reaches a layer, not just the field.
	await expect
		.poll(async () => {
			const style = await getMapStyle(page);
			return style.layers.some((layer) =>
				Object.entries(layer.paint ?? {}).some(
					([property, value]) =>
						property.includes('color') && JSON.stringify(value).includes('255,0,0')
				)
			);
		})
		.toBe(true);
});

test('a layer group can be hidden from the popup', async ({ page }) => {
	const label = await labelPoint(page);
	await inspectAt(page, label);

	const layerId = await page.locator('.inspect-popup .inspect-meta code').first().innerText();
	await page.locator('.inspect-popup .eye').first().click();

	await expect
		.poll(async () => {
			const style = await getMapStyle(page);
			return style.layers.some((layer) => layer.id === layerId);
		})
		.toBe(false);
});

test('the inspector works with the style editor closed', async ({ page }) => {
	// It is a map tool of its own: it sits in its own control group and needs no pane.
	const label = await labelPoint(page);
	await page.getByRole('button', { name: 'Inspect the map' }).click();
	await page.getByRole('button', { name: 'Close the style editor' }).click();
	await expect(page.locator('.maplibregl-pane')).toHaveCount(0);

	await page.mouse.click(label.x, label.y);
	await expect(page.locator('.inspect-popup')).toBeVisible();
});

test('turning the inspector off closes the popup', async ({ page }) => {
	const label = await labelPoint(page);
	await inspectAt(page, label);

	await page.getByRole('button', { name: 'Inspect the map' }).click();
	await expect(page.locator('.inspect-popup')).toHaveCount(0);
});

test('the popup closes on Escape', async ({ page }) => {
	const label = await labelPoint(page);
	await inspectAt(page, label);

	await page.keyboard.press('Escape');
	await expect(page.locator('.inspect-popup')).toHaveCount(0);
});
