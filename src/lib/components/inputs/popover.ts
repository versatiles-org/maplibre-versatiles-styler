/** Where a popover sits: fixed position in the window. */
export interface PopoverPosition {
	left: number;
	top: number;
	maxHeight: number;
	/** Where the pointer sits on the popover's left edge, measured from its top. */
	pointer: number;
	/** Whether the popover stands beside its anchor, so a pointer to it makes sense. */
	beside: boolean;
}

/**
 * An attachment that moves a popover layer to the map container. Inside the control it would be clipped
 * by the sidebar: MapLibre gives controls a `transform`, which makes `position: fixed` relative to the
 * control. The layer carries the control's class, so its styles still apply.
 */
export function portalToMap(anchor: HTMLElement) {
	return portalTo(anchor.closest('.maplibregl-map') ?? document.body);
}

/** The same, for a caller that already holds the element to move the layer into. */
export function portalTo(target: Element) {
	return (layer: HTMLElement) => {
		target.appendChild(layer);
		return () => layer.remove();
	};
}

/** Popover layers of their own, which a click in must not count as a click outside. */
const NESTED_LAYERS = '.color-picker-layer, .font-picker-layer';

export interface PointPlacementOptions {
	/** Where the popover points, in client coordinates — for the inspector, where the map was clicked. */
	point: { x: number; y: number };
	onplace: (position: { left: number; top: number; maxHeight: number }) => void;
	onclose: () => void;
}

/**
 * An attachment that puts a popover next to a point on the map and keeps it in the window, flipping to
 * the other side of the point when it would not fit.
 *
 * Unlike `placeBesidePane` there is no anchor element to spare from the outside-click check, so the
 * popover closes on any click but its own — except in a picker it opened itself, which lives in a layer
 * of its own outside the popover's DOM.
 */
export function placeAtPoint(options: PointPlacementOptions) {
	const { point, onplace, onclose } = options;
	return (popup: HTMLElement) => {
		const margin = 8;
		const gap = 14;
		const update = () => {
			const maxHeight = window.innerHeight - 2 * margin;
			const height = Math.min(popup.offsetHeight, maxHeight);
			const width = popup.offsetWidth;
			const left =
				point.x + gap + width <= window.innerWidth - margin
					? point.x + gap
					: Math.max(margin, point.x - gap - width);
			const top = Math.max(margin, Math.min(point.y - 24, window.innerHeight - height - margin));
			onplace({ left, top, maxHeight });
		};
		const closeOutside = (event: PointerEvent) => {
			const target = event.target as Element;
			if (popup.contains(target)) return;
			if (typeof target.closest === 'function' && target.closest(NESTED_LAYERS)) return;
			onclose();
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				onclose();
			}
		};
		update();
		const resize = new ResizeObserver(update);
		resize.observe(popup);
		window.addEventListener('resize', update);
		document.addEventListener('pointerdown', closeOutside, true);
		document.addEventListener('keydown', handleEscape);
		return () => {
			resize.disconnect();
			window.removeEventListener('resize', update);
			document.removeEventListener('pointerdown', closeOutside, true);
			document.removeEventListener('keydown', handleEscape);
		};
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
	/** A cap of its own; by default a popover may use the window's height. */
	maxHeight?: number;
}

/**
 * An attachment that places a popover beside the sidebar, level with its anchor and inside the window,
 * and closes it on a click elsewhere or on Escape.
 */
export function placeBesidePane(options: PlacementOptions) {
	const { anchor, onplace, onclose, onescape = onclose, maxHeight: limit = Infinity } = options;
	return (popup: HTMLElement) => {
		const margin = 8;
		const update = () => {
			const pane = anchor.closest('.maplibregl-pane') ?? anchor;
			const paneRect = pane.getBoundingClientRect();
			const anchorRect = anchor.getBoundingClientRect();
			const maxHeight = Math.min(limit, window.innerHeight - 2 * margin);
			const height = Math.min(popup.offsetHeight, maxHeight);
			const beside = paneRect.right + margin + popup.offsetWidth <= window.innerWidth - margin;
			const left = beside
				? paneRect.right + margin
				: Math.max(margin, window.innerWidth - popup.offsetWidth - margin);
			// Level with the row that opened it, as far as the window allows.
			const anchorCenter = anchorRect.top + anchorRect.height / 2;
			const top = Math.max(
				margin,
				Math.min(anchorCenter - 40, window.innerHeight - height - margin)
			);
			const pointer = Math.min(Math.max(anchorCenter - top, 14), height - 14);
			onplace({ left, top, maxHeight, pointer, beside });
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
		// The popover changes its size while open (a panel opens, a field appears): place it again.
		const resize = new ResizeObserver(update);
		resize.observe(popup);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		document.addEventListener('pointerdown', closeOutside, true);
		document.addEventListener('keydown', handleEscape);
		return () => {
			resize.disconnect();
			document.removeEventListener('keydown', handleEscape);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
			document.removeEventListener('pointerdown', closeOutside, true);
		};
	};
}
