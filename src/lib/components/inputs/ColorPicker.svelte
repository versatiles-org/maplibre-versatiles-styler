<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import {
		channelGradient,
		formatHex,
		hsvaToHsla,
		hsvaToRgba,
		hslaToHsva,
		parseColor,
		sameColor,
		withRgb,
		type Hsla,
		type Hsva,
	} from '../../color_model';
	import { useColorPickerState, type ColorMode } from '../../color_picker_state.svelte';
	import { frameWriter } from '../../frame';
	import ColorArea from './ColorArea.svelte';
	import EditableValue from './EditableValue.svelte';
	import { placeBesidePane, portalToMap, type PopoverPosition } from './popover';

	let {
		title,
		value,
		alpha = true,
		anchor,
		onwrite,
		onclose,
	}: {
		/** What the color is for, e.g. "Water". */
		title: string;
		/** The color of the row. Changes from outside (a reset) move the picker along. */
		value: string;
		/** Whether the color has an alpha channel. */
		alpha?: boolean;
		/** The swatch button that opened the picker. */
		anchor: HTMLElement;
		/** Writes a color to the row — at most once per animation frame while dragging. */
		onwrite: (color: string) => void;
		onclose: () => void;
	} = $props();

	/** The color the picker opened with: Escape and the "old" swatch go back to it. */
	const initial = untrack(() => value);
	const BLACK: Hsva = { h: 0, s: 0, v: 0, a: 1 };
	const uid = $props.id();
	const shared = useColorPickerState();

	const MODES: { value: ColorMode; label: string }[] = [
		{ value: 'rgb', label: 'RGB' },
		{ value: 'hsl', label: 'HSL' },
		{ value: 'hex', label: 'Hex' },
	];

	interface Channel {
		key: string;
		label: string;
		name: string;
		value: number;
		max: number;
		unit: string;
		gradient: string;
		set: (value: number) => Hsva;
	}

	// The color being edited, unrounded. Converting back from the hex value on every change would lose the
	// hue of gray, black and white, and jitter by rounding.
	let hsva = $state<Hsva>(untrack(() => parseColor(value) ?? BLACK));
	let lastWritten = untrack(() => value);
	/**
	 * The HSL values last set on the HSL tab. White, black and gray have no saturation in HSV, so without
	 * them lightness 100 and back would turn the color gray.
	 */
	let lastHsl = $state<Hsla | undefined>();
	/** Once closed, late events (a field's `change` on blur) write nothing. */
	let closed = false;
	let position = $state<PopoverPosition>({
		left: 0,
		top: 0,
		maxHeight: 520,
		pointer: 0,
		beside: true,
	});

	let current = $derived(formatHex(hsva, alpha));
	let opaque = $derived(formatHex(hsva, false));

	let channels: Channel[] = $derived.by(() => {
		if (shared.mode === 'rgb') {
			const rgb = hsvaToRgba(hsva);
			return (['r', 'g', 'b'] as const).map((key) => ({
				key,
				label: key.toUpperCase(),
				name: { r: 'Red', g: 'Green', b: 'Blue' }[key],
				value: rgb[key],
				max: 255,
				unit: '',
				gradient: channelGradient(hsva, key),
				set: (value: number) => withRgb(hsva, { [key]: value }),
			}));
		}
		const hsl =
			lastHsl && formatHex(hslaToHsva(lastHsl)) === formatHex(hsva) && lastHsl.h === hsva.h
				? lastHsl
				: hsvaToHsla(hsva);
		return (['h', 's', 'l'] as const).map((key) => ({
			key,
			label: key.toUpperCase(),
			name: { h: 'Hue', s: 'Saturation', l: 'Lightness' }[key],
			value: hsl[key],
			max: key === 'h' ? 360 : 100,
			unit: key === 'h' ? '°' : '%',
			gradient: channelGradient(hsva, `hsl-${key}`),
			set: (value: number) => {
				lastHsl = { ...hsl, [key]: value, a: hsva.a };
				return hslaToHsva(lastHsl);
			},
		}));
	});

	const writer = frameWriter<string>((color) => {
		if (closed) return;
		lastWritten = color;
		onwrite(color);
	});

	// A change from outside, e.g. the reset button of the row: follow it, keeping the hue of a gray.
	$effect(() => {
		const outside = value;
		untrack(() => {
			if (sameColor(outside, lastWritten)) return;
			lastWritten = outside;
			const color = parseColor(outside);
			if (color) hsva = color.s === 0 || color.v === 0 ? { ...color, h: hsva.h } : color;
		});
	});

	onDestroy(() => writer.flush());

	function update(change: Partial<Hsva>) {
		if (closed) return;
		hsva = { ...hsva, ...change };
		const color = formatHex(hsva, alpha);
		// Back at the written color: a waiting write would now be wrong.
		if (sameColor(color, lastWritten)) writer.cancel();
		else writer.schedule(color);
	}

	function close() {
		writer.flush();
		closed = true;
		onclose();
	}

	/** Back to the color the picker opened with, and close. */
	function cancel() {
		writer.cancel();
		if (!sameColor(initial, lastWritten)) {
			lastWritten = initial;
			onwrite(initial);
		}
		closed = true;
		onclose();
	}

	function revert() {
		const color = parseColor(initial);
		if (color) update(color);
		writer.flush();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.defaultPrevented) return;
		if (e.key !== 'Enter' || (e.target as HTMLElement).closest('button')) return;
		e.preventDefault();
		close();
	}

	/** A typed channel value: clamped to the channel; text that is no number is ignored. */
	function commitChannel(channel: Channel, text: string) {
		const typed = parseFloat(text.trim().replace(',', '.'));
		if (!Number.isFinite(typed)) return;
		update(channel.set(Math.min(channel.max, Math.max(0, typed))));
		writer.flush();
	}

	function commitHex(input: HTMLInputElement) {
		const color = parseColor(input.value);
		if (color) {
			const hue = color.s === 0 || color.v === 0 ? hsva.h : color.h;
			update({ ...color, h: hue, a: alpha ? color.a : 1 });
			writer.flush();
		}
		input.value = formatHex(hsva, alpha);
	}

	/** Enter applies the text; Escape puts back a changed text, else it cancels the picker as usual. */
	function handleHexKeydown(e: KeyboardEvent) {
		const input = e.currentTarget as HTMLInputElement;
		if (e.key === 'Enter') {
			e.preventDefault();
			commitHex(input);
		} else if (e.key === 'Escape' && input.value !== current) {
			e.preventDefault();
			input.value = current;
		}
	}

	/** ←/→ move between the tabs. */
	function handleTabKeydown(e: KeyboardEvent) {
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const index = MODES.findIndex((mode) => mode.value === shared.mode);
		shared.mode = MODES[(index + step + MODES.length) % MODES.length].value;
		const tablist = (e.currentTarget as HTMLElement).parentElement;
		tick().then(() => tablist?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
	}

	function focus(area: HTMLElement) {
		// After `portalToMap` has moved the picker: moving a focused element drops its focus.
		queueMicrotask(() => area.querySelector<HTMLElement>('.color-area')?.focus());
	}
</script>

<div class="maplibregl-versatiles-styler color-picker-layer" {@attach portalToMap(anchor)}>
	{#if position.beside}
		<!-- points at the row that opened the picker -->
		<span
			class="popover-arrow"
			style:left="{position.left - 6}px"
			style:top="{position.top + position.pointer - 6}px"
		></span>
	{/if}
	<div
		class="color-picker"
		role="dialog"
		tabindex="-1"
		aria-label="Color for {title}"
		style:left="{position.left}px"
		style:top="{position.top}px"
		style:max-height="{position.maxHeight}px"
		style:--hue={hsva.h}
		style:--color={current}
		style:--color-opaque={opaque}
		onkeydown={handleKeydown}
		{@attach placeBesidePane({
			anchor,
			onclose: close,
			onescape: cancel,
			onplace: (p) => (position = p),
		})}
		{@attach focus}
	>
		<div class="color-picker-header">
			<span>Color for {title}</span>
			<button type="button" class="color-picker-close" aria-label="Close" onclick={close}>×</button>
		</div>
		<div class="color-picker-body">
			<div class="color-picker-top">
				<ColorArea
					hue={hsva.h}
					saturation={hsva.s}
					value={hsva.v}
					onchange={(s, v) => update({ s, v })}
					oncommit={() => writer.flush()}
				/>
				<div class="color-picker-compare">
					<button
						type="button"
						class="color-picker-old"
						style:--swatch={initial}
						title="Back to {initial}"
						aria-label="Back to the old color, {initial}"
						onclick={revert}
					></button>
					<span class="color-picker-new" aria-hidden="true"></span>
				</div>
			</div>
			<label class="color-picker-slider">
				<span aria-hidden="true">Hue</span>
				<input
					type="range"
					class="color-track color-track-hue"
					aria-label="Hue"
					min="0"
					max="360"
					step="1"
					value={Math.round(hsva.h)}
					oninput={(e) => update({ h: Number(e.currentTarget.value) })}
					onchange={() => writer.flush()}
				/>
				<output aria-hidden="true">{Math.round(hsva.h)}°</output>
			</label>
			{#if alpha}
				<label class="color-picker-slider">
					<span aria-hidden="true">Alpha</span>
					<input
						type="range"
						class="color-track color-track-alpha"
						aria-label="Alpha"
						min="0"
						max="100"
						step="1"
						value={Math.round(hsva.a * 100)}
						oninput={(e) => update({ a: Number(e.currentTarget.value) / 100 })}
						onchange={() => writer.flush()}
					/>
					<output aria-hidden="true">{Math.round(hsva.a * 100)}%</output>
				</label>
			{/if}
			<div class="color-picker-tabs" role="tablist" aria-label="Color channels">
				{#each MODES as mode (mode.value)}
					{@const selected = shared.mode === mode.value}
					<button
						type="button"
						role="tab"
						id="{uid}-tab-{mode.value}"
						aria-selected={selected}
						aria-controls="{uid}-channels"
						tabindex={selected ? 0 : -1}
						onclick={() => (shared.mode = mode.value)}
						onkeydown={handleTabKeydown}>{mode.label}</button
					>
				{/each}
			</div>
			<div
				class="color-picker-channels"
				role="tabpanel"
				id="{uid}-channels"
				aria-labelledby="{uid}-tab-{shared.mode}"
			>
				{#if shared.mode === 'hex'}
					<input
						class="color-picker-hex"
						type="text"
						aria-label="Hex"
						value={current}
						spellcheck="false"
						autocomplete="off"
						onkeydown={handleHexKeydown}
						onchange={(e) => commitHex(e.currentTarget)}
					/>
				{:else}
					{#each channels as channel (channel.key)}
						<div class="color-picker-slider">
							<span aria-hidden="true">{channel.label}</span>
							<input
								type="range"
								class="color-track"
								style:--track={channel.gradient}
								min="0"
								max={channel.max}
								step="1"
								value={Math.round(channel.value)}
								aria-label={channel.name}
								oninput={(e) => update(channel.set(Number(e.currentTarget.value)))}
								onchange={() => writer.flush()}
							/>
							<EditableValue
								label={channel.name}
								display="{Math.round(channel.value)}{channel.unit}"
								editText={String(Math.round(channel.value))}
								oncommit={(text) => commitChannel(channel, text)}
							/>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
