<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Color } from '@versatiles/style';
	import {
		SPACES,
		SPACE_KEYS,
		channelGradient,
		channelsOf,
		colorError,
		formatChannel,
		formatHex,
		isSpace,
		parseChannel,
		parseColor,
		sameColor,
		withChannel,
	} from './color_model';
	import { useColorPickerState } from '../state/color_picker.svelte';
	import { frameWriter } from '../../browser/frame';
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
	const uid = $props.id();
	const shared = useColorPickerState();

	/**
	 * The color being edited, kept in the space it was last edited in. That space's channels then stay
	 * as they were set: sliding lightness to 100 and back keeps the hue, which a detour through the hex
	 * value would lose.
	 */
	let color = $state<Color>(untrack(() => parseColor(value) ?? Color.srgb(0, 0, 0)));
	let lastWritten = untrack(() => value);
	/** Why the typed text is no color, while it is wrong. */
	let hexError = $state<string | undefined>();
	/** Once closed, late events (a field's `change` on blur) write nothing. */
	let closed = false;
	let position = $state<PopoverPosition>({
		left: 0,
		top: 0,
		maxHeight: 520,
		pointer: 0,
		beside: true,
	});

	let current = $derived(formatHex(color, alpha));
	let opaque = $derived(formatHex(color, false));

	let channels = $derived.by(() => {
		const values = channelsOf(color, shared.space);
		return SPACES[shared.space].channels.map((channel) => ({
			...channel,
			value: values[channel.key],
			gradient: channelGradient(color, shared.space, channel.key),
		}));
	});

	const writer = frameWriter<string>((written) => {
		if (closed) return;
		lastWritten = written;
		onwrite(written);
	});

	// A change from outside, e.g. the reset button of the row.
	$effect(() => {
		const outside = value;
		untrack(() => {
			if (sameColor(outside, lastWritten)) return;
			lastWritten = outside;
			const parsed = parseColor(outside);
			if (parsed) color = parsed;
		});
	});

	onDestroy(() => writer.flush());

	function update(next: Color) {
		if (closed) return;
		color = alpha ? next : next.opaque();
		const written = formatHex(color, alpha);
		// Back at the written color: a waiting write would now be wrong.
		if (sameColor(written, lastWritten)) writer.cancel();
		else writer.schedule(written);
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
		const parsed = parseColor(initial);
		if (parsed) update(parsed);
		writer.flush();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.defaultPrevented) return;
		if (e.key !== 'Enter' || (e.target as HTMLElement).closest('button')) return;
		e.preventDefault();
		close();
	}

	/** A typed channel value: clamped to the channel; text that is no number is ignored. */
	function commitChannel(channel: (typeof channels)[number], text: string) {
		const typed = parseChannel(channel, text);
		if (typed === undefined) return;
		update(withChannel(color, shared.space, channel.key, typed));
		writer.flush();
	}

	function commitColorText(input: HTMLInputElement) {
		const parsed = parseColor(input.value);
		if (parsed) {
			hexError = undefined;
			update(parsed);
			writer.flush();
		} else {
			hexError = colorError(input.value);
		}
		input.value = current;
	}

	/** Enter applies the text; Escape puts back a changed text, else it cancels the picker as usual. */
	function handleColorTextKeydown(e: KeyboardEvent) {
		const input = e.currentTarget as HTMLInputElement;
		if (e.key === 'Enter') {
			e.preventDefault();
			commitColorText(input);
		} else if (e.key === 'Escape' && input.value !== current) {
			e.preventDefault();
			hexError = undefined;
			input.value = current;
		}
	}

	/** Once the picker is placed and visible: it is moved by `portalToMap` and hidden until then. */
	function focus(picker: HTMLElement) {
		picker.querySelector<HTMLElement>('.color-track')?.focus();
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
		style:--color={current}
		style:--color-opaque={opaque}
		onkeydown={handleKeydown}
		{@attach placeBesidePane({
			anchor,
			onclose: close,
			onescape: cancel,
			onplace: (p) => (position = p),
			onready: focus,
		})}
	>
		<div class="color-picker-header">
			<span>Color for {title}</span>
			<button type="button" class="color-picker-close" aria-label="Close" onclick={close}>×</button>
		</div>
		<div class="color-picker-body">
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
			<div class="color-picker-space">
				<label for="{uid}-space">Space</label>
				<select
					id="{uid}-space"
					aria-label="Color space"
					value={shared.space}
					onchange={(e) => isSpace(e.currentTarget.value) && (shared.space = e.currentTarget.value)}
				>
					{#each SPACE_KEYS as key (key)}
						<option value={key}>{SPACES[key].label}</option>
					{/each}
				</select>
			</div>
			<div class="color-picker-channels">
				{#each channels as channel (channel.key)}
					<div class="color-picker-slider">
						<span aria-hidden="true">{channel.label}</span>
						<span class="color-track-slot" style:--track={channel.gradient}>
							<input
								type="range"
								class="color-track"
								min={channel.min}
								max={channel.max}
								step={channel.step}
								value={channel.value}
								aria-label={channel.name}
								oninput={(e) =>
									update(
										withChannel(color, shared.space, channel.key, Number(e.currentTarget.value))
									)}
								onchange={() => writer.flush()}
							/>
						</span>
						<EditableValue
							label={channel.name}
							display={formatChannel(channel, channel.value)}
							editText={formatChannel(channel, channel.value).replace(channel.unit, '')}
							oncommit={(text) => commitChannel(channel, text)}
						/>
					</div>
				{/each}
			</div>
			{#if alpha}
				<label class="color-picker-slider">
					<span aria-hidden="true">Alpha</span>
					<span class="color-track-slot color-track-alpha">
						<input
							type="range"
							class="color-track"
							aria-label="Alpha"
							min="0"
							max="100"
							step="1"
							value={Math.round(color.alpha * 100)}
							oninput={(e) => update(color.with({ alpha: Number(e.currentTarget.value) / 100 }))}
							onchange={() => writer.flush()}
						/>
					</span>
					<output aria-hidden="true">{Math.round(color.alpha * 100)}%</output>
				</label>
			{/if}
			<label class="color-picker-text">
				<span aria-hidden="true">Hex</span>
				<input
					class="color-picker-hex"
					class:invalid={hexError !== undefined}
					type="text"
					aria-label="Hex"
					aria-invalid={hexError !== undefined}
					title={hexError ?? 'A color: hex, rgb(), hsl(), hwb(), oklab() or oklch()'}
					value={current}
					spellcheck="false"
					autocomplete="off"
					oninput={() => (hexError = undefined)}
					onkeydown={handleColorTextKeydown}
					onchange={(e) => commitColorText(e.currentTarget)}
				/>
			</label>
		</div>
	</div>
</div>
