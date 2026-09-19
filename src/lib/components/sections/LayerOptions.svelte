<script lang="ts">
	import type { LayerGroupMap, ResolvedLayerGroups } from '@versatiles/style';
	import {
		layerModified,
		layerNodes,
		layerValue,
		resetLayer,
		setLayerValue,
		type LayerNode,
	} from '../../options/layers';
	import InputVisibility from '../inputs/InputVisibility.svelte';

	let {
		layers = $bindable(),
		defaults,
		layerGroups,
		disabled = false,
	}: {
		layers: ResolvedLayerGroups;
		defaults: ResolvedLayerGroups;
		/** `osm.layerGroups` / `satellite.layerGroups`: which groups exist. */
		layerGroups: LayerGroupMap;
		disabled?: boolean;
	} = $props();

	let nodes = $derived(layerNodes(layerGroups, defaults));
	let expanded = $state<Record<string, boolean>>({});
</script>

{#snippet tree(list: LayerNode[])}
	{#each list as node (node.key)}
		{@const id = node.path.join('.')}
		{@const hasChildren = node.children.length > 0}
		<InputVisibility
			label={node.label}
			hint={id}
			{disabled}
			value={layerValue(layers, node)}
			modified={layerModified(layers, defaults, node)}
			onchange={(value) => setLayerValue(layers, node, value)}
			onReset={() => resetLayer(layers, defaults, node)}
			expanded={expanded[id] ?? false}
			onToggle={hasChildren ? () => (expanded[id] = !(expanded[id] ?? false)) : undefined}
		/>
		{#if hasChildren && expanded[id]}
			<div class="nested">
				{@render tree(node.children)}
			</div>
		{/if}
	{/each}
{/snippet}

{@render tree(nodes)}
