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

	// Remove scroll constraints and resize viewport to fit the full sidebar content
	const pane = page.locator('.maplibregl-pane');
	await pane.evaluate((el) => {
		el.style.maxHeight = 'none';
		el.style.overflow = 'visible';
	});
	const height = await pane.evaluate((el) => el.scrollHeight);
	const viewport = page.viewportSize()!;
	await page.setViewportSize({ width: viewport.width, height: height + 80 });

	const browserName = test.info().project.name;
	await pane.screenshot({ path: `screenshots/${browserName}.png` });
});
