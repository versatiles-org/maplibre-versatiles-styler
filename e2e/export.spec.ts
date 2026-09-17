import { test, expect, type Page } from '@playwright/test';
import { getMapStyle } from './helpers';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Export style' });

/** Opens the export dialog, once the style it shows exists. */
async function openExport(page: Page) {
	// The style exists once the TileJSONs are in; until then there is nothing to export.
	await getMapStyle(page);
	await page.getByRole('button', { name: 'Export' }).click();
	await expect(dialog(page)).toBeVisible();
	return dialog(page);
}

test.beforeEach(async ({ page }) => {
	await page.goto('/#panel=open');
	await page.waitForSelector('.maplibregl-versatiles-styler', { state: 'attached' });
});

test('opens a dialog with a tab for each way of exporting', async ({ page }) => {
	const panel = await openExport(page);

	await expect(panel.getByRole('tab', { name: 'style.json' })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await expect(panel.getByRole('tab', { name: 'Code' })).toBeVisible();
	await expect(panel.getByRole('tab')).toHaveCount(2);
});

test('closes on Escape and on the close button', async ({ page }) => {
	await openExport(page);
	// Escape is the dialog element's own behaviour, not something the styler wires up.
	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeHidden();

	await page.getByRole('button', { name: 'Export' }).click();
	await dialog(page).getByRole('button', { name: 'Close' }).click();
	await expect(dialog(page)).toBeHidden();
});

test('downloads a self-contained style.json', async ({ page }) => {
	const panel = await openExport(page);

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		panel.getByRole('button', { name: 'Download' }).click(),
	]);

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

test('records the options in the exported style, so it can be imported back exactly', async ({
	page,
}) => {
	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="toner"])').click();

	const panel = await openExport(page);
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		panel.getByRole('button', { name: 'Download' }).click(),
	]);
	const content = await (await download.createReadStream()).toArray();
	const json = JSON.parse(Buffer.concat(content).toString());

	expect(json.metadata['versatiles:builder']).toBe('osm');
	expect(json.metadata['versatiles:options']).toMatchObject({ theme: 'toner' });
	// urls are environment, not style: they never travel with the options
	expect(json.metadata['versatiles:options'].urls).toBeUndefined();
	// and the CC0 statement is still there
	expect(json.metadata.license).toContain('creativecommons.org');
});

test('the minified download is smaller than the readable one', async ({ page }) => {
	const panel = await openExport(page);

	async function downloadSize() {
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			panel.getByRole('button', { name: 'Download' }).click(),
		]);
		const content = await (await download.createReadStream()).toArray();
		return Buffer.concat(content).length;
	}

	const pretty = await downloadSize();
	await panel.getByRole('radio', { name: 'Smallest' }).click();
	const minified = await downloadSize();

	expect(minified).toBeLessThan(pretty);
});

test('copies a v6 npm snippet, and a script-tag one for a plain page', async ({
	context,
	page,
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);

	const styleList = page.locator('.maplibregl-versatiles-styler .style-list');
	await styleList.locator('label:has(input[value="gray-dark"])').click();

	const panel = await openExport(page);
	await panel.getByRole('tab', { name: 'Code' }).click();

	await panel.getByRole('button', { name: 'Copy the code snippet' }).click();
	// the button confirms in place rather than opening another dialog
	await expect(panel.getByRole('button', { name: 'Copy the code snippet' })).toHaveText('Copied');

	const npm = await page.evaluate(() => navigator.clipboard.readText());
	expect(npm).toContain("import { osm, inlineSources } from '@versatiles/style';");
	expect(npm).toContain('await inlineSources(osm({');
	expect(npm).toContain('theme: "gray-dark"');
	expect(npm).toContain('base: "https://tiles.versatiles.org"');
	expect(npm).not.toContain('transition');

	await panel.getByRole('radio', { name: 'HTML page' }).click();
	await panel.getByRole('button', { name: 'Copy the code snippet' }).click();

	const browser = await page.evaluate(() => navigator.clipboard.readText());
	expect(browser).toContain(
		'<script src="https://tiles.versatiles.org/assets/lib/versatiles-style/'
	);
	expect(browser).toContain('VersaTilesStyle.osm({');
	expect(browser).toContain('theme: "gray-dark"');
	// a classic script has no imports and no top-level await
	expect(browser).not.toContain('import ');
});

test('every line of a preview starts at the same place', async ({ page }) => {
	// The dialog styles inline `<code>` in its prose with a little padding. Applied to the preview's own
	// `<code>`, that padding sits before the first character rather than on each line, indenting line one
	// by 4px and nothing else — and the `font` shorthand that came with it dropped the line height.
	const panel = await openExport(page);

	for (const tab of ['style.json', 'Code']) {
		await panel.getByRole('tab', { name: tab }).click();
		const measured = await page.evaluate(() => {
			const pre = document.querySelector('.code-preview') as HTMLElement;
			const left = pre.getBoundingClientRect().left;
			const walker = document.createTreeWalker(pre.querySelector('code')!, NodeFilter.SHOW_TEXT);
			const starts: number[] = [];
			let atLineStart = true;
			let node: Node | null;
			while ((node = walker.nextNode()) && starts.length < 6) {
				const text = node.textContent ?? '';
				for (let i = 0; i < text.length && starts.length < 6; i++) {
					if (atLineStart && text[i] !== '\n') {
						const range = document.createRange();
						range.setStart(node, i);
						range.setEnd(node, i + 1);
						starts.push(Math.round(range.getBoundingClientRect().left - left));
						atLineStart = false;
					}
					if (text[i] === '\n') atLineStart = true;
				}
			}
			return { starts, lineHeight: getComputedStyle(pre).lineHeight };
		});

		expect(new Set(measured.starts).size, `${tab}: line starts ${measured.starts}`).toBe(1);
		// 12px type at the 1.5 the preview asks for, not the `normal` an overriding shorthand would give
		expect(measured.lineHeight, tab).toBe('18px');
	}
});

test('shows the code with syntax highlighting rather than as flat text', async ({ page }) => {
	const panel = await openExport(page);
	await panel.getByRole('tab', { name: 'Code' }).click();

	const preview = panel.locator('.code-preview');
	await expect(preview.locator('.tok-keyword').first()).toBeVisible();
	await expect(preview.locator('.tok-key').first()).toBeVisible();
	await expect(preview.locator('.tok-string').first()).toBeVisible();
});
