<script module lang="ts">
	/** Closes the hint that is open: there is one at a time. */
	let closeCurrent: (() => void) | undefined;
</script>

<script lang="ts">
	import { portalToMap } from './popover';

	let { label, hint }: { label: string; hint: string } = $props();

	const uid = $props.id();

	let button = $state<HTMLButtonElement>();
	/** Opened by a click or a tap: stays until it is closed. */
	let pinned = $state(false);
	/** The mouse is over the ⓘ or the tooltip. */
	let hovered = $state(false);
	/** The ⓘ has the keyboard focus. */
	let focused = $state(false);
	let open = $derived(pinned || hovered || focused);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function close() {
		clearTimeout(timer);
		pinned = hovered = focused = false;
	}

	$effect(() => {
		if (!open) return;
		if (closeCurrent !== close) closeCurrent?.();
		closeCurrent = close;
		return () => {
			if (closeCurrent === close) closeCurrent = undefined;
		};
	});

	/** A mouse only: a finger has no hover, and its tap pins the hint. The delay lets the pointer pass by, and cross over to the tooltip. */
	function hover(e: PointerEvent, over: boolean) {
		if (e.pointerType !== 'mouse') return;
		clearTimeout(timer);
		timer = setTimeout(() => (hovered = over), 150);
	}

	/** A click pins the hint, also one that the hover has already opened; the next click closes it. */
	export function toggle() {
		if (pinned) close();
		else {
			clearTimeout(timer);
			pinned = true;
		}
	}

	/** Places the tooltip below the ⓘ — above it when there is no room — and within the pane's width. */
	function place(tip: HTMLElement) {
		const icon = button;
		if (!icon) return;
		const margin = 8;
		const gap = 8;
		const update = () => {
			const pane = (
				icon.closest('.maplibregl-pane') ?? document.documentElement
			).getBoundingClientRect();
			const rect = icon.getBoundingClientRect();
			// The tooltip follows its row; once the pane has scrolled the ⓘ away, it goes.
			if (rect.bottom < pane.top || rect.top > pane.bottom) return close();
			const min = Math.max(margin, pane.left + margin);
			const max = Math.min(window.innerWidth, pane.right) - margin;
			tip.style.maxWidth = `${max - min}px`;
			const center = rect.left + rect.width / 2;
			const width = tip.offsetWidth;
			const height = tip.offsetHeight;
			const left = Math.max(min, Math.min(center - 20, max - width));
			const below = rect.bottom + gap + height <= window.innerHeight - margin;
			tip.style.left = `${left}px`;
			tip.style.top = `${below ? rect.bottom + gap : rect.top - gap - height}px`;
			tip.style.setProperty('--arrow', `${Math.max(10, Math.min(center - left, width - 10))}px`);
			tip.classList.toggle('above', !below);
		};
		update();

		// A click in the row keeps a pinned hint, so the setting can be tried while reading about it.
		const row = icon.closest('.entry') ?? icon;
		const closeOutside = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!tip.contains(target) && !row.contains(target)) close();
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			close();
		};
		document.addEventListener('pointerdown', closeOutside, true);
		document.addEventListener('keydown', handleEscape);
		window.addEventListener('scroll', update, true);
		window.addEventListener('resize', update);
		return () => {
			document.removeEventListener('pointerdown', closeOutside, true);
			document.removeEventListener('keydown', handleEscape);
			window.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
		};
	}
</script>

<button
	type="button"
	class="hint-button"
	aria-label="About {label}"
	aria-expanded={open}
	aria-describedby={open ? `${uid}-tip` : undefined}
	bind:this={button}
	onclick={toggle}
	onpointerenter={(e) => hover(e, true)}
	onpointerleave={(e) => hover(e, false)}
	onfocus={(e) => (focused = e.currentTarget.matches(':focus-visible'))}
	onblur={() => (focused = false)}
></button>
{#if open && button}
	<div class="maplibregl-versatiles-styler hint-tip-layer" {@attach portalToMap(button)}>
		<div
			class="hint-tip"
			role="tooltip"
			id="{uid}-tip"
			onpointerenter={(e) => hover(e, true)}
			onpointerleave={(e) => hover(e, false)}
			{@attach place}
		>
			{hint}
		</div>
	</div>
{/if}
