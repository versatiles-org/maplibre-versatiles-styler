import { test } from '@playwright/test';

test('capture sidebar screenshot', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });

	// Open all <details> sections
	await page.$$eval('.maplibregl-pane details', (elements) => {
		for (const el of elements) {
			el.setAttribute('open', '');
		}
	});

	const pane = page.locator('.maplibregl-pane');
	const browserName = test.info().project.name;
	await pane.screenshot({ path: `screenshots/${browserName}.png` });
});
