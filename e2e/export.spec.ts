import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('download triggers with valid JSON', async ({ page }) => {
	const exportDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Export"))'
	);
	await exportDetails.locator('summary').click();

	const downloadButton = exportDetails.locator('button', { hasText: 'Download style.json' });

	const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);

	expect(download.suggestedFilename()).toBe('style.json');

	const content = await (await download.createReadStream()).toArray();
	const json = JSON.parse(Buffer.concat(content).toString());

	expect(json.version).toBe(8);
	expect(json.layers).toBeDefined();
	expect(json.sources).toBeDefined();
});

test('copy writes to clipboard', async ({ context, page }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);

	const exportDetails = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:text("Export"))'
	);
	await exportDetails.locator('summary').click();

	const copyButton = exportDetails.locator('button', { hasText: 'Copy style code' });

	page.once('dialog', (dialog) => dialog.dismiss());

	await copyButton.click();

	const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
	expect(clipboardText).toContain('VersaTilesStyle.colorful(');
});
