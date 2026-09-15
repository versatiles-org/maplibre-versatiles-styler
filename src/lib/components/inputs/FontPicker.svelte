<script lang="ts">
	import { FONT_SCRIPTS, fontCovers, languageScript, type FontFaceInfo } from '@versatiles/style';
	import {
		closestFace,
		fontFamilies,
		matchFace,
		regularFace,
		styleChoices,
		styleOf,
		weightLabel,
		widthLabel,
		type FontFamily,
		type FontStyle,
		type FontUse,
	} from '../../font_families';
	import { lettersOf } from '../../font_tree';
	import {
		EAST_ASIA_NOTE,
		availableScripts,
		closestFamilies,
		faceScripts,
		filterFamiliesByScripts,
		matchBadge,
		needsEastAsiaNote,
		scriptCounts,
		scriptExamples,
		scriptName,
		scriptRegions,
		scriptSummary,
		regionSelection,
		toggleRegion,
	} from '../../font_scripts';
	import { useFontPickerState } from '../../font_picker_state.svelte';
	import FontPreview from './FontPreview.svelte';

	let {
		title,
		faces,
		value,
		origin,
		sample,
		language,
		usage,
		anchor,
		onselect,
		onclose,
	}: {
		/** What the font is for, e.g. "Places". */
		title: string;
		faces: FontFaceInfo[];
		/** The current face, `undefined` when several are in use. */
		value: string | undefined;
		origin: string;
		/** The text faces are previewed with. */
		sample: string;
		/** `text.language`, to mark families without its letters. */
		language: string;
		/** The faces in use in this style, with the rows that use them. */
		usage: FontUse[];
		/** The button that opened the picker: it is placed next to it, and clicks on it do not close it. */
		anchor: HTMLElement;
		/** Called with a face; `close` tells whether the picker should close. */
		onselect: (faceId: string, close: boolean) => void;
		onclose: () => void;
	} = $props();

	type Row =
		| { key: string; kind: 'used'; face: FontFaceInfo }
		| { key: string; kind: 'family'; family: FontFamily; face: FontFaceInfo };

	const uid = $props.id();
	const shared = useFontPickerState();

	let query = $state('');
	let searching = $derived(query.trim() !== '');
	let filterOpen = $state(false);
	let filterButton = $state<HTMLButtonElement>();
	let current = $derived(faces.find((face) => face.id === value));
	let style = $derived(styleOf(current));
	let allFamilies = $derived(fontFamilies(faces));
	let scriptFilter = $derived(filterFamiliesByScripts(allFamilies, shared.scripts));
	let available = $derived(availableScripts(allFamilies));
	let counts = $derived(scriptCounts(allFamilies, shared.scripts));
	/** The scripts to choose from, by region: those some font can write, and those selected. */
	let regions = $derived(
		scriptRegions(FONT_SCRIPTS.filter((s) => available.includes(s) || shared.scripts.includes(s)))
	);
	let uncovered = $derived(
		FONT_SCRIPTS.filter((s) => !available.includes(s) && !shared.scripts.includes(s))
	);
	let labelScript = $derived(languageScript(language));
	/** No family whose coverage is known writes all selected scripts: the closest ones are offered. */
	let noMatch = $derived(
		shared.scripts.length > 0 &&
			scriptFilter.families.every((f) => f.faces.every((face) => faceScripts(face) === null))
	);
	let closest = $derived(noMatch ? closestFamilies(allFamilies, shared.scripts) : []);
	let badges: Record<string, string> = $derived(
		Object.fromEntries(closest.map((match) => [match.family.name, matchBadge(match)]))
	);
	/** Families with the face their row previews: the search match closest to the style, or the regular face. */
	let families = $derived(
		[...closest.map((match) => match.family), ...scriptFilter.families].flatMap((family) => {
			const face = searching ? matchFace(family, query, style) : regularFace(family);
			return face ? [{ family, face }] : [];
		})
	);
	let used = $derived(
		usage.flatMap((use) => {
			const face = faces.find((f) => f.id === use.faceId);
			if (!face) return [];
			if (searching && !face.title.toLowerCase().includes(query.trim().toLowerCase())) return [];
			return [{ face, labels: use.labels }];
		})
	);
	let rows: Row[] = $derived([
		...used.map(({ face }) => ({ key: `used:${face.id}`, kind: 'used' as const, face })),
		...families.map(({ family, face }) => ({
			key: `family:${family.name}`,
			kind: 'family' as const,
			family,
			face,
		})),
	]);

	let expanded = $state<string | undefined>();
	let activeKey = $state<string | undefined>();
	let list = $state<HTMLElement>();
	let position = $state({ left: 0, top: 0, maxHeight: 520 });

	// Open on the current family, with its styles shown.
	$effect.pre(() => {
		if (expanded === undefined && current) expanded = current.family;
	});

	// Keep the active row among the rows: the current family, else the first row.
	$effect(() => {
		const keys = rows.map((row) => row.key);
		if (activeKey === undefined || !keys.includes(activeKey)) {
			const currentKey = current ? `family:${current.family}` : undefined;
			activeKey = currentKey && keys.includes(currentKey) ? currentKey : keys[0];
		}
	});

	// Scroll the active row into view: to the middle on opening, then just enough.
	let scrolled = false;
	$effect(() => {
		if (!activeKey || !list) return;
		const row = list.querySelector(`[data-row="${CSS.escape(activeKey)}"]`);
		row?.scrollIntoView({ block: scrolled ? 'nearest' : 'center' });
		scrolled = true;
	});

	/**
	 * Moves the picker to the map container. Inside the control it would be clipped by the sidebar:
	 * MapLibre gives controls a `transform`, which makes `position: fixed` relative to the control. The
	 * wrapper carries the control's class, so its styles still apply.
	 */
	function portal(layer: HTMLElement) {
		(anchor.closest('.maplibregl-map') ?? document.body).appendChild(layer);
		return () => layer.remove();
	}

	/** Next to the sidebar, level with the button, inside the window; closes on clicks elsewhere. */
	function place(popup: HTMLElement) {
		const margin = 8;
		const update = () => {
			const pane = anchor.closest('.maplibregl-pane') ?? anchor;
			const paneRect = pane.getBoundingClientRect();
			const anchorRect = anchor.getBoundingClientRect();
			const maxHeight = Math.min(520, window.innerHeight - 2 * margin);
			const height = Math.min(popup.offsetHeight, maxHeight);
			let left = paneRect.right + margin;
			if (left + popup.offsetWidth > window.innerWidth - margin) {
				left = Math.max(margin, window.innerWidth - popup.offsetWidth - margin);
			}
			const top = Math.min(
				Math.max(margin, anchorRect.top - 48),
				window.innerHeight - height - margin
			);
			position = { left, top: Math.max(margin, top), maxHeight };
		};
		const closeOutside = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!popup.contains(target) && !anchor.contains(target)) onclose();
		};
		// Escape closes the picker wherever its focus is, e.g. on a style button.
		const closeOnEscape = (event: KeyboardEvent) => {
			// The filter panel handles its own Escape.
			if (event.defaultPrevented) return;
			if (event.key === 'Escape' && popup.contains(document.activeElement)) {
				event.preventDefault();
				onclose();
			}
		};
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		document.addEventListener('pointerdown', closeOutside, true);
		document.addEventListener('keydown', closeOnEscape);
		return () => {
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
			document.removeEventListener('pointerdown', closeOutside, true);
		};
	}

	function focus(input: HTMLInputElement) {
		// After `portal` has moved the picker: moving a focused element drops its focus.
		queueMicrotask(() => input.focus());
	}

	/** Picks a family: the search match, or the face closest to the current style. */
	function pickFamily(family: FontFamily, match: FontFaceInfo, close: boolean) {
		expanded = family.name;
		activeKey = `family:${family.name}`;
		onselect((searching ? match : closestFace(family, style)).id, close);
	}

	function pickStyle(family: FontFamily, base: FontFaceInfo, change: Partial<FontStyle>) {
		onselect(closestFace(family, { ...styleOf(base), ...change }).id, false);
	}

	function move(offset: number) {
		if (rows.length === 0) return;
		const index = rows.findIndex((row) => row.key === activeKey);
		activeKey = rows[Math.min(rows.length - 1, Math.max(0, index + offset))].key;
	}

	function handleKeydown(e: KeyboardEvent) {
		const row = rows.find((r) => r.key === activeKey);
		if (e.key === 'ArrowDown') move(1);
		else if (e.key === 'ArrowUp') move(-1);
		else if (e.key === 'PageDown') move(8);
		else if (e.key === 'PageUp') move(-8);
		else if (e.key === 'ArrowRight' && row?.kind === 'family') expanded = row.family.name;
		else if (e.key === 'ArrowLeft' && row?.kind === 'family') expanded = undefined;
		else if (e.key === 'Enter' && row?.kind === 'used') onselect(row.face.id, true);
		else if (e.key === 'Enter' && row?.kind === 'family') pickFamily(row.family, row.face, true);
		else if (e.key === 'Escape') onclose();
		else return;
		e.preventDefault();
		e.stopPropagation();
	}

	/** A note for a family row: unknown coverage, or letters of the label language missing. */
	function familyNote(family: FontFamily): string | undefined {
		if (family.faces.every((face) => face.codeblocks === '')) return 'coverage unknown';
		if (fontCovers(regularFace(family), language) === false) return `lacks ${lettersOf(language)}`;
		return undefined;
	}

	function isSelection(scripts: readonly string[]): boolean {
		return (
			scripts.length === shared.scripts.length && scripts.every((s) => shared.scripts.includes(s))
		);
	}

	/** Escape in the filter panel closes the panel, not the picker. */
	function handleFilterKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		e.preventDefault();
		e.stopPropagation();
		filterOpen = false;
		filterButton?.focus();
	}
</script>

<div class="maplibregl-versatiles-styler font-picker-layer" {@attach portal}>
	<div
		class="font-picker"
		role="dialog"
		aria-label="Font for {title}"
		style:left="{position.left}px"
		style:top="{position.top}px"
		style:max-height="{position.maxHeight}px"
		{@attach place}
	>
		<div class="font-picker-header">
			<span class="font-picker-title">Font for {title}</span>
			<button type="button" class="font-picker-close" aria-label="Close" onclick={onclose}>×</button
			>
		</div>
		<div class="font-picker-tools">
			<input
				class="font-picker-search"
				type="search"
				placeholder="Search fonts"
				aria-label="Search fonts"
				role="combobox"
				aria-expanded="true"
				aria-controls="{uid}-list"
				aria-activedescendant={activeKey ? `${uid}-${activeKey}` : undefined}
				bind:value={query}
				onkeydown={handleKeydown}
				{@attach focus}
			/>
			<button
				type="button"
				class="font-picker-filter-button"
				class:active={shared.scripts.length > 0}
				aria-expanded={filterOpen}
				aria-controls="{uid}-filter"
				title="Show only fonts that can write these scripts"
				bind:this={filterButton}
				onclick={() => (filterOpen = !filterOpen)}
				>{scriptSummary(shared.scripts)}<span aria-hidden="true">&nbsp;▾</span></button
			>
		</div>
		{#if filterOpen}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="font-picker-filter"
				id="{uid}-filter"
				role="group"
				aria-label="Scripts"
				onkeydown={handleFilterKeydown}
			>
				<p class="font-picker-filter-hint">Show fonts that can write all of:</p>
				<div class="font-picker-quick" role="group" aria-label="Quick selection">
					{#if labelScript}
						<button
							type="button"
							disabled={isSelection([labelScript])}
							onclick={() => labelScript && shared.setScripts([labelScript])}
							>Label language: {scriptName(labelScript)}</button
						>
					{/if}
					<button
						type="button"
						title="Every script some font on this server can write"
						disabled={available.length === 0 || isSelection(available)}
						onclick={() => shared.setScripts(available)}>All available</button
					>
					<button
						type="button"
						disabled={shared.scripts.length === 0}
						onclick={() => shared.clearScripts()}>Clear</button
					>
				</div>
				{#each regions as region (region.name)}
					{@const selection = regionSelection(region.scripts, available, shared.scripts)}
					<div class="font-picker-region" role="group" aria-label={region.name}>
						<label class="font-picker-region-name">
							<input
								type="checkbox"
								checked={selection === 'all'}
								disabled={!region.scripts.some((script) => available.includes(script))}
								{@attach (box) => {
									box.indeterminate = selection === 'some';
								}}
								onchange={() =>
									shared.setScripts(toggleRegion(region.scripts, available, shared.scripts))}
							/>
							{region.name}
						</label>
						<div class="font-picker-chips">
							{#each region.scripts as script (script)}
								{@const selected = shared.scripts.includes(script)}
								{@const examples = scriptExamples(script)}
								<button
									type="button"
									class="font-picker-chip"
									class:muted={!selected && counts[script] === 0}
									aria-pressed={selected}
									title={examples ? `e.g. ${examples}` : undefined}
									onclick={() => shared.toggleScript(script)}
									>{#if selected}<span aria-hidden="true">✓&nbsp;</span>{/if}{scriptName(
										script
									)}{#if !selected}<span class="font-picker-count">{counts[script]}</span
										>{/if}</button
								>
							{/each}
						</div>
						{#if needsEastAsiaNote(region.scripts)}
							<p class="font-picker-note">{EAST_ASIA_NOTE}</p>
						{/if}
					</div>
				{/each}
				{#if uncovered.length > 0}
					<details class="font-picker-uncovered">
						<summary>No font on this server: {uncovered.length} scripts</summary>
						<p>{uncovered.map(scriptName).join(', ')}</p>
						{#if needsEastAsiaNote(uncovered)}
							<p class="font-picker-note">{EAST_ASIA_NOTE}</p>
						{/if}
					</details>
				{/if}
			</div>
		{/if}
		<ul class="font-picker-list" id="{uid}-list" role="listbox" aria-label="Fonts" bind:this={list}>
			{#if used.length > 0}
				<li class="font-picker-heading" role="presentation">Used in this style</li>
				{#each used as { face, labels } (face.id)}
					{@const key = `used:${face.id}`}
					<li
						id="{uid}-{key}"
						class="font-picker-option font-picker-used"
						class:active={key === activeKey}
						class:selected={face.id === value}
						role="option"
						aria-selected={face.id === value}
						aria-label="{face.title}, used by {labels.join(', ')}"
						tabindex="-1"
						data-row={key}
						data-face={face.id}
						onclick={() => onselect(face.id, true)}
						onkeydown={(e) => e.key === 'Enter' && onselect(face.id, true)}
					>
						<FontPreview {origin} faceId={face.id} text={sample} size={16} lazy />
						<span class="font-picker-caption">{face.title} · {labels.join(', ')}</span>
					</li>
				{/each}
				{#if closest.length === 0}
					<li class="font-picker-heading" role="presentation">All fonts</li>
				{/if}
			{/if}
			{#if closest.length > 0}
				<li class="font-picker-heading font-picker-closest" role="presentation">
					No font writes all {shared.scripts.length} scripts. Closest:
				</li>
			{/if}
			{#each families as { family, face } (family.name)}
				{@const key = `family:${family.name}`}
				{@const isOpen = expanded === family.name}
				{@const note = familyNote(family)}
				<li
					id="{uid}-{key}"
					class="font-picker-option font-picker-family-row"
					class:active={key === activeKey}
					class:selected={current?.family === family.name}
					role="option"
					aria-selected={current?.family === family.name}
					aria-label={family.name}
					tabindex="-1"
					data-row={key}
					data-family={family.name}
					onclick={() => pickFamily(family, face, false)}
					onkeydown={(e) => e.key === 'Enter' && pickFamily(family, face, true)}
				>
					<FontPreview {origin} faceId={face.id} text={sample} size={18} lazy />
					<span class="font-picker-caption">
						{family.name}{#if searching}&nbsp;· {face.title}{/if} · {family.faces.length}
						{family.faces.length === 1 ? 'style' : 'styles'}
						{#if badges[family.name]}<span class="font-picker-badge">{badges[family.name]}</span
							>{/if}
						{#if note}<span class="font-picker-warning">⚠ {note}</span>{/if}
					</span>
				</li>
				{#if isOpen}
					{@const base = current?.family === family.name ? current : closestFace(family, style)}
					{@const choices = styleChoices(family, styleOf(base))}
					<li class="font-picker-styles" role="presentation">
						{#if choices.widths.length > 1}
							<div class="font-picker-style-row" role="group" aria-label="Width">
								{#each choices.widths as width (width)}
									<button
										type="button"
										aria-pressed={base.width === width}
										onclick={() => pickStyle(family, base, { width })}>{widthLabel(width)}</button
									>
								{/each}
							</div>
						{/if}
						<div class="font-picker-style-row" role="group" aria-label="Weight">
							{#each choices.weights as weight (weight)}
								<button
									type="button"
									aria-pressed={base.weight === weight}
									title={String(weight)}
									onclick={() => pickStyle(family, base, { weight })}>{weightLabel(weight)}</button
								>
							{/each}
						</div>
						{#if choices.italic}
							<label class="font-picker-italic">
								<input
									type="checkbox"
									checked={base.italic}
									onchange={(e) => pickStyle(family, base, { italic: e.currentTarget.checked })}
								/>
								Italic
							</label>
						{/if}
					</li>
				{/if}
			{/each}
			{#if families.length === 0}
				<li class="font-picker-empty" role="presentation">
					{searching ? `No font matches “${query}”.` : 'No font can write all selected scripts.'}
				</li>
			{/if}
			{#if scriptFilter.hidden > 0 && closest.length === 0}
				<li class="font-picker-hidden" role="presentation">
					{scriptFilter.hidden}
					{scriptFilter.hidden === 1 ? 'family' : 'families'} hidden by the script filter ·
					<button type="button" onclick={() => shared.clearScripts()}>Clear</button>
				</li>
			{/if}
		</ul>
	</div>
</div>
