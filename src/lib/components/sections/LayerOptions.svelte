<script lang="ts">
	import type { LayerGroupMap, ResolvedLayerGroups } from '@versatiles/style';
	import {
		dashMode,
		dashOfMode,
		formatDashPattern,
		layerModified,
		layerNodes,
		layerValue,
		lineStyle,
		parseDashPattern,
		resetLayer,
		sameDash,
		setLayerValue,
		type DashMode,
		type LayerNode,
	} from '../../options/layers';
	import InputNumber from '../inputs/InputNumber.svelte';
	import InputSegmented from '../inputs/InputSegmented.svelte';
	import InputText from '../inputs/InputText.svelte';
	import InputVisibility from '../inputs/InputVisibility.svelte';
	import type { SelectOption } from '../inputs/select';

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

	// Symbols, as three words do not fit a row this deep in the tree.
	const DASH_MODES: SelectOption[] = [
		{ value: 'solid', label: '━━', title: 'Solid' },
		{ value: 'dashed', label: '╍╍', title: 'Dashed' },
		{ value: 'custom', label: '✎', title: 'Custom' },
	];
</script>

<!-- What a border or a path has beyond its opacity: its dash and its width. -->
{#snippet line(node: LayerNode)}
	{@const style = lineStyle(layers, node)}
	{@const usual = lineStyle(defaults, node)}
	{#if style && usual}
		<InputSegmented
			label="Line"
			hint="Dashed is the style's own pattern for this line, Custom one of your own."
			{disabled}
			options={DASH_MODES}
			bind:value={
				() => dashMode(style.dashed),
				(mode) => (style.dashed = dashOfMode(mode as DashMode, usual.dashed))
			}
			defaultValue={dashMode(usual.dashed)}
			modified={!sameDash(style.dashed, usual.dashed)}
		/>
		{#if Array.isArray(style.dashed)}
			<InputText
				label="Pattern"
				hint="Lengths of dashes and gaps in turn, in multiples of the line width"
				{disabled}
				placeholder="e.g. 3 1"
				bind:value={
					() => formatDashPattern(style.dashed as number[]),
					(text) => {
						const pattern = text === undefined ? undefined : parseDashPattern(text);
						if (pattern) style.dashed = pattern;
					}
				}
				defaultValue={Array.isArray(usual.dashed) ? formatDashPattern(usual.dashed) : undefined}
				modified={Array.isArray(usual.dashed) && !sameDash(style.dashed, usual.dashed)}
			/>
		{/if}
		<InputNumber
			label="Width"
			hint="Multiplies the line's width at every zoom. 1× is as the style draws it."
			{disabled}
			bind:value={
				() => style.width,
				(width) => {
					if (width !== undefined) style.width = width;
				}
			}
			defaultValue={usual.width}
			min={0.25}
			max={4}
			step={0.05}
			logarithmic
			unit="×"
		/>
	{/if}
{/snippet}

{#snippet tree(list: LayerNode[])}
	{#each list as node (node.key)}
		{@const id = node.path.join('.')}
		{@const hasChildren = node.children.length > 0}
		{@const expandable = hasChildren || node.line}
		<InputVisibility
			label={node.label}
			name={id}
			{disabled}
			value={layerValue(layers, node)}
			modified={layerModified(layers, defaults, node)}
			onchange={(value) => setLayerValue(layers, node, value)}
			onReset={() => resetLayer(layers, defaults, node)}
			expanded={expanded[id] ?? false}
			onToggle={expandable ? () => (expanded[id] = !(expanded[id] ?? false)) : undefined}
		/>
		{#if expandable && expanded[id]}
			<div class="nested">
				{#if hasChildren}
					{@render tree(node.children)}
				{:else}
					{@render line(node)}
				{/if}
			</div>
		{/if}
	{/each}
{/snippet}

{@render tree(nodes)}
