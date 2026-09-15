<script lang="ts">
	let {
		hue,
		saturation,
		value,
		onchange,
		oncommit,
	}: {
		/** 0–360 */
		hue: number;
		/** 0–100, left to right */
		saturation: number;
		/** 0–100, bottom to top */
		value: number;
		onchange: (saturation: number, value: number) => void;
		/** The end of a drag: the moment to write without waiting. */
		oncommit: () => void;
	} = $props();

	const clamp = (n: number) => Math.min(100, Math.max(0, n));

	function pick(e: PointerEvent) {
		const area = e.currentTarget as HTMLElement;
		const rect = area.getBoundingClientRect();
		onchange(
			clamp(((e.clientX - rect.left) / rect.width) * 100),
			clamp(100 - ((e.clientY - rect.top) / rect.height) * 100)
		);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		const area = e.currentTarget as HTMLElement;
		area.setPointerCapture(e.pointerId);
		area.focus();
		pick(e);
	}

	function handlePointerMove(e: PointerEvent) {
		if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) pick(e);
	}

	function handlePointerUp(e: PointerEvent) {
		const area = e.currentTarget as HTMLElement;
		if (!area.hasPointerCapture(e.pointerId)) return;
		area.releasePointerCapture(e.pointerId);
		oncommit();
	}

	/** ←/→ saturation, ↑/↓ brightness, Shift for steps of 10, Home/End for the extremes of brightness. */
	function handleKeydown(e: KeyboardEvent) {
		const step = e.shiftKey ? 10 : 1;
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowDown: [0, -step],
			ArrowUp: [0, step],
			Home: [0, 100],
			End: [0, -100],
		};
		const move = moves[e.key];
		if (!move) return;
		e.preventDefault();
		onchange(clamp(Math.round(saturation) + move[0]), clamp(Math.round(value) + move[1]));
	}
</script>

<div
	class="color-area"
	style:--hue={hue}
	role="slider"
	tabindex="0"
	aria-label="Saturation and brightness"
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={Math.round(saturation)}
	aria-valuetext="saturation {Math.round(saturation)} %, brightness {Math.round(value)} %"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	onkeydown={handleKeydown}
	onkeyup={oncommit}
>
	<span class="color-area-thumb" style:left="{saturation}%" style:top="{100 - value}%"></span>
</div>
