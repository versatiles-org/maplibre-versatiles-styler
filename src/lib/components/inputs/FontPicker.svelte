<script lang="ts">
	import type { FontFaceInfo } from '@versatiles/style';
	import { coverageWarning, filterFaces, groupFacesByFamily } from '../../font_tree';
	import FontPreview from './FontPreview.svelte';

	let {
		title,
		faces,
		value,
		origin,
		sample,
		language,
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
		/** The text every face is previewed with. */
		sample: string;
		/** `text.language`, to mark faces without its letters. */
		language: string;
		/** The button that opened the picker: it is placed next to it, and clicks on it do not close it. */
		anchor: HTMLElement;
		onselect: (faceId: string) => void;
		onclose: () => void;
	} = $props();

	const uid = $props.id();
	let query = $state('');
	let filtered = $derived(filterFaces(faces, query));
	let families = $derived(groupFacesByFamily(filtered));
	let activeId = $state<string | undefined>();
	let list = $state<HTMLElement>();
	let position = $state({ left: 0, top: 0, maxHeight: 480 });

	// Keep the active entry among the matches: the current face, else the first match.
	$effect(() => {
		const ids = filtered.map((face) => face.id);
		if (activeId === undefined || !ids.includes(activeId)) {
			activeId = value !== undefined && ids.includes(value) ? value : ids[0];
		}
	});

	// Scroll the active entry into view: the current face to the middle on opening, then just enough.
	let scrolled = false;
	$effect(() => {
		if (!activeId || !list) return;
		const entry = list.querySelector(`[data-face="${CSS.escape(activeId)}"]`);
		entry?.scrollIntoView({ block: scrolled ? 'nearest' : 'center' });
		scrolled = true;
	});

	/** Next to the sidebar, level with the button, inside the window; closes on clicks elsewhere. */
	function place(popup: HTMLElement) {
		const margin = 8;
		const update = () => {
			const pane = anchor.closest('.maplibregl-pane') ?? anchor;
			const paneRect = pane.getBoundingClientRect();
			const anchorRect = anchor.getBoundingClientRect();
			const maxHeight = Math.min(480, window.innerHeight - 2 * margin);
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
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		document.addEventListener('pointerdown', closeOutside, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
			document.removeEventListener('pointerdown', closeOutside, true);
		};
	}

	/**
	 * Moves the picker to the map container. Inside the control it would be clipped by the sidebar: MapLibre
	 * gives controls a `transform`, which makes `position: fixed` relative to the control. The wrapper
	 * carries the control's class, so its styles still apply.
	 */
	function portal(layer: HTMLElement) {
		(anchor.closest('.maplibregl-map') ?? document.body).appendChild(layer);
		return () => layer.remove();
	}

	function focus(input: HTMLInputElement) {
		// After `portal` has moved the picker: moving a focused element drops its focus.
		queueMicrotask(() => input.focus());
	}

	function move(offset: number) {
		if (filtered.length === 0) return;
		const index = filtered.findIndex((face) => face.id === activeId);
		const next = Math.min(filtered.length - 1, Math.max(0, index + offset));
		activeId = filtered[next].id;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') move(1);
		else if (e.key === 'ArrowUp') move(-1);
		else if (e.key === 'PageDown') move(8);
		else if (e.key === 'PageUp') move(-8);
		else if (e.key === 'Enter' && activeId) onselect(activeId);
		else if (e.key === 'Escape') onclose();
		else return;
		e.preventDefault();
		e.stopPropagation();
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
		<input
			class="font-picker-search"
			type="search"
			placeholder="Search fonts"
			aria-label="Search fonts"
			role="combobox"
			aria-expanded="true"
			aria-controls="{uid}-list"
			aria-activedescendant={activeId ? `${uid}-${activeId}` : undefined}
			bind:value={query}
			onkeydown={handleKeydown}
			{@attach focus}
		/>
		<ul class="font-picker-list" id="{uid}-list" role="listbox" aria-label="Fonts" bind:this={list}>
			{#each families as family (family.name)}
				<li class="font-picker-family" role="presentation">{family.name}</li>
				{#each family.faces as face (face.id)}
					{@const warning = coverageWarning(faces, face.id, language)}
					<li
						id="{uid}-{face.id}"
						class="font-picker-option"
						class:active={face.id === activeId}
						class:selected={face.id === value}
						role="option"
						aria-selected={face.id === value}
						aria-label={face.title}
						tabindex="-1"
						data-face={face.id}
						onclick={() => onselect(face.id)}
						onkeydown={(e) => e.key === 'Enter' && onselect(face.id)}
					>
						<FontPreview {origin} faceId={face.id} text={sample} size={18} lazy />
						<span class="font-picker-name">
							{face.title}
							{#if warning}<span class="font-picker-warning" title={warning}>⚠</span>{/if}
						</span>
					</li>
				{/each}
			{:else}
				<li class="font-picker-empty" role="presentation">No font matches “{query}”.</li>
			{/each}
		</ul>
	</div>
</div>
