import { test, expect } from '@playwright/test';
import { getMapStyle } from './helpers';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('download triggers with a self-contained style', async ({ page }) => {
	// The style exists once the TileJSONs are in; until then the button has nothing to download.
	await getMapStyle(page);
	await page.getByRole('button', { name: 'Export' }).click();

	const downloadButton = page.getByRole('menuitem', { name: 'Download style.json' });

	const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);

	expect(download.suggestedFilename()).toBe('style.json');

	const content = await (await download.createReadStream()).toArray();
	const json = JSON.parse(Buffer.concat(content).toString());

	expect(json.version).toBe(8);
	expect(json.layers).toBeDefined();
	// The editing tweaks of the map's style (no paint transitions) stay out of the export.
	expect(json.transition).toBeUndefined();
	// Sources are inlined: absolute tile URLs, no TileJSON reference left.
	const source = json.sources['versatiles-shortbread'];
	expect(source.url).toBeUndefined();
	expect(source.tiles[0]).toMatch(/^https:\/\//);
});

test('copy writes a v6 snippet to the clipboard', async ({ context, page }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="gray-dark"])').click();

	await page.getByRole('button', { name: 'Export' }).click();
	await page.getByRole('menuitem', { name: 'Copy style code' }).click();
	// the styler says so in its header instead of opening a dialog
	await expect(page.getByRole('status')).toHaveText('Style code copied');

	const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
	expect(clipboardText).toContain("import { osm, inlineSources } from '@versatiles/style';");
	expect(clipboardText).toContain('await inlineSources(osm({');
	expect(clipboardText).toContain('theme: "gray-dark"');
	// the demo's origin
	expect(clipboardText).toContain('base: "https://tiles.versatiles.org"');
	expect(clipboardText).not.toContain('transition');
});
