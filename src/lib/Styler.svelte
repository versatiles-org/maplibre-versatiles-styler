<script lang="ts">
	import type { Map as MLGLMap, StyleSpecification } from 'maplibre-gl';
	import { osm } from '@versatiles/style';
	import type { Palette } from '@versatiles/style';
	import type { VersaTilesStylerConfig } from './types';
	import {
		PALETTES,
		DEFAULT_STYLE_KEY,
		vectorDefaults,
		satelliteDefaults,
		vectorStateFromConfig,
		satelliteStateFromConfig,
		buildVectorStyle,
		buildSatelliteStyle,
		containerBackground,
		minimalConfig,
		styleCode,
		type StyleKey,
		type StyleSources,
		type VectorState,
		type SatelliteState,
	} from './style_config';
	import { downloadStyle, copyStyleCode } from './export';
	import { loadOrigin, type LoadedTileJSON } from './sources';
	import { languageOptions } from './languages';
	import { onDestroy, untrack } from 'svelte';
	import { HashManager } from './hash';
	import SidebarSection from './components/SidebarSection.svelte';
	import VectorStylePanel from './components/VectorStylePanel.svelte';
	import SatelliteStylePanel from './components/SatelliteStylePanel.svelte';

	let { map, config }: { map: MLGLMap; config: VersaTilesStylerConfig } = $props();
	const uid = $props.id();
	let origin = $state(untrack(() => config.origin ?? window.location.origin));
	let paneOpen = $state(untrack(() => config.open ?? false));

	// ── Sources ──────────────────────────────────────────────────────────────────
	// All TileJSONs of an origin load in parallel. `undefined` while loading, `null` when the
	// server does not provide the source.

	let sources = $derived(loadOrigin(origin));
	let osmTileJSON = $state<LoadedTileJSON | undefined>();
	let satelliteTileJSON = $state<LoadedTileJSON | undefined>();
	let elevationTileJSON = $state<LoadedTileJSON | undefined>();

	$effect(() => {
		const current = sources;
		osmTileJSON = satelliteTileJSON = elevationTileJSON = undefined;
		let outdated = false;
		current.osm.then((tj) => !outdated && (osmTileJSON = tj));
		current.satellite.then((tj) => !outdated && (satelliteTileJSON = tj));
		current.elevation.then((tj) => !outdated && (elevationTileJSON = tj));
		return () => (outdated = true);
	});

	// Vector themes are listed until the OSM TileJSON turns out to be missing; satellite once it loaded.
	let styleKeys: StyleKey[] = $derived([
		...(osmTileJSON === null ? [] : PALETTES),
		...(satelliteTileJSON ? (['satellite'] as const) : []),
	]);
	let overlayAvailable = $derived(osmTileJSON !== null);
	let hasElevation = $derived(Boolean(elevationTileJSON));
	let languages = $derived(languageOptions(osmTileJSON ? osm.languages(osmTileJSON) : []));

	// ── Options ──────────────────────────────────────────────────────────────────

	let currentStyleKey = $state<StyleKey>(DEFAULT_STYLE_KEY);
	let isSatellite = $derived(currentStyleKey === 'satellite');
	let vectorState = $state<VectorState>(vectorDefaults('colorful'));
	let satelliteState = $state<SatelliteState>(satelliteDefaults());
	let currentVectorDefaults = $derived(
		isSatellite ? null : vectorDefaults(currentStyleKey as Palette)
	);

	function setBaseStyle(key: StyleKey, hashConfig?: Record<string, unknown> | null) {
		if (currentStyleKey !== key) {
			currentStyleKey = key;
			hashManager?.setStyleKey(key);
		}
		if (key === 'satellite') {
			satelliteState = satelliteStateFromConfig(hashConfig);
		} else {
			vectorState = vectorStateFromConfig(key, hashConfig);
		}
	}

	// ── Rendering ────────────────────────────────────────────────────────────────

	/**
	 * The style for the current options, or `undefined` while a TileJSON it needs is still loading.
	 * Sources are only read when the options need them, so a source that arrives later and changes
	 * nothing does not rebuild — and reload — the style.
	 */
	function currentStyle(): StyleSpecification | undefined {
		if (currentStyleKey === 'satellite') {
			const state = $state.snapshot(satelliteState) as SatelliteState;
			const satellite = satelliteTileJSON;
			if (!satellite) return undefined;
			const stateSources = styleSources(state.osmOverlay !== false, state.features);
			if (!stateSources) return undefined;
			return buildSatelliteStyle(state, origin, { ...stateSources, satellite });
		}
		const state = $state.snapshot(vectorState) as VectorState;
		const stateSources = styleSources(true, state.features);
		if (!stateSources?.osm) return undefined;
		return buildVectorStyle(currentStyleKey, state, origin, stateSources);
	}

	function styleSources(
		needsOsm: boolean,
		features: VectorState['features'] | SatelliteState['features']
	): StyleSources | undefined {
		const result: StyleSources = {};
		if (needsOsm) {
			if (osmTileJSON === undefined) return undefined;
			if (osmTileJSON) result.osm = osmTileJSON;
		}
		if (features.terrain !== false || features.hillshade !== false) {
			if (elevationTileJSON === undefined) return undefined;
			if (elevationTileJSON) result.elevation = elevationTileJSON;
		}
		return result;
	}

	$effect(() => {
		const style = currentStyle();
		if (!style) return;
		untrack(() => {
			// `diff: false` forces a full style reload. With the default diff,
			// MapLibre applies the rebuilt style to its model (map.getStyle() is
			// correct) but can leave already-rendered tiles showing the previous
			// paint until the next interaction.
			map.setStyle(style, { diff: false });
			hashManager?.setConfig(minimalConfig(currentStyleKey, vectorState, satelliteState));
		});
	});

	// The container shows around the globe; its colour follows the style key, and the host's own value
	// comes back when the styler is removed.
	const container = untrack(() => map.getContainer());
	const hostBackground = container.style.backgroundColor;
	$effect(() => {
		container.style.backgroundColor = containerBackground(currentStyleKey);
	});

	// Switch away from a style only once its source is known to be missing, not while it loads.
	$effect(() => {
		const tileJSON = currentStyleKey === 'satellite' ? satelliteTileJSON : osmTileJSON;
		if (tileJSON === null && styleKeys.length > 0) {
			const fallback = styleKeys[0];
			untrack(() => setBaseStyle(fallback));
		}
	});

	// ── Export ───────────────────────────────────────────────────────────────────

	function handleDownload() {
		const style = currentStyle();
		if (style) downloadStyle(style);
	}

	async function handleCopyCode() {
		const loaded: StyleSources = {
			osm: osmTileJSON ?? undefined,
			satellite: satelliteTileJSON ?? undefined,
			elevation: elevationTileJSON ?? undefined,
		};
		await copyStyleCode(
			styleCode(
				currentStyleKey,
				$state.snapshot(vectorState) as VectorState,
				$state.snapshot(satelliteState) as SatelliteState,
				origin,
				loaded
			)
		);
	}

	function handleOriginChange(e: Event) {
		origin = (e.target as HTMLInputElement).value;
	}

	// Initialize hash management and style
	let hashManager: HashManager | undefined;
	untrack(() => {
		if (config.hash !== false) {
			hashManager = new HashManager(map, (key, cfg) => setBaseStyle(key, cfg));
			const { styleKey, config: hashConfig } = hashManager.initialize();
			setBaseStyle(styleKey, hashConfig);
		} else {
			setBaseStyle(DEFAULT_STYLE_KEY);
		}
	});

	onDestroy(() => {
		hashManager?.destroy();
		container.style.backgroundColor = hostBackground;
	});
</script>

<div class="maplibregl-ctrl maplibregl-ctrl-group">
	<button
		type="button"
		class="maplibregl-ctrl-icon"
		title="Toggle style editor"
		onclick={() => (paneOpen = !paneOpen)}
	></button>
</div>
{#if paneOpen}
	<div class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane hide-scrollbar">
		<SidebarSection title="Origin">
			<div class="entry text-container">
				<label for="{uid}-origin">Origin</label>
				<div class="input">
					<input id="{uid}-origin" type="text" value={origin} onchange={handleOriginChange} />
				</div>
			</div>
		</SidebarSection>
		<SidebarSection title="Base style" open listClass="style-list">
			{#each styleKeys as key (key)}
				<label class:satellite={key === 'satellite'}>
					<input
						type="radio"
						value={key}
						checked={currentStyleKey === key}
						onclick={() => setBaseStyle(key)}
					/>
					<span>{key}</span>
				</label>
			{/each}
		</SidebarSection>
		{#if isSatellite}
			<SatelliteStylePanel
				bind:options={satelliteState}
				{overlayAvailable}
				elevationAvailable={hasElevation}
				fontFaces={sources.fontFaces()}
				{languages}
			/>
		{:else if currentVectorDefaults}
			<VectorStylePanel
				bind:options={vectorState}
				defaults={currentVectorDefaults}
				{hasElevation}
				fontFaces={sources.fontFaces()}
				{languages}
			/>
		{/if}
		<SidebarSection title="Export">
			<div class="entry button-container">
				<button onclick={handleDownload}>Download style.json</button>
				<button onclick={handleCopyCode}>Copy style code</button>
			</div>
		</SidebarSection>
		<p class="github-link">
			<a
				href="https://github.com/versatiles-org/maplibre-versatiles-styler"
				target="_blank"
				rel="noopener noreferrer">Improve me on GitHub</a
			>
		</p>
	</div>
{/if}
