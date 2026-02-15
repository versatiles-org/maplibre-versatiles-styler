<script lang="ts">
	import type { Map as MLGLMap } from 'maplibre-gl';
	import type { SatelliteStyleOptions } from '@versatiles/style';
	import type { VersaTilesStylerConfig } from './types';
	import {
		vectorStyles,
		defaultSatelliteOptions,
		getStyle,
		getMinimalOptions,
		type VectorStyleKey,
		type StyleKey,
		type EnforcedStyleBuilderOptions,
	} from './style_config';
	import { downloadStyle, copyStyleCode } from './export';
	import { fetchJSON, fetchTileJSON, fetchTileSources } from './tile_json';
	import { onDestroy, untrack } from 'svelte';
	import { HashManager } from './hash';
	import ColorOptions from './components/ColorOptions.svelte';
	import FontOptions from './components/FontOptions.svelte';
	import LanguageOptions from './components/LanguageOptions.svelte';
	import RecolorOptions from './components/RecolorOptions.svelte';
	import SatelliteOptions from './components/SatelliteOptions.svelte';
	import SidebarSection from './components/SidebarSection.svelte';

	let { map, config }: { map: MLGLMap; config: VersaTilesStylerConfig } = $props();
	const uid = $props.id();
	let origin = $state(untrack(() => config.origin ?? window.location.origin));
	let paneOpen = $state(untrack(() => config.open ?? false));
	let hasOsm = $state(false);
	let hasSatellite = $state(false);
	let sourcesLoaded = $state(false);
	let styleKeys: StyleKey[] = $derived([
		...(hasOsm ? (Object.keys(vectorStyles) as VectorStyleKey[]) : []),
		...(hasSatellite ? (['satellite'] as const) : []),
	]);
	let overlayAvailable = $derived(hasOsm && hasSatellite);
	let currentStyleKey = $state<StyleKey>('colorful');
	let isSatellite = $derived(currentStyleKey === 'satellite');
	let currentVectorOptions = $state<EnforcedStyleBuilderOptions>({
		colors: {},
		recolor: {},
		fonts: {},
	});
	let currentSatelliteOptions = $state<SatelliteStyleOptions>({});

	let baseStyle = $derived(isSatellite ? null : vectorStyles[currentStyleKey as VectorStyleKey]);
	let defaultOptions = $derived(baseStyle ? baseStyle.getOptions() : null);

	let fontsPromise = $derived(
		fetchJSON(new URL('/assets/glyphs/index.json', origin)).then((fonts) =>
			Object.fromEntries(
				(fonts as string[]).map((f) => {
					const title = f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
					return [title, f];
				})
			)
		)
	);

	let languagesPromise = $derived(
		hasOsm
			? fetchTileJSON(new URL('/tiles/osm/tiles.json', origin)).then((tileJSON) =>
					tileJSON.languages()
				)
			: Promise.resolve({ local: '' })
	);

	function setBaseStyle(key: StyleKey) {
		currentStyleKey = key;
		hashManager?.setStyleKey(key);
		if (key === 'satellite') {
			currentSatelliteOptions = {};
		} else {
			const defaults = vectorStyles[key].getOptions();
			currentVectorOptions = {
				baseUrl: origin,
				colors: { ...defaults.colors },
				recolor: {},
				fonts: {},
			};
		}
	}

	async function renderStyle() {
		map.setStyle(
			await getStyle(currentStyleKey, currentVectorOptions, currentSatelliteOptions, origin)
		);
	}

	async function handleDownload() {
		const style = await getStyle(
			currentStyleKey,
			currentVectorOptions,
			currentSatelliteOptions,
			origin
		);
		downloadStyle(style);
	}

	async function handleCopyCode() {
		const minimal = getMinimalOptions(
			currentStyleKey,
			currentVectorOptions,
			currentSatelliteOptions
		);
		await copyStyleCode(currentStyleKey, minimal);
	}

	function handleOriginChange() {
		if (isSatellite) {
			currentSatelliteOptions = {};
		} else {
			const defaults = baseStyle!.getOptions();
			currentVectorOptions = {
				baseUrl: origin,
				colors: { ...defaults.colors },
				recolor: {},
				fonts: {},
			};
		}
		renderStyle();
	}

	$effect(() => {
		const currentOrigin = origin;
		fetchTileSources(currentOrigin).then((sources) => {
			hasOsm = sources.has('osm');
			hasSatellite = sources.has('satellite');
			sourcesLoaded = true;
		});
	});

	$effect(() => {
		if (sourcesLoaded && !overlayAvailable) {
			currentSatelliteOptions.overlay = false;
		}
	});

	$effect(() => {
		if (styleKeys.length > 0 && !styleKeys.includes(currentStyleKey)) {
			setBaseStyle(styleKeys[0]);
		}
	});

	$effect(() => {
		// Track all reactive dependencies and render
		void currentStyleKey;
		void currentVectorOptions;
		void currentSatelliteOptions;
		void origin;
		renderStyle();
	});

	// Initialize hash management and style
	let hashManager: HashManager | undefined;
	untrack(() => {
		if (config.hash !== false) {
			hashManager = new HashManager(map, (key) => setBaseStyle(key as StyleKey));
			const initialStyle = hashManager.initialize();
			setBaseStyle(initialStyle as StyleKey);
		} else {
			setBaseStyle('colorful');
		}
	});

	onDestroy(() => hashManager?.destroy());
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
		<SidebarSection title="Select origin">
			<div class="entry text-container">
				<label for="{uid}-origin">Origin</label>
				<div class="input">
					<input id="{uid}-origin" type="text" bind:value={origin} onchange={handleOriginChange} />
				</div>
			</div>
		</SidebarSection>
		<SidebarSection title="Select a base style" open listClass="style-list">
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
		{#if !isSatellite && defaultOptions}
			<SidebarSection title="Edit individual colors">
				<ColorOptions
					bind:colors={currentVectorOptions.colors}
					defaults={defaultOptions.colors}
					onchange={renderStyle}
				/>
			</SidebarSection>
			<SidebarSection title="Modify all colors">
				<RecolorOptions
					bind:recolor={currentVectorOptions.recolor}
					defaults={defaultOptions.recolor}
					onchange={renderStyle}
				/>
			</SidebarSection>
		{/if}
		{#if isSatellite}
			<SidebarSection title="Satellite options">
				<SatelliteOptions
					bind:options={currentSatelliteOptions}
					defaults={defaultSatelliteOptions}
					{overlayAvailable}
					onchange={renderStyle}
				/>
			</SidebarSection>
		{/if}
		<SidebarSection title="Other options">
			{#if !isSatellite && defaultOptions}
				<FontOptions
					bind:fonts={currentVectorOptions.fonts}
					defaults={defaultOptions.fonts}
					fontNames={fontsPromise}
					onchange={renderStyle}
				/>
			{/if}
			{#if isSatellite}
				<LanguageOptions
					bind:language={
						() => (currentSatelliteOptions.language as string) ?? '',
						(v: string) => (currentSatelliteOptions.language = v)
					}
					languages={languagesPromise}
					onchange={renderStyle}
				/>
			{:else}
				<LanguageOptions
					bind:language={
						() => (currentVectorOptions.language as string) ?? '',
						(v: string) => (currentVectorOptions.language = v)
					}
					languages={languagesPromise}
					onchange={renderStyle}
				/>
			{/if}
		</SidebarSection>
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
