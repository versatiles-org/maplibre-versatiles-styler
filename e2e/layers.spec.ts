import { test, expect, type Page, type Locator } from '@playwright/test';
import { getMapStyle } from './helpers';

function section(page: Page, title: string): Locator {
	return page.locator(`.maplibregl-versatiles-styler details:has(summary:has-text("${title}"))`);
}

function row(scope: Locator, label: string): Locator {
	return scope.locator('.entry', { has: scope.page().locator(`label:text-is("${label}")`) });
}

async function layer(page: Page, id: string) {
	const style = await getMapStyle(page);
	return style.layers.find((l) => l.id === id);
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

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test.describe('layers', () => {
	test('lists the layer groups, with sub-groups behind expanders', async ({ page }) => {
		const layers = section(page, 'Layers');
		await layers.locator('summary').click();
		for (const label of ['Land', 'Water', 'Roads', 'Buildings', 'POIs', 'Labels']) {
			await expect(row(layers, label)).toHaveCount(1);
		}
		await expect(row(layers, 'Motorways')).toHaveCount(0);
		await row(layers, 'Roads').locator('button.expander').click();
		await expect(row(layers, 'Motorways')).toHaveCount(1);
		await row(layers, 'Streets').locator('button.expander').click();
		await expect(row(layers, 'Residential')).toHaveCount(1);
	});

	test('hiding a group removes its layers and stores it compactly', async ({ page }) => {
		const layers = section(page, 'Layers');
		await layers.locator('summary').click();
		expect(await layer(page, 'label-place-city')).toBeDefined();

		await row(layers, 'Labels').locator('input[type="checkbox"]').uncheck();
		await expect.poll(() => layer(page, 'label-place-city')).toBeUndefined();
		expect(await layer(page, 'street-motorway')).toBeDefined();
		await expect.poll(() => hashConfig(page)).toEqual({ layers: { labels: false } });
	});

	test('fading a group bakes the opacity into its layers', async ({ page }) => {
		const layers = section(page, 'Layers');
		await layers.locator('summary').click();
		const before = JSON.stringify((await layer(page, 'street-motorway'))?.paint);

		await setRange(row(layers, 'Roads').locator('input[type="range"]'), 50);
		await expect
			.poll(async () => JSON.stringify((await layer(page, 'street-motorway'))?.paint))
			.not.toEqual(before);
		await expect(row(layers, 'Roads').locator('.value')).toHaveText('50%');
		await expect.poll(() => hashConfig(page)).toEqual({ layers: { roads: 0.5 } });
	});

	test('a changed sub-group makes its parent mixed; reset restores it', async ({ page }) => {
		const layers = section(page, 'Layers');
		await layers.locator('summary').click();
		const roads = row(layers, 'Roads');
		await roads.locator('button.expander').click();
		await row(layers, 'Motorways').locator('input[type="checkbox"]').uncheck();

		const roadsCheckbox = roads.locator('input[type="checkbox"]');
		await expect
			.poll(() => roadsCheckbox.evaluate((el) => (el as HTMLInputElement).indeterminate))
			.toBe(true);
		await expect(roads.locator('.value')).toHaveText('—');
		await expect.poll(() => layer(page, 'street-motorway')).toBeUndefined();

		await roads.locator('button.reset').click();
		await expect.poll(() => layer(page, 'street-motorway')).toBeDefined();
		await expect(roadsCheckbox).toBeChecked();
		await expect.poll(() => hashConfig(page)).toEqual({});
	});

	test('3D buildings extrude the buildings', async ({ page }) => {
		const layers = section(page, 'Layers');
		await layers.locator('summary').click();
		expect(await layer(page, 'building-3d')).toBeUndefined();

		await row(layers, '3D buildings').locator('input[type="checkbox"]').check();
		await expect.poll(async () => (await layer(page, 'building-3d'))?.type).toBe('fill-extrusion');
		await expect.poll(() => hashConfig(page)).toEqual({ features: { buildings: 'extruded' } });
	});
});

test.describe('label style', () => {
	test('spacing and tilt of line labels', async ({ page }) => {
		const labels = section(page, 'Labels');
		await labels.locator('summary').click();

		await setRange(row(labels, 'Spacing').locator('input[type="range"]'), 200);
		await expect
			.poll(async () => (await layer(page, 'label-street-residential'))?.layout?.['symbol-spacing'])
			.toBe(500);

		await row(labels, 'Tilted line labels').getByRole('radio', { name: 'Upright' }).click();
		await expect
			.poll(
				async () =>
					(await layer(page, 'label-street-residential'))?.layout?.['text-pitch-alignment']
			)
			.toBe('viewport');
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ text: { spacing: 2, pitchAlignment: 'viewport' } });
	});
});

test.describe('terrain & hillshade', () => {
	test('terrain exaggeration', async ({ page }) => {
		const elevation = section(page, 'Terrain & hillshade');
		await elevation.locator('summary').click();
		await expect(row(elevation, 'Exaggeration')).toHaveCount(0);

		await row(elevation, 'Terrain').locator('input[type="checkbox"]').check();
		await setRange(row(elevation, 'Exaggeration').locator('input[type="range"]'), 200);
		await expect
			.poll(async () => (await getMapStyle(page)) as unknown as { terrain?: unknown })
			.toMatchObject({ terrain: { exaggeration: 2 } });
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ features: { terrain: { exaggeration: 2 } } });
	});

	test('hillshade details', async ({ page }) => {
		const elevation = section(page, 'Terrain & hillshade');
		await elevation.locator('summary').click();

		await row(elevation, 'Hillshade').locator('input[type="checkbox"]').check();
		await expect.poll(() => hashConfig(page)).toEqual({ features: { hillshade: true } });

		const shadow = row(elevation, 'Shadow Color').locator('input.color-text');
		await shadow.fill('#ff0000');
		await shadow.press('Enter');
		await row(elevation, 'Light Source').getByRole('radio', { name: 'Screen' }).click();

		await expect
			.poll(async () => (await layer(page, 'hillshade'))?.paint)
			.toMatchObject({
				'hillshade-shadow-color': 'rgb(255,0,0)',
				'hillshade-illumination-anchor': 'viewport',
			});
		await expect
			.poll(() => hashConfig(page))
			.toEqual({ features: { hillshade: { shadowColor: '#FF0000', anchor: 'viewport' } } });
	});
});
