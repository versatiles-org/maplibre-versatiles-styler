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

function encodeConfig(obj: Record<string, unknown>): string {
	const json = JSON.stringify(obj);
	const bytes = new TextEncoder().encode(json);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeConfig(str: string): Record<string, unknown> | null {
	try {
		const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		const json = new TextDecoder().decode(bytes);
		const result = JSON.parse(json);
		if (result && typeof result === 'object' && !Array.isArray(result)) return result;
		return null;
	} catch {
		return null;
	}
}

export class HashManager {
	private map: MLGLMap;
	private onStyleChange: (key: string, config: Record<string, unknown> | null) => void;
	private currentStyleKey: string = DEFAULT_STYLE_KEY;
	private currentConfigEncoded: string | null = null;
	private updating = false;
	private throttleTimer: ReturnType<typeof setTimeout> | null = null;

	private boundOnMoveEnd: () => void;
	private boundOnHashChange: () => void;

	constructor(
		map: MLGLMap,
		onStyleChange: (key: string, config: Record<string, unknown> | null) => void
	) {
		this.map = map;
		this.onStyleChange = onStyleChange;
		this.boundOnMoveEnd = () => this.onMoveEnd();
		this.boundOnHashChange = () => this.onHashChange();
	}

	initialize(): { styleKey: string; config: Record<string, unknown> | null } {
		this.tryDisableMapHash();

		const { mapView, styleKey, config } = this.parseHash();
		this.currentStyleKey = styleKey;
		this.currentConfigEncoded = config ? encodeConfig(config) : null;

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

		return { styleKey: this.currentStyleKey, config };
	}

	setStyleKey(key: string): void {
		this.currentStyleKey = key;
		this.currentConfigEncoded = null;
		this.updateHash();
	}

	setConfig(config: Record<string, unknown>): void {
		const encoded = Object.keys(config).length === 0 ? null : encodeConfig(config);
		if (encoded === this.currentConfigEncoded) return;
		this.currentConfigEncoded = encoded;
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

	private parseHash(): {
		mapView: MapView | null;
		styleKey: string;
		config: Record<string, unknown> | null;
	} {
		const hash = window.location.hash.replace(/^#/, '');
		if (!hash) return { mapView: null, styleKey: DEFAULT_STYLE_KEY, config: null };

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

		let config: Record<string, unknown> | null = null;
		const configStr = params.get('config');
		if (configStr) {
			config = decodeConfig(configStr);
		}

		return { mapView, styleKey, config };
	}

	private buildHash(): string {
		const center = this.map.getCenter();
		const zoom = this.map.getZoom();
		const bearing = this.map.getBearing();
		const pitch = this.map.getPitch();

		const precision = Math.ceil((zoom * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10);
		const m = Math.pow(10, precision);
		const zStr = zoom.toFixed(2).replace(/\.?0+$/, '');
		const latStr = String(Math.round(center.lat * m) / m);
		const lngStr = String(Math.round(center.lng * m) / m);

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
		if (this.currentConfigEncoded) {
			parts.push(`config=${this.currentConfigEncoded}`);
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

		const { mapView, styleKey, config } = this.parseHash();

		if (mapView) {
			this.map.jumpTo({
				center: [mapView.lng, mapView.lat],
				zoom: mapView.zoom,
				bearing: mapView.bearing,
				pitch: mapView.pitch,
			});
		}

		const configEncoded = config ? encodeConfig(config) : null;
		const styleChanged = styleKey !== this.currentStyleKey;
		const configChanged = configEncoded !== this.currentConfigEncoded;

		if (styleChanged || configChanged) {
			this.currentStyleKey = styleKey;
			this.currentConfigEncoded = configEncoded;
			this.onStyleChange(styleKey, config);
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
