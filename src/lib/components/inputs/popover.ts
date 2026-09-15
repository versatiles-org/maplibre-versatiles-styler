/** Where a popover sits: fixed position in the window. */
export interface PopoverPosition {
	left: number;
	top: number;
	maxHeight: number;
}

/**
 * An attachment that moves a popover layer to the map container. Inside the control it would be clipped
 * by the sidebar: MapLibre gives controls a `transform`, which makes `position: fixed` relative to the
 * control. The layer carries the control's class, so its styles still apply.
 */
export function portalToMap(anchor: HTMLElement) {
	return (layer: HTMLElement) => {
		(anchor.closest('.maplibregl-map') ?? document.body).appendChild(layer);
		return () => layer.remove();
	};
}

export interface PlacementOptions {
	/** The button that opened the popover: it is placed next to it, and clicks on it do not close it. */
	anchor: HTMLElement;
	/** Called with the position on opening and whenever the window scrolls or resizes. */
	onplace: (position: PopoverPosition) => void;
	/** A click outside the popover and its anchor. */
	onclose: () => void;
	/** Escape while the focus is in the popover; default `onclose`. Handlers that call `preventDefault` win. */
	onescape?: () => void;
	maxHeight?: number;
}

/**
 * An attachment that places a popover beside the sidebar, level with its anchor and inside the window,
 * and closes it on a click elsewhere or on Escape.
 */
export function placeBesidePane(options: PlacementOptions) {
	const { anchor, onplace, onclose, onescape = onclose, maxHeight: limit = 520 } = options;
	return (popup: HTMLElement) => {
		const margin = 8;
		const update = () => {
			const pane = anchor.closest('.maplibregl-pane') ?? anchor;
			const paneRect = pane.getBoundingClientRect();
			const anchorRect = anchor.getBoundingClientRect();
			const maxHeight = Math.min(limit, window.innerHeight - 2 * margin);
			const height = Math.min(popup.offsetHeight, maxHeight);
			let left = paneRect.right + margin;
			if (left + popup.offsetWidth > window.innerWidth - margin) {
				left = Math.max(margin, window.innerWidth - popup.offsetWidth - margin);
			}
			const top = Math.min(
				Math.max(margin, anchorRect.top - 48),
				window.innerHeight - height - margin
			);
			onplace({ left, top: Math.max(margin, top), maxHeight });
		};
		const closeOutside = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!popup.contains(target) && !anchor.contains(target)) onclose();
		};
		// Escape wherever the focus is in the popover, e.g. on a button inside it.
		const handleEscape = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if (event.key === 'Escape' && popup.contains(document.activeElement)) {
				event.preventDefault();
				onescape();
			}
		};
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		document.addEventListener('pointerdown', closeOutside, true);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
			document.removeEventListener('pointerdown', closeOutside, true);
		};
	};
}
