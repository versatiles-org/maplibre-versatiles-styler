<script lang="ts">
	import type { Map as MLGLMap, MapMouseEvent, StyleSpecification } from 'maplibre-gl';
	import { osm } from '@versatiles/style';
	import type { Palette } from '@versatiles/style';
	import type { VersaTilesStylerConfig } from '../types';
	import {
		PALETTES,
		DEFAULT_STYLE_KEY,
		vectorDefaults,
		satelliteDefaults,
		vectorStateFromConfig,
		satelliteStateFromConfig,
		buildVectorStyle,
		buildSatelliteStyle,
		codeTargets,
		configChangeCount,
		containerBackground,
		inspectSources,
		isDarkStyle,
		minimalConfig,
		overlaySupported,
		overlayDefaults,
		probeSatelliteState,
		probeVectorState,
		styleCode,
		styleForExport,
		type StyleKey,
		type StyleSources,
		type VectorState,
		type SatelliteState,
	} from '../style/config';
	import type { ImportResult } from '../transfer/import';
	import {
		colorIndex,
		describeFeatures,
		groupIndex,
		type InspectResult,
		type RenderedFeature,
	} from '../style/inspect';
	import {
		loadSources,
		openFreeMapSources,
		parseSources,
		serializeSources,
		protomapsSources,
		providerOf,
		vectorSchema,
		versatilesSources,
		type ChosenSources,
		type LoadedTileJSON,
		type Provider,
		type SourceConfig,
		type VectorSchema,
	} from '../style/sources';
	import { registerPMTiles } from '../style/pmtiles';
	import { languageOptions } from '../options/languages';
	import { onDestroy, untrack } from 'svelte';
	import { decodeConfig, encodeConfig, HashManager } from '../transfer/hash';
	import { provideFontPickerState } from './state/font_picker.svelte';
	import { provideColorPickerState } from './state/color_picker.svelte';
	import { labelTexts } from '../browser/map_labels';
	import { setStyleOptions, styleForEditing, type RenderedStyle } from '../style/update';
	import SidebarSection from './SidebarSection.svelte';
	import VectorStylePanel from './VectorStylePanel.svelte';
	import SatelliteStylePanel from './SatelliteStylePanel.svelte';
	import ThemeSelect from './ThemeSelect.svelte';
	import ExportDialog from './ExportDialog.svelte';
	import SourceOptions from './sections/SourceOptions.svelte';
	import InspectPopup from './InspectPopup.svelte';
	import ImportDialog from './ImportDialog.svelte';

	let { map, config }: { map: MLGLMap; config: VersaTilesStylerConfig } = $props();
	// The font pickers of this styler share their script filter and copied font, and read the map's labels.
	const fontPicker = provideFontPickerState();
	fontPicker.labelTexts = (layerIds) => labelTexts(map, layerIds);
	// The color pickers share their channel tab.
	provideColorPickerState();
	// Where the tiles and the assets come from: a VersaTiles server, which provides all of them.
	let sourceConfig = $state.raw<SourceConfig>(
		untrack(() => versatilesSources(config.origin ?? window.location.origin))
	);
	// Which provider's sources these are. It is a choice, not a reading of the config: a custom set of
	// sources may be the same as a provider's.
	let provider = $state<Provider>(untrack(() => providerOf(sourceConfig)));
	/** The sources each provider was left with, to come back to. */
	const leftSources: Partial<Record<Provider, SourceConfig>> = {};

	// A PMTiles archive is read through a protocol, which only the page can register with MapLibre.
	const pmtiles = untrack(() => config.addProtocol);
	if (pmtiles) registerPMTiles(pmtiles);

	const PROVIDERS: { value: Provider; label: string }[] = untrack(() =>
		config.externalSources
			? [
					{ value: 'versatiles', label: 'VersaTiles' },
					{ value: 'openfreemap', label: 'OpenFreeMap' },
					...(pmtiles ? [{ value: 'protomaps' as const, label: 'Protomaps' }] : []),
					{ value: 'custom', label: 'Custom' },
				]
			: [{ value: 'versatiles', label: 'VersaTiles' }]
	);

	let sourcesLabel = $derived.by(() => {
		if (provider !== 'versatiles') {
			return PROVIDERS.find((option) => option.value === provider)?.label ?? provider;
		}
		try {
			return new URL(sourceConfig.assets).host;
		} catch {
			return sourceConfig.assets;
		}
	});

	/** The sources a provider starts with. Custom sources start as the ones in use, to be changed. */
	function providerSources(next: Provider): SourceConfig {
		if (next === 'openfreemap') return openFreeMapSources();
		if (next === 'protomaps') return protomapsSources();
		if (next === 'custom') return sourceConfig;
		return versatilesSources(config.origin ?? window.location.origin);
	}

	function setProvider(next: Provider) {
		leftSources[provider] = sourceConfig;
		provider = next;
		setSourceConfig(leftSources[next] ?? providerSources(next));
	}
	let paneOpen = $state(untrack(() => config.open ?? false));

	// ── Sources ──────────────────────────────────────────────────────────────────
	// All TileJSONs load in parallel. `undefined` while loading, `null` when the
	// source is not available.

	let sources = $derived(loadSources(sourceConfig));
	let vectorTileJSON = $state<LoadedTileJSON | undefined>();
	let satelliteTileJSON = $state<LoadedTileJSON | undefined>();
	let elevationTileJSON = $state<LoadedTileJSON | undefined>();

	$effect(() => {
		const current = sources;
		vectorTileJSON = satelliteTileJSON = elevationTileJSON = undefined;
		let outdated = false;
		current.vector.then((tj) => !outdated && (vectorTileJSON = tj));
		current.satellite.then((tj) => !outdated && (satelliteTileJSON = tj));
		current.elevation.then((tj) => !outdated && (elevationTileJSON = tj));
		return () => (outdated = true);
	});

	// Vector themes are listed until the OSM TileJSON turns out to be missing; satellite once it loaded.
	let styleKeys: StyleKey[] = $derived([
		...(vectorTileJSON === null ? [] : PALETTES),
		...(satelliteTileJSON ? (['satellite'] as const) : []),
	]);
	// The schema of the vector tiles decides which builder draws them. Tiles of no schema the styler
	// knows are taken for Shortbread, as everything a VersaTiles server calls `osm` used to be.
	let schema = $derived<VectorSchema>(
		sourceConfig.schema ??
			(vectorTileJSON ? vectorSchema(vectorTileJSON) : undefined) ??
			'shortbread'
	);
	let overlayAvailable = $derived(vectorTileJSON !== null && overlaySupported(schema));
	let hasElevation = $derived(Boolean(elevationTileJSON));
	let languages = $derived(languageOptions(vectorTileJSON ? osm.languages(vectorTileJSON) : []));

	/** The layers and the label topics of the vector style, which are those of the schema. */
	let vectorGroups = $derived(inspectSources(DEFAULT_STYLE_KEY, schema));

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
	 * The style for the current options and what it was built from, or `undefined` while a TileJSON it
	 * needs is still loading. Sources are only read when the options need them, so a source that
	 * arrives later and changes nothing does not rebuild the style.
	 */
	function currentStyle(
		probeColors?: Record<string, string>
	): { style: StyleSpecification; rendered: RenderedStyle } | undefined {
		const styleKey = currentStyleKey;
		if (styleKey === 'satellite') {
			const state = $state.snapshot(satelliteState) as SatelliteState;
			const satellite = satelliteTileJSON;
			if (!satellite) return undefined;
			const stateSources = styleSources(state.osmOverlay !== false, state.features);
			if (!stateSources) return undefined;
			return {
				style: buildSatelliteStyle(
					probeColors ? probeSatelliteState(state, probeColors) : state,
					sourceConfig.assets,
					{
						...stateSources,
						satellite,
					}
				),
				rendered: { styleKey, sources: sourceConfig, options: state },
			};
		}
		const state = $state.snapshot(vectorState) as VectorState;
		const stateSources = styleSources(true, state.features);
		if (!stateSources?.vector) return undefined;
		return {
			style: buildVectorStyle(
				styleKey,
				probeColors ? probeVectorState(state, probeColors) : state,
				sourceConfig.assets,
				stateSources
			),
			rendered: { styleKey, sources: sourceConfig, options: state },
		};
	}

	function styleSources(
		needsOsm: boolean,
		features: VectorState['features'] | SatelliteState['features']
	): StyleSources | undefined {
		const result: StyleSources = { schema };
		if (needsOsm) {
			if (vectorTileJSON === undefined) return undefined;
			if (vectorTileJSON) result.vector = vectorTileJSON;
		}
		if (features.terrain !== false || features.hillshade !== false) {
			if (elevationTileJSON === undefined) return undefined;
			if (elevationTileJSON) result.elevation = elevationTileJSON;
		}
		return result;
	}

	// The options that differ from the defaults: stored in the URL hash, and they tell the panels which
	// sections have changes.
	let minimal = $derived(
		minimalConfig(
			currentStyleKey,
			$state.snapshot(vectorState) as VectorState,
			$state.snapshot(satelliteState) as SatelliteState
		)
	);

	// What the style on the map was built from, to decide how the next one is applied.
	let rendered: RenderedStyle | undefined;

	$effect(() => {
		const next = currentStyle();
		if (!next) return;
		untrack(() => {
			// MapLibre's diff keeps the loaded tiles and repaints in place — no blank map, no tile
			// requests. Changes it cannot apply reload the style in full (see `style_update.ts`).
			// `isStyleLoaded` warns when the map has no style at all, so it is only asked once the styler
			// has put one there; the first style is never a diff anyway.
			const styleLoaded = rendered === undefined || map.isStyleLoaded() === true;
			map.setStyle(
				styleForEditing(next.style),
				setStyleOptions(rendered, next.rendered, styleLoaded)
			);
			rendered = next.rendered;
			hashManager?.setConfig(minimal);
		});
	});

	// The container shows around the globe; its colour follows the style key, and the host's own value
	// comes back when the styler is removed.
	const container = untrack(() => map.getContainer());
	const hostBackground = container.style.backgroundColor;
	$effect(() => {
		container.style.backgroundColor = containerBackground(currentStyleKey);
		// A dark map gets a dark panel; the pickers are inside the container too.
		container.classList.toggle('versatiles-styler-dark', isDarkStyle(currentStyleKey));
	});

	// Switch away from a style only once its source is known to be missing, not while it loads.
	$effect(() => {
		const tileJSON = currentStyleKey === 'satellite' ? satelliteTileJSON : vectorTileJSON;
		if (tileJSON === null && styleKeys.length > 0) {
			const fallback = styleKeys[0];
			untrack(() => setBaseStyle(fallback));
		}
	});

	// ── Inspector ────────────────────────────────────────────────────────────────

	/** Whether a click on the map says what is under it, and how it got its looks. */
	let inspectOn = $state(false);
	/** The features of the last click, described when it happened. */
	let inspectResult = $state<InspectResult | undefined>();

	/**
	 * What names the layers of the style on the map. Built only while the inspector is on, and only
	 * when a click reads it: the color index costs a style build per color key — about 100 ms — and
	 * nothing else asks for it.
	 */
	let inspectIndexes = $derived.by(() => {
		if (!inspectOn) return undefined;
		const { layerGroups, textGroups, colorKeys } = inspectSources(currentStyleKey, schema);
		const colors = colorIndex((probeColors) => currentStyle(probeColors)?.style, colorKeys);
		if (!colors) return undefined;
		return { groups: groupIndex(layerGroups), topics: groupIndex(textGroups), colors };
	});

	/**
	 * The options the popup edits, which are the live ones: it changes a colour or a group the same way
	 * the sections do, by writing to the state the style is built from.
	 */
	let inspectTargets = $derived.by(() => {
		const { layerGroups } = inspectSources(currentStyleKey, schema);
		if (currentStyleKey === 'satellite') {
			const overlay = satelliteState.osmOverlay;
			if (!overlay) return { layerGroups };
			const defaults = overlayDefaults(overlay.theme);
			return {
				layerGroups,
				colors: overlay.colors,
				colorDefaults: defaults.colors,
				layers: overlay.layers,
				layerDefaults: defaults.layers,
			};
		}
		if (!currentVectorDefaults) return { layerGroups };
		return {
			layerGroups,
			colors: vectorState.colors,
			colorDefaults: currentVectorDefaults.colors,
			layers: vectorState.layers,
			layerDefaults: currentVectorDefaults.layers,
		};
	});

	$effect(() => {
		if (!inspectOn) return;
		const canvas = map.getCanvas();
		const hostCursor = canvas.style.cursor;
		canvas.style.cursor = 'crosshair';
		const handler = (event: MapMouseEvent) => {
			const indexes = inspectIndexes;
			if (!indexes) return;
			// Only what the map draws is found: a hidden group is not drawn, so it is never a hit.
			const features = map.queryRenderedFeatures(event.point) as unknown as RenderedFeature[];
			inspectResult = {
				layers: describeFeatures(features, indexes),
				point: { x: event.originalEvent.clientX, y: event.originalEvent.clientY },
				lngLat: { lng: event.lngLat.lng, lat: event.lngLat.lat },
			};
		};
		map.on('click', handler);
		return () => {
			map.off('click', handler);
			canvas.style.cursor = hostCursor;
			inspectResult = undefined;
		};
	});

	// ── Header actions ───────────────────────────────────────────────────────────

	let totalChanges = $derived(configChangeCount(minimal, Object.keys(minimal)));
	let exportOpen = $state(false);
	let importOpen = $state(false);
	/** A short message after an action, e.g. "Style code copied". */
	let status = $state<string | undefined>();
	let statusTimer: ReturnType<typeof setTimeout> | undefined;
	/** The options before "Reset all", while the reset can still be undone. */
	let undoState = $state<{ vector: VectorState; satellite: SatelliteState } | undefined>();
	let undoTimer: ReturnType<typeof setTimeout> | undefined;

	function showStatus(text: string) {
		status = text;
		clearTimeout(statusTimer);
		statusTimer = setTimeout(() => (status = undefined), 4000);
	}

	/** Back to the defaults of the current style; the header offers to undo it for a while. */
	function resetAll() {
		undoState = {
			vector: $state.snapshot(vectorState) as VectorState,
			satellite: $state.snapshot(satelliteState) as SatelliteState,
		};
		if (isSatellite) satelliteState = satelliteDefaults();
		else vectorState = vectorDefaults(currentStyleKey as Palette);
		clearTimeout(undoTimer);
		undoTimer = setTimeout(() => (undoState = undefined), 15000);
	}

	function undoReset() {
		if (!undoState) return;
		vectorState = undoState.vector;
		satelliteState = undoState.satellite;
		undoState = undefined;
		clearTimeout(undoTimer);
	}

	/** The TileJSONs that are in, for building code snippets. */
	let loadedSources = $derived<StyleSources>({
		vector: vectorTileJSON ?? undefined,
		schema,
		satellite: satelliteTileJSON ?? undefined,
		elevation: elevationTileJSON ?? undefined,
	});

	/**
	 * The style to export: the style as built, carrying a record of the options it came from, so that
	 * importing the file again restores these settings exactly instead of reconstructing them.
	 */
	let exportStyle = $derived.by(() => {
		const current = currentStyle();
		return current
			? styleForExport(current.style, currentStyleKey, minimal, schema, {
					provider,
					config: sourceConfig,
				})
			: undefined;
	});

	function exportCode(target: 'npm' | 'browser') {
		return styleCode(
			currentStyleKey,
			$state.snapshot(vectorState) as VectorState,
			$state.snapshot(satelliteState) as SatelliteState,
			sourceConfig,
			loadedSources,
			target
		);
	}

	/** Applies an imported style, optionally moving to the tile server it came from. */
	function applyImport(result: ImportResult, newSources?: ChosenSources) {
		importOpen = false;
		if (newSources) applySources(newSources);
		setBaseStyle(result.styleKey, result.config);
		// Only the warnings are counted here: the notes are true of almost every import, and counting
		// them would make a clean one look like it went badly.
		const worth = result.diagnostics.filter((d) => d.severity === 'warning').length;
		showStatus(
			worth > 0
				? `Style imported, with ${worth} thing${worth === 1 ? '' : 's'} worth checking`
				: 'Style imported'
		);
	}

	/**
	 * Moves to other sources. The same sources again change nothing: an input reports its value a second
	 * time when it loses focus, and reloading then would take the panel away under the click that did it.
	 */
	function applySources(next: ChosenSources) {
		provider = next.provider;
		setSourceConfig(next.config);
	}

	function setSourceConfig(next: SourceConfig) {
		if (JSON.stringify(next) === JSON.stringify(sourceConfig)) return;
		sourceConfig = next;
		// Another server has other fonts.
		fontPicker.clearScripts();
	}

	/** The sources of the page itself: the VersaTiles server it names, or the one it is on. */
	const ownSources: ChosenSources = untrack(() => ({
		provider: 'versatiles',
		config: versatilesSources(config.origin ?? window.location.origin),
	}));

	function sourcesFromHash(encoded: string | null | undefined): ChosenSources | undefined {
		return encoded ? parseSources(decodeConfig(encoded)) : undefined;
	}

	// Initialize hash management and style
	let hashManager: HashManager | undefined;
	untrack(() => {
		if (config.hash !== false) {
			hashManager = new HashManager(
				map,
				(key, cfg) => setBaseStyle(key, cfg),
				{
					defaultOpen: config.open ?? false,
					onChange: (open) => (paneOpen = open),
				},
				// A page that offers no other sources has none to keep in a link.
				config.externalSources
					? { onChange: (encoded) => applySources(sourcesFromHash(encoded) ?? ownSources) }
					: undefined
			);
			const { styleKey, config: hashConfig, panelOpen, sources } = hashManager.initialize();
			if (panelOpen !== undefined) paneOpen = panelOpen;
			const hashSources = sourcesFromHash(sources);
			if (hashSources) applySources(hashSources);
			setBaseStyle(styleKey, hashConfig);
		} else {
			setBaseStyle(DEFAULT_STYLE_KEY);
		}
	});

	// Opening and closing the panel is part of the shared state: a link shows the map as it was left.
	$effect(() => hashManager?.setPanelOpen(paneOpen));
	// And so are the tile sources, unless they are the page's own.
	$effect(() => {
		const chosen = { provider, config: sourceConfig };
		const own = JSON.stringify(chosen) === JSON.stringify(ownSources);
		hashManager?.setSources(own ? null : encodeConfig(serializeSources(chosen)));
	});

	onDestroy(() => {
		hashManager?.destroy();
		clearTimeout(statusTimer);
		clearTimeout(undoTimer);
		container.style.backgroundColor = hostBackground;
		container.classList.remove('versatiles-styler-dark');
	});
</script>

<!--
	The styler's buttons: opening the editor, and the inspector attached to its right. One control with
	two buttons, because the inspector is part of the styler — it reads the style the pane edits, and
	writes back to it — even though it acts on the map rather than on the pane.
-->
<div class="maplibregl-ctrl maplibregl-ctrl-group styler-buttons">
	<button
		type="button"
		class="maplibregl-ctrl-icon"
		title="Toggle style editor"
		aria-label="Toggle style editor"
		aria-expanded={paneOpen}
		onclick={() => (paneOpen = !paneOpen)}
	></button>
	<button
		type="button"
		class="ctrl-inspect"
		title={inspectOn
			? 'Stop inspecting the map'
			: 'Inspect the map: click a feature to see what styles it'}
		aria-label="Inspect the map"
		aria-pressed={inspectOn}
		onclick={() => (inspectOn = !inspectOn)}
	></button>
</div>
{#if paneOpen}
	<div class="maplibregl-ctrl maplibregl-ctrl-group maplibregl-pane hide-scrollbar">
		<!-- What the pane is, and what can be done to the style as a whole: one row each. -->
		<div class="styler-top">
			<div class="styler-head">
				<span class="styler-title">VersaTiles Map Styler</span>
				<!--
					Resetting belongs with the title rather than beside Import and Export: it comes and goes
					with the changes, and in the row below it would push that pair off centre.
				-->
				{#if undoState}
					<button type="button" class="text-button" onclick={undoReset}>Undo reset</button>
				{:else if totalChanges > 0}
					<button
						type="button"
						class="icon-button"
						aria-label="Reset all changes"
						title="Reset all {totalChanges} changes"
						onclick={resetAll}><span class="icon icon-reset" aria-hidden="true"></span></button
					>
				{/if}
				<button
					type="button"
					class="icon-button"
					aria-label="Close the style editor"
					onclick={() => (paneOpen = false)}
					><span class="icon icon-close" aria-hidden="true"></span></button
				>
			</div>
		</div>
		{#if status}
			<p class="styler-status" role="status">{status}</p>
		{/if}
		<!--
			Peers, and both quiet: they only open a dialog, and the accent belongs to the button that
			commits inside it. The arrows say which way the style travels.
		-->
		<div class="styler-toolbar">
			<button
				type="button"
				class="toolbar-button"
				aria-haspopup="dialog"
				onclick={() => (importOpen = true)}
				><span class="icon icon-import" aria-hidden="true"></span>Import…</button
			>
			<button
				type="button"
				class="toolbar-button"
				aria-haspopup="dialog"
				onclick={() => (exportOpen = true)}
				><span class="icon icon-export" aria-hidden="true"></span>Export…</button
			>
		</div>
		<h4 class="section-group">Setup</h4>
		<SidebarSection
			title={config.externalSources ? 'Tile sources' : 'Tile server'}
			value={sourcesLabel}
			description={provider === 'versatiles'
				? 'The server the tiles, fonts and icons come from.'
				: provider === 'custom'
					? 'Tiles from any server, by the address of a TileJSON or a PMTiles archive.'
					: 'Where the tiles come from. Fonts and icons are those of tiles.versatiles.org.'}
		>
			<SourceOptions
				{provider}
				providers={PROVIDERS}
				config={sourceConfig}
				tileJSONs={{
					vector: vectorTileJSON,
					satellite: satelliteTileJSON,
					elevation: elevationTileJSON,
				}}
				pmtiles={pmtiles !== undefined}
				onprovider={setProvider}
				onconfig={setSourceConfig}
			/>
		</SidebarSection>
		<h4 class="section-group">Style</h4>
		<SidebarSection title="Base style" value={currentStyleKey} open listClass="style-list">
			{#if styleKeys.length > 0}
				<ThemeSelect {styleKeys} value={currentStyleKey} onselect={(key) => setBaseStyle(key)} />
			{/if}
		</SidebarSection>
		{#if isSatellite}
			<SatelliteStylePanel
				bind:options={satelliteState}
				config={minimal}
				assetsBase={sourceConfig.assets}
				{overlayAvailable}
				elevationAvailable={hasElevation}
				fontFaces={sources.fontFaces()}
				{languages}
			/>
		{:else if currentVectorDefaults}
			<VectorStylePanel
				bind:options={vectorState}
				config={minimal}
				assetsBase={sourceConfig.assets}
				defaults={currentVectorDefaults}
				layerGroups={vectorGroups.layerGroups}
				textGroups={vectorGroups.textGroups}
				{hasElevation}
				fontFaces={sources.fontFaces()}
				{languages}
			/>
		{/if}
		<!-- The project itself, which is neither the map nor the style: out of the action rows. -->
		<div class="styler-foot">
			<a
				href="https://github.com/versatiles-org/maplibre-versatiles-styler"
				target="_blank"
				rel="noopener noreferrer"
				><span class="icon icon-github" aria-hidden="true"></span>Improve me on GitHub</a
			>
		</div>
	</div>
{/if}

<!--
	The dialogs sit at the root of the control, outside the `maplibregl-ctrl-group` wrappers: MapLibre
	sizes every button inside one of those to 29×29px. `showModal()` paints them in the top layer, so
	their position in the tree only decides which styles reach them, not where they appear.
-->
{#if exportOpen}
	<ExportDialog
		style={exportStyle}
		code={exportCode}
		targets={codeTargets(currentStyleKey, schema)}
		onclose={() => (exportOpen = false)}
	/>
{/if}
{#if importOpen}
	<ImportDialog
		current={{ provider, config: sourceConfig }}
		externalSources={config.externalSources}
		onapply={applyImport}
		onclose={() => (importOpen = false)}
	/>
{/if}
{#if inspectResult}
	<InspectPopup
		result={inspectResult}
		{container}
		colors={inspectTargets.colors}
		colorDefaults={inspectTargets.colorDefaults}
		layers={inspectTargets.layers}
		layerDefaults={inspectTargets.layerDefaults}
		layerGroups={inspectTargets.layerGroups}
		onclose={() => (inspectResult = undefined)}
	/>
{/if}
