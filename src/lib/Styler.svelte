<script lang="ts">
	import type { Map as MLGLMap, StyleSpecification } from 'maplibre-gl';
	import { colorful, eclipse, graybeard, neutrino, shadow } from '@versatiles/style';
	import type { StyleBuilderFunction, StyleBuilderOptions } from '@versatiles/style';
	import type { VersaTilesStylerConfig } from './types';
	import { fetchJSON, fetchTileJSON } from './tile_json';
	import { untrack } from 'svelte';
	import { removeRecursively } from './utils';
	import InputColor from './components/InputColor.svelte';
	import InputNumber from './components/InputNumber.svelte';
	import InputSelect from './components/InputSelect.svelte';
	import InputCheckbox from './components/InputCheckbox.svelte';
	import SidebarSection from './components/SidebarSection.svelte';

	const vectorStyles = { colorful, eclipse, graybeard, shadow, neutrino } satisfies Record<
		string,
		StyleBuilderFunction
	>;
	type VectorStyleKey = keyof typeof vectorStyles;
	type EnforcedStyleBuilderOptions = StyleBuilderOptions & {
		colors: NonNullable<StyleBuilderOptions['colors']>;
		recolor: NonNullable<StyleBuilderOptions['recolor']>;
		fonts: NonNullable<StyleBuilderOptions['fonts']>;
	};

	let { map, config }: { map: MLGLMap; config: VersaTilesStylerConfig } = $props();
	const uid = $props.id();
	let origin = $state(untrack(() => config.origin ?? window.location.origin));
	let paneOpen = $state(untrack(() => config.open ?? false));
	let currentStyleKey = $state<VectorStyleKey>('colorful');
	let currentOptions = $state<EnforcedStyleBuilderOptions>({
		colors: {},
		recolor: {},
		fonts: {},
	});

	let baseStyle = $derived(vectorStyles[currentStyleKey]);
	let defaultOptions = $derived(baseStyle.getOptions());

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
		fetchTileJSON(new URL('/tiles/osm/tiles.json', origin)).then((tileJSON) => tileJSON.languages())
	);

	function setBaseStyle(key: VectorStyleKey) {
		currentStyleKey = key;
		const defaults = vectorStyles[key].getOptions();
		currentOptions = {
			baseUrl: origin,
			colors: { ...defaults.colors },
			recolor: {},
			fonts: {},
		};
	}

	function renderStyle() {
		const style = getStyle();
		map.setStyle(style);
	}

	function getStyle(): StyleSpecification {
		return vectorStyles[currentStyleKey]({
			...currentOptions,
			baseUrl: origin,
		});
	}

	function getMinimalOptions(): StyleBuilderOptions {
		return removeRecursively(
			JSON.parse(JSON.stringify(currentOptions)),
			baseStyle.getOptions()
		) as StyleBuilderOptions;
	}

	function downloadStyle() {
		const json = JSON.stringify(getStyle(), null, 2);
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
		const a = document.createElement('a');
		a.setAttribute('href', dataStr);
		a.setAttribute('download', 'style.json');
		document.body.appendChild(a);
		a.click();
		a.remove();
	}

	async function copyStyleCode() {
		const minimalOptions = getMinimalOptions();
		let optionsString = minimalOptions ? JSON.stringify(minimalOptions, null, 2) : '';
		optionsString = optionsString.replace(/\s\s"([^"]+)": /g, '  $1: ');
		const code = `const style = VersaTilesStyle.${currentStyleKey}(${optionsString});`;
		await navigator.clipboard.writeText(code);
		alert('Style code copied to clipboard');
	}

	function handleOriginChange() {
		const defaults = baseStyle.getOptions();
		currentOptions = {
			baseUrl: origin,
			colors: { ...defaults.colors },
			recolor: {},
			fonts: {},
		};
		renderStyle();
	}

	$effect(() => {
		// Track all reactive dependencies and render
		void currentStyleKey;
		void currentOptions;
		void origin;
		renderStyle();
	});

	// Initialize style on first render
	setBaseStyle('colorful');
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
			{#each Object.keys(vectorStyles) as key (key)}
				<label>
					<input
						type="radio"
						value={key}
						checked={currentStyleKey === key}
						onclick={() => setBaseStyle(key as VectorStyleKey)}
					/>
					<span>{key}</span>
				</label>
			{/each}
		</SidebarSection>
		<SidebarSection title="Edit individual colors">
			{#each Object.keys(defaultOptions.colors ?? {}) as key (key)}
				<InputColor
					label={key}
					bind:value={currentOptions.colors[key]}
					defaultValue={(defaultOptions.colors ?? {})[key]}
					onchange={renderStyle}
				/>
			{/each}
		</SidebarSection>
		<SidebarSection title="Modify all colors">
			<InputCheckbox
				label="Invert Brightness"
				bind:value={
					() => currentOptions.recolor.invertBrightness as boolean,
					(v) => (currentOptions.recolor.invertBrightness = v)
				}
				defaultValue={(defaultOptions.recolor?.invertBrightness as boolean) ?? false}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Rotate Hue"
				bind:value={
					() => (currentOptions.recolor.rotate as number) ?? 0,
					(v) => (currentOptions.recolor.rotate = v)
				}
				defaultValue={(defaultOptions.recolor?.rotate as number) ?? 0}
				min={0}
				max={360}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Saturate"
				bind:value={
					() => (currentOptions.recolor.saturate as number) ?? 0,
					(v) => (currentOptions.recolor.saturate = v)
				}
				defaultValue={(defaultOptions.recolor?.saturate as number) ?? 0}
				min={-1}
				max={1}
				scale={100}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Gamma"
				bind:value={
					() => (currentOptions.recolor.gamma as number) ?? 1,
					(v) => (currentOptions.recolor.gamma = v)
				}
				defaultValue={(defaultOptions.recolor?.gamma as number) ?? 1}
				min={0.1}
				max={10}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Contrast"
				bind:value={
					() => (currentOptions.recolor.contrast as number) ?? 1,
					(v) => (currentOptions.recolor.contrast = v)
				}
				defaultValue={(defaultOptions.recolor?.contrast as number) ?? 1}
				min={0}
				max={10}
				scale={100}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Brightness"
				bind:value={
					() => (currentOptions.recolor.brightness as number) ?? 0,
					(v) => (currentOptions.recolor.brightness = v)
				}
				defaultValue={(defaultOptions.recolor?.brightness as number) ?? 0}
				min={-1}
				max={1}
				scale={100}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Tint"
				bind:value={
					() => (currentOptions.recolor.tint as number) ?? 0,
					(v) => (currentOptions.recolor.tint = v)
				}
				defaultValue={(defaultOptions.recolor?.tint as number) ?? 0}
				min={0}
				max={1}
				scale={100}
				onchange={renderStyle}
			/>
			<InputColor
				label="Tint Color"
				bind:value={currentOptions.recolor.tintColor}
				defaultValue={defaultOptions.recolor?.tintColor}
				onchange={renderStyle}
			/>
			<InputNumber
				label="Blend"
				bind:value={
					() => (currentOptions.recolor.blend as number) ?? 0,
					(v) => (currentOptions.recolor.blend = v)
				}
				defaultValue={(defaultOptions.recolor?.blend as number) ?? 0}
				min={0}
				max={1}
				scale={100}
				onchange={renderStyle}
			/>
			<InputColor
				label="Blend Color"
				bind:value={currentOptions.recolor.blendColor}
				defaultValue={defaultOptions.recolor?.blendColor}
				onchange={renderStyle}
			/>
		</SidebarSection>
		<SidebarSection title="Select Options">
			{#await fontsPromise then fontNames}
				<InputSelect
					label="Font Regular"
					bind:value={
						() => (currentOptions.fonts.regular as string) ?? '',
						(v) => (currentOptions.fonts.regular = v)
					}
					defaultValue={(defaultOptions.fonts?.regular as string) ?? ''}
					options={fontNames}
					onchange={renderStyle}
				/>
				<InputSelect
					label="Font Bold"
					bind:value={
						() => (currentOptions.fonts.bold as string) ?? '',
						(v) => (currentOptions.fonts.bold = v)
					}
					defaultValue={(defaultOptions.fonts?.bold as string) ?? ''}
					options={fontNames}
					onchange={renderStyle}
				/>
			{/await}
			{#await languagesPromise then languages}
				<InputSelect
					label="Language"
					bind:value={
						() => ((currentOptions as Record<string, unknown>).language as string) ?? '',
						(v: string) => ((currentOptions as Record<string, unknown>).language = v)
					}
					defaultValue=""
					options={languages}
					onchange={renderStyle}
				/>
			{/await}
		</SidebarSection>
		<SidebarSection title="Export">
			<div class="entry button-container">
				<button onclick={downloadStyle}>Download style.json</button>
				<button onclick={copyStyleCode}>Copy style code</button>
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
