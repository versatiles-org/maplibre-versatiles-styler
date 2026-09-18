<script lang="ts">
	import type { LayerGroupMap, ResolvedColors, ResolvedLayerGroups } from '@versatiles/style';
	import { pathLabel, type InspectResult, type InspectedLayer } from '../inspect';
	import { colorLabel } from '../color_groups';
	import {
		findLayerNode,
		layerModified,
		layerNodes,
		layerValue,
		resetLayer,
		setLayerValue,
	} from '../layer_tree';
	import InputColor from './inputs/InputColor.svelte';
	import InputVisibility from './inputs/InputVisibility.svelte';
	import { placeAtPoint, portalTo } from './inputs/popover';

	let {
		result,
		container,
		colors,
		colorDefaults,
		layers,
		layerDefaults,
		layerGroups,
		onclose,
	}: {
		/** The features of one click, described when it happened. */
		result: InspectResult;
		/** The map's container: the popup is moved there, or the control's transform would trap it. */
		container: HTMLElement;
		/**
		 * The palette being edited, absent for a style that has none (satellite without its overlay).
		 * Written in place, like the sections write the options they are given.
		 */
		colors?: ResolvedColors;
		colorDefaults?: ResolvedColors;
		layers?: ResolvedLayerGroups;
		layerDefaults?: ResolvedLayerGroups;
		layerGroups?: LayerGroupMap;
		onclose: () => void;
	} = $props();

	let position = $state({ left: 0, top: 0, maxHeight: 480 });

	let nodes = $derived(layerGroups && layerDefaults ? layerNodes(layerGroups, layerDefaults) : []);

	/** The group's name as the Layers section reads it, e.g. `Water › Lakes`. */
	function groupLabel(path: readonly string[]): string {
		const labels = path.map((_, index) => findLayerNode(nodes, path.slice(0, index + 1))?.label);
		return labels.every((label) => label !== undefined)
			? pathLabel(labels as string[])
			: pathLabel(path);
	}

	/**
	 * The colors of a layer, one row per palette key. A layer that paints two properties from the same
	 * key (a road's fill and its casing) gets one row: they are one setting.
	 */
	function colorRows(layer: InspectedLayer): { key: string; properties: string[] }[] {
		const rows: { key: string; properties: string[] }[] = [];
		for (const { property, key } of layer.colors) {
			if (key === undefined || (colors && !(key in colors))) continue;
			const row = rows.find((candidate) => candidate.key === key);
			if (row) row.properties.push(property);
			else rows.push({ key, properties: [property] });
		}
		return rows;
	}

	function propertyEntries(layer: InspectedLayer): [string, string][] {
		return Object.entries(layer.properties)
			.filter(([, value]) => value !== null && value !== undefined && value !== '')
			.map(([name, value]) => [name, String(value)]);
	}
</script>

<div class="maplibregl-versatiles-styler inspect-layer" {@attach portalTo(container)}>
	<div
		class="inspect-popup"
		role="dialog"
		aria-label="What is here"
		style:left="{position.left}px"
		style:top="{position.top}px"
		style:max-height="{position.maxHeight}px"
		{@attach placeAtPoint({ point: result.point, onplace: (p) => (position = p), onclose })}
	>
		<div class="inspect-head">
			<span>What’s here</span>
			<button type="button" class="inspect-close" aria-label="Close" onclick={onclose}>×</button>
		</div>
		<div class="inspect-body hide-scrollbar">
			{#if result.layers.length === 0}
				<p class="section-description">
					Nothing here. Only vector features are found: satellite imagery is a picture and carries
					none, and a hidden layer group is not drawn at all.
				</p>
			{:else}
				{#each result.layers as layer (layer.id)}
					{@const node = layer.group ? findLayerNode(nodes, layer.group) : undefined}
					{@const properties = propertyEntries(layer)}
					<div class="inspect-item">
						<p class="inspect-title">
							{layer.group ? groupLabel(layer.group) : layer.id}
						</p>
						<p class="inspect-meta">
							<code>{layer.id}</code>
							<span>{layer.type}</span>
							{#if layer.sourceLayer}<span>{layer.sourceLayer}</span>{/if}
						</p>
						<!-- The rows come from the sections, and their styles hang off the list class those use. -->
						<div class="maplibregl-list">
							{#if node && layers && layerDefaults}
								<InputVisibility
									label={node.label}
									hint="layer group"
									value={layerValue(layers, node)}
									modified={layerModified(layers, layerDefaults, node)}
									onchange={(value) => setLayerValue(layers, node, value)}
									onReset={() => resetLayer(layers, layerDefaults, node)}
								/>
							{/if}
							{#if colors && colorDefaults}
								{#each colorRows(layer) as row (row.key)}
									<InputColor
										label={colorLabel(row.key)}
										hint={row.properties.join(', ')}
										bind:value={
											() => colors[row.key as keyof ResolvedColors],
											(value) => (colors[row.key as keyof ResolvedColors] = value)
										}
										defaultValue={colorDefaults[row.key as keyof ResolvedColors]}
									/>
								{/each}
							{/if}
						</div>
						{#if layer.topic}
							<p class="inspect-note">
								Its text follows <strong>{pathLabel(layer.topic)}</strong> in Labels.
							</p>
						{/if}
						{#if properties.length > 0}
							<details class="inspect-properties">
								<summary>Feature properties ({properties.length})</summary>
								<dl>
									{#each properties as [name, value] (name)}
										<dt>{name}</dt>
										<dd>{value}</dd>
									{/each}
								</dl>
							</details>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
