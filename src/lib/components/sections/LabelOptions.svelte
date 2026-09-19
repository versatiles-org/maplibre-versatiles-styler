<script lang="ts">
	import type {
		FontFaceInfo,
		ResolvedLabelStyle,
		ResolvedText,
		TextGroupMap,
	} from '@versatiles/style';
	import { coverageWarning, fontSample, pickerFaces } from '../../fonts/tree';
	import { fontUsage } from '../../fonts/families';
	import {
		ALL_LABELS,
		labelNodes,
		nodeLayers,
		nodeModified,
		nodeValue,
		resetNode,
		setNodeValue,
		topicFonts,
		type LabelStyleKey,
	} from '../../options/labels';
	import type { SelectOption } from '../inputs/select';
	import InputFont from '../inputs/InputFont.svelte';
	import InputNumber from '../inputs/InputNumber.svelte';
	import InputSegmented from '../inputs/InputSegmented.svelte';
	import InputSelect from '../inputs/InputSelect.svelte';
	import InputText from '../inputs/InputText.svelte';
	import LanguageOptions from './LanguageOptions.svelte';

	let {
		text = $bindable(),
		defaults,
		textGroups,
		fontFaces,
		origin,
		languages,
		disabled = false,
	}: {
		text: ResolvedText;
		defaults: ResolvedText;
		/** `osm.textGroups` / `satellite.textGroups`: which topics exist. */
		textGroups: TextGroupMap;
		fontFaces: Promise<FontFaceInfo[] | undefined>;
		/** The server the glyphs for the font previews come from. */
		origin: string;
		/** The tileset's languages, `{ title: code }`. */
		languages: Record<string, string>;
		disabled?: boolean;
	} = $props();

	type NumberKey = Exclude<LabelStyleKey, 'font' | 'transform'>;

	interface NumberEditor {
		key: NumberKey;
		label: string;
		hint?: string;
		min: number;
		max: number;
		scale?: number;
		step?: number;
		unit: string;
	}

	const SIZE: NumberEditor[] = [
		{ key: 'scale', label: 'Size', min: 0.5, max: 3, scale: 100, unit: '%' },
		{
			key: 'spacing',
			label: 'Spacing',
			hint: 'Keep labels further apart (above 100%) so fewer are shown, or closer together.',
			min: 0.5,
			max: 4,
			scale: 100,
			unit: '%',
		},
	];

	const SHAPE: NumberEditor[] = [
		{ key: 'letterSpacing', label: 'Letter spacing', min: -0.1, max: 0.5, step: 0.01, unit: 'em' },
		{ key: 'lineHeight', label: 'Line height', min: 0.8, max: 2, step: 0.05, unit: 'em' },
		{
			key: 'maxWidth',
			label: 'Max width',
			hint: 'Longer labels wrap onto a new line at this width.',
			min: 1,
			max: 30,
			step: 0.5,
			unit: 'em',
		},
		{
			key: 'haloWidth',
			label: 'Halo width',
			hint: 'The outline that keeps labels readable on any background.',
			min: 0,
			max: 5,
			step: 0.1,
			unit: 'px',
		},
		{ key: 'haloBlur', label: 'Halo blur', min: 0, max: 5, step: 0.1, unit: 'px' },
	];

	const TRANSFORMS: SelectOption[] = [
		{ value: 'none', label: 'Aa', title: 'As written' },
		{ value: 'uppercase', label: 'AA', title: 'Uppercase' },
		{ value: 'lowercase', label: 'aa', title: 'Lowercase' },
	];

	const PITCH_ALIGNMENTS: SelectOption[] = [
		{ value: 'map', label: 'Flat' },
		{ value: 'viewport', label: 'Upright' },
	];

	const MIXED = 'Mixed';
	/** Options of a select cannot be styled: no-break spaces indent the topics of a group. */
	const INDENT = String.fromCharCode(0xa0).repeat(3);

	let nodes = $derived(labelNodes(textGroups, defaults));
	let selected = $state(ALL_LABELS);
	let node = $derived(nodes.find((n) => n.path === selected) ?? nodes[0]);
	let usage = $derived(fontUsage(text, nodes));

	let nodeOptions = $derived(
		nodes.map((n) => ({
			value: n.path,
			label: INDENT.repeat(n.depth) + n.label + (nodeModified(text, defaults, n) ? ' •' : ''),
		}))
	);

	function get<K extends LabelStyleKey>(key: K): ResolvedLabelStyle[K] | undefined {
		return nodeValue(text, node, key);
	}
	function set<K extends LabelStyleKey>(key: K, value: ResolvedLabelStyle[K] | undefined) {
		setNodeValue(text, defaults, node, key, value);
	}
	function modified(key: LabelStyleKey): boolean {
		return nodeModified(text, defaults, node, key);
	}
</script>

{#snippet numberEditor(editor: NumberEditor)}
	<InputNumber
		label={editor.label}
		hint={editor.hint}
		{disabled}
		bind:value={() => get(editor.key), (v) => set(editor.key, v)}
		defaultValue={nodeValue(defaults, node, editor.key)}
		modified={modified(editor.key)}
		min={editor.min}
		max={editor.max}
		scale={editor.scale}
		step={editor.step}
		unit={editor.unit}
		placeholder={MIXED}
	/>
{/snippet}

<LanguageOptions
	bind:language={text.language}
	bind:languageStrict={text.languageStrict}
	{languages}
	{disabled}
/>
<InputSegmented
	label="Tilted line labels"
	hint="How street and river names sit when the map is tilted: lying on the ground, or standing up facing the viewer."
	{disabled}
	bind:value={
		() => text.pitchAlignment,
		(v) => (text.pitchAlignment = (v ?? defaults.pitchAlignment) as ResolvedText['pitchAlignment'])
	}
	defaultValue={defaults.pitchAlignment}
	options={PITCH_ALIGNMENTS}
/>

<p class="subsection-title">Label style</p>
<InputSelect
	label="Apply to"
	hint="The labels the settings below change. • marks labels with changes; the reset button restores the selected labels."
	bind:value={
		() => node.path,
		(path) => (path === undefined ? resetNode(text, defaults, node) : (selected = path))
	}
	defaultValue={undefined}
	modified={nodeModified(text, defaults, node)}
	options={nodeOptions}
/>
<div class="nested">
	{#await fontFaces then faces}
		{#if faces}
			<InputFont
				label="Font"
				pickerTitle={node.label}
				{disabled}
				bind:value={() => get('font'), (v) => set('font', v)}
				defaultValue={nodeValue(defaults, node, 'font')}
				modified={modified('font')}
				faces={pickerFaces(faces, [...topicFonts(text, nodes), ...topicFonts(defaults, nodes)])}
				{origin}
				sample={fontSample(node.path)}
				language={text.language}
				layers={nodeLayers(textGroups, node)}
				{usage}
				warning={coverageWarning(faces, get('font'), text.language)}
			/>
		{:else}
			<!-- The server publishes no list of faces: glyph names are typed in. -->
			<InputText
				label="Font"
				hint="A glyph name, e.g. noto_sans_regular"
				{disabled}
				bind:value={() => get('font'), (v) => set('font', v)}
				defaultValue={nodeValue(defaults, node, 'font')}
				modified={modified('font')}
				placeholder={MIXED}
			/>
		{/if}
	{/await}
	{#each SIZE as editor (editor.key)}
		{@render numberEditor(editor)}
	{/each}
	<InputSegmented
		label="Capitalization"
		{disabled}
		bind:value={
			() => get('transform'),
			(v) => set('transform', v as ResolvedLabelStyle['transform'] | undefined)
		}
		defaultValue={nodeValue(defaults, node, 'transform')}
		modified={modified('transform')}
		options={TRANSFORMS}
	/>
	{#each SHAPE as editor (editor.key)}
		{@render numberEditor(editor)}
	{/each}
</div>
