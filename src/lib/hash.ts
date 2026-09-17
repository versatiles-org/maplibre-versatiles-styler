import type { Map as MLGLMap } from 'maplibre-gl';
import { DEFAULT_STYLE_KEY, toStyleKey, type StyleKey } from './style_config';

const THROTTLE_MS = 300;

function encodeConfig(obj: Record<string, unknown>): string {
	const json = JSON.stringify(obj);
	const bytes = new TextEncoder().encode(json);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The options encoded in a `config=` hash parameter, or `null` if it is not readable. Exported because
 * the import tool reads the same parameter out of a pasted link.
 */
export function decodeConfig(str: string): Record<string, unknown> | null {
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

/** How the styler's panel is told to the hash, and what it is when the hash says nothing. */
export interface PanelHash {
	defaultOpen: boolean;
	onChange: (open: boolean) => void;
}

export class HashManager {
	private map: MLGLMap;
	private onStyleChange: (key: StyleKey, config: Record<string, unknown> | null) => void;
	private panel: PanelHash | undefined;
	private currentStyleKey: StyleKey = DEFAULT_STYLE_KEY;
	private currentConfigEncoded: string | null = null;
	private currentPanelOpen = false;
	private updating = false;
	private throttleTimer: ReturnType<typeof setTimeout> | null = null;

	private boundOnMoveEnd: () => void;
	private boundOnHashChange: () => void;

	constructor(
		map: MLGLMap,
		onStyleChange: (key: StyleKey, config: Record<string, unknown> | null) => void,
		panel?: PanelHash
	) {
		this.map = map;
		this.onStyleChange = onStyleChange;
		this.panel = panel;
		this.boundOnMoveEnd = () => this.onMoveEnd();
		this.boundOnHashChange = () => this.onHashChange();
	}

	initialize(): {
		styleKey: StyleKey;
		config: Record<string, unknown> | null;
		/** Whether the panel is open, when the hash says so. */
		panelOpen: boolean | undefined;
	} {
		this.tryDisableMapHash();

		const { mapView, styleKey, config, panelOpen } = this.parseHash();
		this.currentStyleKey = styleKey;
		this.currentConfigEncoded = config ? encodeConfig(config) : null;
		this.currentPanelOpen = panelOpen ?? this.panel?.defaultOpen ?? false;

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

		return { styleKey: this.currentStyleKey, config, panelOpen };
	}

	/** The panel was opened or closed: the hash carries it, unless it is the styler's own default. */
	setPanelOpen(open: boolean): void {
		if (open === this.currentPanelOpen) return;
		this.currentPanelOpen = open;
		this.updateHash();
	}

	/**
	 * Writes the hash now, instead of at the end of the throttle window.
	 *
	 * Hash writes are throttled, so for up to `THROTTLE_MS` after an edit the URL still describes the
	 * previous state. That is invisible while the URL is only a bookmark, but the export dialog hands it
	 * out as *the* link to this map — and a link that silently omits the last change is worse than no
	 * link. Anything that reads the URL as a value should call this first.
	 */
	flush(): void {
		if (this.throttleTimer !== null) {
			clearTimeout(this.throttleTimer);
			this.throttleTimer = null;
		}
		this.updating = true;
		window.history.replaceState(null, '', this.buildHash());
		this.updating = false;
	}

	setStyleKey(key: StyleKey): void {
		this.currentStyleKey = key;
		this.currentConfigEncoded = null;
		this.updateHash();
	}

	setConfig(config: Record<string, unknown> | undefined): void {
		const encoded = config && Object.keys(config).length > 0 ? encodeConfig(config) : null;
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
		styleKey: StyleKey;
		config: Record<string, unknown> | null;
		panelOpen: boolean | undefined;
	} {
		const hash = window.location.hash.replace(/^#/, '');
		if (!hash)
			return { mapView: null, styleKey: DEFAULT_STYLE_KEY, config: null, panelOpen: undefined };

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

		// v5 style keys from links shared before v6 map to their closest theme.
		const styleKey = toStyleKey(params.get('style')) ?? DEFAULT_STYLE_KEY;

		let config: Record<string, unknown> | null = null;
		const configStr = params.get('config');
		if (configStr) {
			config = decodeConfig(configStr);
		}

		const panelStr = params.get('panel');
		const panelOpen = panelStr === 'open' ? true : panelStr === 'closed' ? false : undefined;

		return { mapView, styleKey, config, panelOpen };
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
		if (this.panel && this.currentPanelOpen !== this.panel.defaultOpen) {
			parts.push(`panel=${this.currentPanelOpen ? 'open' : 'closed'}`);
		}
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

		const { mapView, styleKey, config, panelOpen } = this.parseHash();

		if (mapView) {
			this.map.jumpTo({
				center: [mapView.lng, mapView.lat],
				zoom: mapView.zoom,
				bearing: mapView.bearing,
				pitch: mapView.pitch,
			});
		}

		if (this.panel) {
			const open = panelOpen ?? this.panel.defaultOpen;
			if (open !== this.currentPanelOpen) {
				this.currentPanelOpen = open;
				this.panel.onChange(open);
			}
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
