import { test, expect, type Page } from '@playwright/test';

/**
 * Changing a setting must not move the panel: whatever appears with a change — a reset button, a change
 * count, the undo button — sits in space that is already reserved. Each state on its own looks right, so
 * only a measurement before and after the change finds these shifts.
 */

interface Box {
	y: number;
	height: number;
}

/** Every row, section title and heading of the sidebar, by a key that survives the change. */
async function landmarks(page: Page): Promise<Record<string, Box>> {
	return page.evaluate(() => {
		const boxes: Record<string, Box> = {};
		const pane = document.querySelector('.maplibregl-pane');
		if (!pane) return boxes;
		// Inside the panel's content, so scrolling does not read as a shift.
		const origin = pane.getBoundingClientRect().top - pane.scrollTop;
		const name = (el: Element) =>
			el.matches('summary')
				? `section ${el.querySelector('.section-title')?.textContent}`
				: el.matches('.entry')
					? `row ${el.querySelector('label, .label')?.textContent?.trim()}`
					: el.matches('.styler-head')
						? 'header'
						: `heading ${el.textContent}`;
		const seen: Record<string, number> = {};
		for (const el of pane.querySelectorAll('.styler-head, summary, .entry, h4.section-group')) {
			const rect = el.getBoundingClientRect();
			if (rect.height === 0) continue;
			const base = name(el);
			const key = `${base}#${(seen[base] = (seen[base] ?? 0) + 1)}`;
			// The header is sticky: it belongs to the panel's viewport, the rest to its content.
			const top = el.matches('.styler-head') ? pane.getBoundingClientRect().top : origin;
			boxes[key] = {
				y: Math.round((rect.y - top) * 2) / 2,
				height: Math.round(rect.height * 2) / 2,
			};
		}
		return boxes;
	});
}

/** The landmarks that moved or changed height, as readable lines. */
function shifts(before: Record<string, Box>, after: Record<string, Box>): string[] {
	const lines: string[] = [];
	for (const key of Object.keys(before)) {
		const a = before[key];
		const b = after[key];
		if (!b) continue; // rows can come and go; only movement of the ones that stay is a bug
		if (a.y !== b.y) lines.push(`${key} moved ${Math.round(b.y - a.y)}px`);
		if (a.height !== b.height) lines.push(`${key} changed height ${a.height} → ${b.height}`);
	}
	return lines;
}

function section(page: Page, title: string) {
	return page.locator(
		`.maplibregl-versatiles-styler details:has(summary .section-title:text-is("${title}"))`
	);
}

function row(page: Page, scope: ReturnType<typeof section>, label: string) {
	return scope.locator('.entry', { has: page.locator(`label:text-is("${label}")`) });
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.maplibregl-pane button.font-button', {
		state: 'attached',
		timeout: 20_000,
	});
	await page.evaluate(() =>
		document
			.querySelectorAll<HTMLDetailsElement>('.maplibregl-pane details')
			.forEach((details) => (details.open = true))
	);
	await page.waitForTimeout(500);
});

test('the first change moves nothing: section count, reset buttons, header reset', async ({
	page,
}) => {
	const labels = section(page, 'Labels');
	const before = await landmarks(page);

	await row(page, labels, 'Language').locator('select').selectOption('de');
	await expect(labels.locator('summary .section-count')).toHaveText('1');
	await expect(page.getByRole('button', { name: 'Reset all changes' })).toBeVisible();

	expect(shifts(before, await landmarks(page))).toEqual([]);
});

test('changing a color moves nothing', async ({ page }) => {
	const colors = section(page, 'Individual colors');
	const before = await landmarks(page);

	const water = colors
		.locator('.color-container', { has: page.locator('label[title="water"]') })
		.locator('input.color-text');
	await water.fill('#7FB2E8');
	await water.press('Enter');
	await expect(colors.locator('summary .section-count')).toHaveText('1');

	expect(shifts(before, await landmarks(page))).toEqual([]);
});

test('hiding a layer and fading another moves nothing', async ({ page }) => {
	const layers = section(page, 'Layers');
	const before = await landmarks(page);

	await layers.getByRole('checkbox', { name: 'Show POIs' }).uncheck();
	const boundaries = row(page, layers, 'Boundaries').locator('input[type="range"]');
	await boundaries.fill('60');
	await boundaries.dispatchEvent('change');
	await expect(layers.locator('summary .section-count')).toHaveText('2');

	expect(shifts(before, await landmarks(page))).toEqual([]);
});

test('a longer value and a mixed value move nothing', async ({ page }) => {
	const labels = section(page, 'Labels');
	const before = await landmarks(page);

	// 100% → 300%, and a font that says "Mixed" for all labels
	const size = row(page, labels, 'Size').locator('input[type="range"]');
	await size.fill(String(await size.getAttribute('max')));
	await size.dispatchEvent('change');
	await expect(row(page, labels, 'Size').locator('button.value')).toHaveText('300%');

	expect(shifts(before, await landmarks(page))).toEqual([]);
});
