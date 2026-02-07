import type { Map as MLGLMap } from 'maplibre-gl';

const VALID_STYLE_KEYS = new Set([
	'colorful',
	'eclipse',
	'graybeard',
	'shadow',
	'neutrino',
	'satellite',
]);
const DEFAULT_STYLE_KEY = 'colorful';
const THROTTLE_MS = 300;

export class HashManager {
	private map: MLGLMap;
	private onStyleChange: (key: string) => void;
	private currentStyleKey: string = DEFAULT_STYLE_KEY;
	private updating = false;
	private throttleTimer: ReturnType<typeof setTimeout> | null = null;

	private boundOnMoveEnd: () => void;
	private boundOnHashChange: () => void;

	constructor(map: MLGLMap, onStyleChange: (key: string) => void) {
		this.map = map;
		this.onStyleChange = onStyleChange;
		this.boundOnMoveEnd = () => this.onMoveEnd();
		this.boundOnHashChange = () => this.onHashChange();
	}

	initialize(): string {
		this.tryDisableMapHash();

		const { mapView, styleKey } = this.parseHash();
		this.currentStyleKey = styleKey;

		if (mapView) {
			this.map.jumpTo({
				center: [mapView.lng, mapView.lat],
				zoom: mapView.zoom,
				bearing: mapView.bearing,
				pitch: mapView.pitch,
			});
		}

		this.map.on('moveend', this.boundOnMoveEnd);
		window.addEventListener('hashchange', this.boundOnHashChange);

		// Write initial hash once map is ready
		if (this.map.loaded()) {
			this.updateHash();
		} else {
			this.map.once('load', () => this.updateHash());
		}

		return this.currentStyleKey;
	}

	setStyleKey(key: string): void {
		this.currentStyleKey = key;
		this.updateHash();
	}

	destroy(): void {
		this.map.off('moveend', this.boundOnMoveEnd);
		window.removeEventListener('hashchange', this.boundOnHashChange);
		if (this.throttleTimer !== null) {
			clearTimeout(this.throttleTimer);
			this.throttleTimer = null;
		}
	}

	private parseHash(): { mapView: MapView | null; styleKey: string } {
		const hash = window.location.hash.replace(/^#/, '');
		if (!hash) return { mapView: null, styleKey: DEFAULT_STYLE_KEY };

		const params = new Map<string, string>();
		for (const segment of hash.split('&')) {
			const eqIndex = segment.indexOf('=');
			if (eqIndex > 0) {
				params.set(segment.slice(0, eqIndex), segment.slice(eqIndex + 1));
			}
		}

		let mapView: MapView | null = null;
		const mapStr = params.get('map');
		if (mapStr) {
			const parts = mapStr.split('/').map(Number);
			if (parts.length >= 3 && parts.every((n) => isFinite(n))) {
				mapView = {
					zoom: parts[0],
					lat: parts[1],
					lng: parts[2],
					bearing: parts[3] ?? 0,
					pitch: parts[4] ?? 0,
				};
			}
		}

		let styleKey = DEFAULT_STYLE_KEY;
		const styleStr = params.get('style');
		if (styleStr && VALID_STYLE_KEYS.has(styleStr)) {
			styleKey = styleStr;
		}

		return { mapView, styleKey };
	}

	private buildHash(): string {
		const center = this.map.getCenter();
		const zoom = this.map.getZoom();
		const bearing = this.map.getBearing();
		const pitch = this.map.getPitch();

		const precision = Math.max(0, Math.ceil(Math.log2(zoom) + Math.log2(180) + 8));
		const zStr = zoom.toFixed(2).replace(/\.?0+$/, '');
		const latStr = center.lat.toFixed(precision);
		const lngStr = center.lng.toFixed(precision);

		let mapValue = `${zStr}/${latStr}/${lngStr}`;
		if (bearing !== 0 || pitch !== 0) {
			const bStr = bearing.toFixed(1).replace(/\.?0+$/, '');
			const pStr = pitch.toFixed(1).replace(/\.?0+$/, '');
			mapValue += `/${bStr}/${pStr}`;
		}

		const parts = [`map=${mapValue}`];
		if (this.currentStyleKey !== DEFAULT_STYLE_KEY) {
			parts.push(`style=${this.currentStyleKey}`);
		}

		return '#' + parts.join('&');
	}

	private updateHash(): void {
		if (this.updating) return;
		if (this.throttleTimer !== null) {
			clearTimeout(this.throttleTimer);
		}
		this.throttleTimer = setTimeout(() => {
			this.throttleTimer = null;
			this.updating = true;
			window.history.replaceState(null, '', this.buildHash());
			this.updating = false;
		}, THROTTLE_MS);
	}

	private onMoveEnd(): void {
		if (this.updating) return;
		this.updateHash();
	}

	private onHashChange(): void {
		if (this.updating) return;
		this.updating = true;

		const { mapView, styleKey } = this.parseHash();

		if (mapView) {
			this.map.jumpTo({
				center: [mapView.lng, mapView.lat],
				zoom: mapView.zoom,
				bearing: mapView.bearing,
				pitch: mapView.pitch,
			});
		}

		if (styleKey !== this.currentStyleKey) {
			this.currentStyleKey = styleKey;
			this.onStyleChange(styleKey);
		}

		this.updating = false;
	}

	private tryDisableMapHash(): void {
		if (this.map._hash) {
			this.map._hash.remove();
		}
	}
}

interface MapView {
	zoom: number;
	lat: number;
	lng: number;
	bearing: number;
	pitch: number;
}
