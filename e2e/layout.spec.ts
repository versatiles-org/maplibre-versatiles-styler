import { test, expect, type Page } from '@playwright/test';

/**
 * No content is wider or higher than its container: in the sidebar, the font picker, the color picker
 * and the export/import dialogs, at several window sizes and with long content.
 */

const SIZES = [
	{ width: 1100, height: 900 },
	{ width: 800, height: 500 },
	{ width: 420, height: 700 },
	// shorter than the color picker
	{ width: 800, height: 360 },
];

/** Elements that stick out on purpose. */
const ALLOWED: string[] = [
	// Code is the one thing allowed to be wider than its box. A style.json carries long inlined tile and
	// attribution URLs; wrapping them would make the preview unreadable, so it scrolls instead.
	'.code-preview',
	'.code-preview *',
];

/**
 * Layout problems in the sidebar and the popups:
 *
 * - content cut off by a container that clips (`overflow: hidden`/`clip`), unless it is truncated with an
 *   ellipsis on purpose;
 * - content spilling out of a container that does not clip, or scrolling sideways;
 * - an element outside the content box of its parent (padding and border are not room for children);
 * - in flex and grid containers, children overlapping each other — e.g. a field wider than its grid
 *   column, which stays inside the row;
 * - a popup outside the window, or a sidebar wider than it.
 */
function findLayoutProblems(allowed: string[]): string[] {
	const problems = new Set<string>();
	const TOLERANCE = 1;
	const name = (el: Element) => {
		const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/) : [];
		const text = el.children.length === 0 ? el.textContent?.trim().slice(0, 40) : '';
		const label = el.getAttribute('aria-label');
		return `${el.tagName.toLowerCase()}${classes
			.filter(Boolean)
			.map((c) => `.${c}`)
			.join('')}${label ? `[${label}]` : ''}${text ? ` "${text}"` : ''}`;
	};
	const isFormControl = (el: Element) =>
		['input', 'select', 'textarea'].includes(el.tagName.toLowerCase());
	const clips = (overflow: string) => overflow === 'hidden' || overflow === 'clip';
	const scrolls = (overflow: string) => overflow === 'auto' || overflow === 'scroll';
	const isHidden = (el: Element, style: CSSStyleDeclaration, rect: DOMRect) =>
		style.display === 'none' ||
		// the content of a closed section keeps its size, but is not shown
		(el.parentElement?.closest('details:not([open])') !== null && !el.closest('summary')) ||
		style.visibility === 'hidden' ||
		style.opacity === '0' ||
		// Shrunk to a point rather than removed: a visually-hidden label, or the real file input behind a
		// styled one. Both stay in the tree for screen readers and for the keyboard, and neither is content.
		(rect.width <= 1 && rect.height <= 1) ||
		// moved out of sight on purpose, e.g. the radios of the theme table
		(style.position === 'absolute' && (rect.right < -1000 || rect.bottom < -1000));
	const contentBox = (el: Element, style: CSSStyleDeclaration) => {
		const r = el.getBoundingClientRect();
		const px = (value: string) => parseFloat(value) || 0;
		return {
			left: r.left + px(style.borderLeftWidth) + px(style.paddingLeft),
			right: r.right - px(style.borderRightWidth) - px(style.paddingRight),
			top: r.top + px(style.borderTopWidth) + px(style.paddingTop),
			bottom: r.bottom - px(style.borderBottomWidth) - px(style.paddingBottom),
		};
	};
	const isAllowed = (el: Element) => allowed.some((selector) => el.matches(selector));

	for (const root of document.querySelectorAll(
		'.maplibregl-pane, .font-picker, .color-picker, .styler-dialog'
	)) {
		const rootRect = root.getBoundingClientRect();
		if (root.classList.contains('maplibregl-pane')) {
			if (rootRect.right > innerWidth + TOLERANCE)
				problems.add(`${name(root)} is wider than the window`);
		} else {
			if (rootRect.left < -TOLERANCE || rootRect.top < -TOLERANCE) {
				problems.add(`${name(root)} starts outside the window`);
			}
			if (rootRect.right > innerWidth + TOLERANCE || rootRect.bottom > innerHeight + TOLERANCE) {
				problems.add(
					`${name(root)} ends outside the window: ${Math.round(rootRect.right)}×${Math.round(rootRect.bottom)} in ${innerWidth}×${innerHeight}`
				);
			}
		}

		for (const el of [root, ...root.querySelectorAll('*')]) {
			if (isAllowed(el)) continue;
			const style = getComputedStyle(el);
			const rect = el.getBoundingClientRect();
			if (isHidden(el, style, rect)) continue;

			// Content larger than the element: cut off, spilling out, or scrolling sideways. A text field
			// scrolls its text sideways by design, but nothing should overflow a control vertically.
			if (el.clientWidth > 0) {
				const wider = !isFormControl(el) && el.scrollWidth > el.clientWidth + TOLERANCE;
				const higher = el.scrollHeight > el.clientHeight + TOLERANCE;
				const ellipsis = style.textOverflow === 'ellipsis';
				if (wider && !ellipsis) {
					const how = clips(style.overflowX)
						? 'cut off'
						: scrolls(style.overflowX)
							? 'scrolls sideways'
							: 'spills out';
					problems.add(
						`${name(el)}: content ${how}, ${el.scrollWidth}px wide in ${el.clientWidth}px`
					);
				}
				if (higher && !scrolls(style.overflowY)) {
					const how = clips(style.overflowY) ? 'cut off' : 'spills out';
					problems.add(
						`${name(el)}: content ${how}, ${el.scrollHeight}px high in ${el.clientHeight}px`
					);
				}
			}

			const parent = el.parentElement;
			if (!parent || !root.contains(parent) || el === root) continue;
			const parentStyle = getComputedStyle(parent);
			const positioned = style.position === 'absolute' || style.position === 'fixed';

			// Inside the parent's content box. Scroll containers move their content, so only their width counts.
			const box = positioned ? parent.getBoundingClientRect() : contentBox(parent, parentStyle);
			const sideways = Math.max(rect.right - box.right, box.left - rect.left);
			if (sideways > TOLERANCE) {
				problems.add(
					`${name(el)} sticks out ${Math.round(sideways)}px sideways of ${name(parent)}`
				);
			}
			if (!scrolls(parentStyle.overflowY) && style.position !== 'sticky') {
				const vertically = Math.max(rect.bottom - box.bottom, box.top - rect.top);
				if (vertically > TOLERANCE) {
					problems.add(
						`${name(el)} sticks out ${Math.round(vertically)}px vertically of ${name(parent)}`
					);
				}
			}
		}

		// Children of flex and grid containers do not overlap.
		for (const parent of [root, ...root.querySelectorAll('*')]) {
			const display = getComputedStyle(parent).display;
			if (!/flex|grid/.test(display)) continue;
			const children = [...parent.children].filter((child) => {
				const style = getComputedStyle(child);
				const rect = child.getBoundingClientRect();
				return (
					!isAllowed(child) &&
					!isHidden(child, style, rect) &&
					!['absolute', 'fixed', 'sticky'].includes(style.position)
				);
			});
			// In a grid whose children are placed one after another, each child stays in its column.
			const parentStyle = getComputedStyle(parent);
			const columns = parentStyle.gridTemplateColumns.split(' ').map(parseFloat);
			const autoPlaced = children.every(
				(child) => getComputedStyle(child).gridColumnStart === 'auto'
			);
			if (display.includes('grid') && autoPlaced && columns.every((width) => width > 0)) {
				const gap = parseFloat(parentStyle.columnGap) || 0;
				const box = contentBox(parent, parentStyle);
				children.forEach((child, i) => {
					const column = i % columns.length;
					const start =
						box.left + columns.slice(0, column).reduce((sum, width) => sum + width + gap, 0);
					const end = start + columns[column];
					const r = child.getBoundingClientRect();
					const out = Math.max(r.right - end, start - r.left);
					if (out > TOLERANCE) {
						problems.add(
							`${name(child)} sticks out ${Math.round(out)}px of its grid column ${column + 1} in ${name(parent)}`
						);
					}
				});
			}
			for (let i = 0; i < children.length; i++) {
				for (let j = i + 1; j < children.length; j++) {
					const a = children[i].getBoundingClientRect();
					const b = children[j].getBoundingClientRect();
					const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
					const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
					if (x > TOLERANCE && y > TOLERANCE) {
						problems.add(
							`${name(children[i])} and ${name(children[j])} overlap by ${Math.round(x)}×${Math.round(y)}px in ${name(parent)}`
						);
					}
				}
			}
		}
	}
	return [...problems];
}

/**
 * Every element that can scroll because its content does not fit — `overflow: auto`, `scroll` or
 * `hidden`. Only a few are meant to; everything else squeezes its content for no reason.
 */
function findScrollables(): string[] {
	const found: string[] = [];
	for (const root of document.querySelectorAll('.maplibregl-versatiles-styler')) {
		for (const el of [root, ...root.querySelectorAll('*')]) {
			const style = getComputedStyle(el);
			if (style.display === 'none' || style.visibility === 'hidden') continue;
			// a text field scrolls its own text, which is how text fields work
			if (['input', 'select', 'textarea'].includes(el.tagName.toLowerCase())) continue;
			const over = Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth);
			if (over <= 1) continue;
			if (
				![style.overflowX, style.overflowY].some((o) => ['auto', 'scroll', 'hidden'].includes(o))
			) {
				continue;
			}
			const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/) : [];
			found.push(
				`${el.tagName.toLowerCase()}${classes.map((c) => `.${c}`).join('')} (${over}px over)`
			);
		}
	}
	return [...new Set(found)];
}

async function scrollables(page: Page, allowed: string[]): Promise<string[]> {
	const found = await page.evaluate(findScrollables);
	return found.filter((entry) => !allowed.some((selector) => entry.startsWith(selector)));
}

async function layoutProblems(page: Page): Promise<string[]> {
	return page.evaluate(findLayoutProblems, ALLOWED);
}

/** A long family name and a long label language, to see that long content stays inside. */
async function useLongContent(page: Page) {
	await page.route('**/assets/glyphs/font_families.json', async (route) => {
		const response = await route.fetch();
		const families = (await response.json()) as { name: string; faces: unknown[] }[];
		families.push({
			name: 'Extraordinarily Condensed Humanist Grotesque Display',
			faces: [400, 700].map((weight) => ({
				id: `extraordinarily_condensed_humanist_grotesque_display_${weight}`,
				style: 'normal',
				weight,
				width: 'normal',
				codeblocks: '0-2F',
			})),
		});
		await route.fulfill({ response, json: families });
	});
}

async function openAllSections(page: Page) {
	await page.waitForSelector('.maplibregl-pane details', { state: 'attached' });
	await page.evaluate(() =>
		document
			.querySelectorAll<HTMLDetailsElement>('.maplibregl-pane details')
			.forEach((details) => (details.open = true))
	);
}

function labelsSection(page: Page) {
	return page.locator(
		'.maplibregl-versatiles-styler details:has(summary .section-title:text-is("Labels"))'
	);
}

for (const size of SIZES) {
	test.describe(`layout at ${size.width}×${size.height}`, () => {
		test.use({ viewport: size });

		test.beforeEach(async ({ page }) => {
			await useLongContent(page);
		});

		test('sidebar with every section open', async ({ page }) => {
			await page.goto('/#panel=open');
			await openAllSections(page);
			// changes add "•" marks and reset buttons
			const labels = labelsSection(page);
			await labels.locator('.entry:has(label:text-is("Language")) select').selectOption('el');
			await labels
				.locator('.entry:has(label:text-is("Apply to")) select')
				.selectOption('streets.refs');
			await labels.locator('.entry:has(label:text-is("Size")) button.value').click();
			await page.keyboard.type('150');
			await page.keyboard.press('Enter');
			await expect(labels.locator('button.font-button')).toBeAttached({ timeout: 10_000 });
			expect(await layoutProblems(page)).toEqual([]);
		});

		test('satellite sidebar with every section open', async ({ page }) => {
			await page.goto('/#map=5/50/10&style=satellite&panel=open');
			await openAllSections(page);
			await page.waitForSelector('.maplibregl-pane button.font-button', { state: 'attached' });
			await openAllSections(page);
			expect(await layoutProblems(page)).toEqual([]);
		});

		test('font picker with the script filter, closest fonts, styles and a search', async ({
			page,
		}) => {
			await page.goto('/#panel=open');
			await labelsSection(page).locator('summary').click();
			await labelsSection(page).locator('button.font-button').click();
			const dialog = page.getByRole('dialog', { name: 'Font for All labels' });
			await expect(dialog).toBeVisible();

			await dialog.locator('button.font-picker-filter-button').click();
			await dialog.locator('.font-picker-uncovered summary').click();
			expect(await layoutProblems(page)).toEqual([]);

			await dialog.getByRole('button', { name: 'All available' }).click();
			await dialog.getByRole('option', { name: 'Fira Sans', exact: true }).click();
			expect(await layoutProblems(page)).toEqual([]);

			await dialog.getByRole('button', { name: 'Clear' }).first().click();
			await dialog.getByRole('combobox', { name: 'Search fonts' }).fill('extraordinarily');
			await expect(dialog.getByRole('option', { name: /^Extraordinarily/ })).toBeVisible();
			expect(await layoutProblems(page)).toEqual([]);
		});

		test('export dialog on every tab', async ({ page }) => {
			await page.goto('/#panel=open');
			// The style has to exist before there is a style.json to preview.
			await page.waitForSelector('.maplibregl-pane button.font-button', { state: 'attached' });
			await page.getByRole('button', { name: 'Export' }).click();
			const dialog = page.getByRole('dialog', { name: 'Export style' });
			await expect(dialog).toBeVisible();

			// style.json: the widest content there is — long inlined tile URLs in a preview.
			await expect(dialog.locator('.code-preview .tok-key').first()).toBeVisible();
			expect(await layoutProblems(page), 'style.json').toEqual([]);

			await dialog.getByRole('radio', { name: 'Smallest' }).click();
			// minified is one enormous line, so the preview has to scroll rather than stretch the dialog
			expect(await layoutProblems(page), 'minified').toEqual([]);

			await dialog.getByRole('tab', { name: 'Code' }).click();
			expect(await layoutProblems(page), 'code npm').toEqual([]);
			await dialog.getByRole('radio', { name: 'HTML page' }).click();
			expect(await layoutProblems(page), 'code browser').toEqual([]);
		});

		test('import dialog with a report and warnings', async ({ page }) => {
			await page.goto('/#panel=open');
			await page.waitForSelector('.maplibregl-pane button.font-button', { state: 'attached' });
			const section = page.locator('details:has(summary .section-title:text-is("Import"))');
			await section.locator('summary').click();
			await section.getByRole('button', { name: 'Import a style…' }).click();
			const dialog = page.getByRole('dialog', { name: 'Import style' });
			await expect(dialog).toBeVisible();
			expect(await layoutProblems(page), 'empty').toEqual([]);

			// A long error message: the library's unknown-key report lists every valid key in its place.
			await dialog.locator('textarea').fill('{"theme":"gray","nonsense":true}');
			await dialog.getByRole('button', { name: 'Check' }).click();
			await expect(dialog.locator('.import-error')).toBeVisible();
			expect(await layoutProblems(page), 'error').toEqual([]);

			// A long list of warnings, and the tile-server question.
			await dialog
				.locator('textarea')
				.fill('{"theme":"gray","urls":{"base":"https://tiles.example.org"}}');
			await dialog.getByRole('button', { name: 'Check' }).click();
			await expect(dialog.locator('.import-origin')).toBeVisible();
			expect(await layoutProblems(page), 'another tile server').toEqual([]);
		});

		test('color picker on every tab', async ({ page }) => {
			await page.goto('/#panel=open');
			const colors = page.locator(
				'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
			);
			await colors.locator('summary').click();
			await colors.locator('button.color-swatch').first().click();
			const dialog = page.getByRole('dialog', { name: /^Color for/ });
			await expect(dialog).toBeVisible();
			const space = dialog.getByRole('combobox', { name: 'Color space' });
			for (const key of ['srgb', 'hsl', 'hwb', 'hsv', 'oklab', 'oklch']) {
				await space.selectOption(key);
				expect(await layoutProblems(page), key).toEqual([]);
			}
			// a channel value while it is typed
			await space.selectOption('hsl');
			await dialog.getByRole('button', { name: /^Saturation: .* Enter a value$/ }).click();
			await expect(dialog.getByRole('textbox', { name: 'Saturation' })).toBeFocused();
			expect(await layoutProblems(page), 'editing a value').toEqual([]);
		});
	});
}

test('the layout check finds content that sticks out', async ({ page }) => {
	await page.goto('/#panel=open');
	await openAllSections(page);
	await page.addStyleTag({
		content: `
			.maplibregl-pane .section-description { width: 600px; }
			.maplibregl-pane .color-container .label { min-width: 400px !important; }
		`,
	});
	const problems = await layoutProblems(page);
	expect(
		problems.some((p) => /p\.section-description ".*" sticks out \d+px sideways/.test(p))
	).toBe(true);
	expect(
		problems.some((p) => /div\.label sticks out/.test(p) || /content \d+px wide/.test(p))
	).toBe(true);

	const colors = page.locator(
		'.maplibregl-versatiles-styler details:has(summary:has-text("Individual colors"))'
	);
	await colors.locator('button.color-swatch').first().click();
	await page.addStyleTag({
		content: `
			.color-picker { max-height: 150px !important; }
			.color-picker .color-picker-body { overflow: hidden !important; }
			.color-picker .color-picker-slider output { min-width: 60px; }
		`,
	});
	const pickerProblems = await layoutProblems(page);
	expect(pickerProblems.some((p) => /color-picker-body: content cut off/.test(p))).toBe(true);
	expect(
		pickerProblems.some((p) => /output .* sticks out \d+px of its grid column 3/.test(p))
	).toBe(true);

	await page.addStyleTag({ content: '.color-picker { margin-top: 2000px; }' });
	expect(
		(await layoutProblems(page)).some((p) => /color-picker.* ends outside the window/.test(p))
	).toBe(true);
});

test.describe('nothing scrolls that is not meant to', () => {
	/** The sidebar always scrolls; the font list is a long list by nature. */
	const ALWAYS = [
		'div.maplibregl-ctrl.maplibregl-ctrl-group.maplibregl-pane',
		'ul.font-picker-list',
	];
	/** In a short window the filter panel and the color picker share the height, and scroll. */
	const SHORT = [...ALWAYS, 'div.font-picker-filter', 'div.color-picker-body'];

	async function openEverything(page: Page) {
		await page.goto('/#panel=open');
		await page.waitForSelector('.maplibregl-pane button.font-button', {
			state: 'attached',
			timeout: 20_000,
		});
		await openAllSections(page);
		await labelsSection(page).locator('button.font-button').click();
		const fonts = page.getByRole('dialog', { name: /^Font for/ });
		await expect(fonts).toBeVisible();
		await fonts.locator('button.font-picker-filter-button').click();
		await fonts.locator('.font-picker-uncovered summary').click();
		await page.waitForTimeout(500);
		return fonts;
	}

	test('in a window with room, only the sidebar and the font list scroll', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await useLongContent(page);
		const fonts = await openEverything(page);
		expect(await scrollables(page, ALWAYS)).toEqual([]);

		// the first Escape closes the filter panel, the second the picker
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect(fonts).toHaveCount(0);
		// two rows are called Water: the water color and the water label color
		const swatch = page.getByRole('button', { name: /^Water: #/ }).first();
		await swatch.scrollIntoViewIfNeeded();
		await swatch.click();
		await expect(page.getByRole('dialog', { name: 'Color for Water' })).toBeVisible();
		expect(await scrollables(page, ALWAYS)).toEqual([]);
	});

	test('in a short window the popups share the height, and nothing else scrolls', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 800, height: 380 });
		await useLongContent(page);
		await openEverything(page);
		expect(await scrollables(page, SHORT)).toEqual([]);
	});
});
