<script lang="ts">
	import { untrack } from 'svelte';
	import { loadGlyphs, renderText, type GlyphSet } from '../../fonts/glyphs';

	let {
		origin,
		faceId,
		text,
		size = 16,
		lazy = false,
	}: {
		origin: string;
		faceId: string;
		/** The sample text, drawn in the face. Shown as plain text while the glyphs load, or if there are none. */
		text: string;
		/** Font size in CSS pixels. */
		size?: number;
		/** Load the glyphs only once the preview scrolls into view. */
		lazy?: boolean;
	} = $props();

	// Whether the preview may load: at once, or when it scrolls into view.
	let visible = $state(untrack(() => !lazy));
	let status = $state<'loading' | 'ready' | 'missing'>('loading');
	let canvas = $state<HTMLCanvasElement>();

	function observe(element: HTMLElement) {
		if (visible || typeof IntersectionObserver === 'undefined') {
			visible = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					visible = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}

	$effect(() => {
		const target = canvas;
		if (!visible || !target) return;
		const sample = text;
		const fontSize = size;
		let cancelled = false;
		status = 'loading';
		loadGlyphs(origin, faceId).then((glyphs) => {
			if (cancelled) return;
			if (!glyphs) {
				status = 'missing';
				return;
			}
			draw(target, glyphs, sample, fontSize);
			status = 'ready';
		});
		return () => (cancelled = true);
	});

	function draw(target: HTMLCanvasElement, glyphs: GlyphSet, sample: string, fontSize: number) {
		const ratio = window.devicePixelRatio || 1;
		const image = renderText(glyphs, sample, fontSize, ratio);
		target.width = image.width;
		target.height = image.height;
		target.style.width = `${image.width / ratio}px`;
		target.style.height = `${image.height / ratio}px`;
		const context = target.getContext('2d');
		if (!context) return;
		const [r, g, b] = rgb(getComputedStyle(target).color);
		const pixels = context.createImageData(image.width, image.height);
		for (let i = 0; i < image.alpha.length; i++) {
			pixels.data[i * 4] = r;
			pixels.data[i * 4 + 1] = g;
			pixels.data[i * 4 + 2] = b;
			pixels.data[i * 4 + 3] = image.alpha[i];
		}
		context.putImageData(pixels, 0, 0);
	}

	/** `rgb(…)` / `rgba(…)` as computed by the browser. */
	function rgb(color: string): [number, number, number] {
		const channels = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
		return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
	}
</script>

<span
	class="font-preview"
	class:ready={status === 'ready'}
	class:missing={status === 'missing'}
	{@attach observe}
>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
	{#if status !== 'ready'}
		<span class="font-preview-text">{text}</span>
	{/if}
</span>
