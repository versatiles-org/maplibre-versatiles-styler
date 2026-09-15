<script lang="ts">
	import type { FontFaceInfo, FontGroupMap, ResolvedFonts } from '@versatiles/style';
	import {
		coverageWarning,
		fontGroupNodes,
		fontSample,
		pickerFaces,
		uniformFace,
		withFace,
	} from '../../font_tree';
	import InputFont from '../inputs/InputFont.svelte';
	import InputText from '../inputs/InputText.svelte';

	let {
		fonts = $bindable(),
		defaults,
		fontGroups,
		fontFaces,
		origin,
		language,
		disabled = false,
	}: {
		fonts: ResolvedFonts;
		defaults: ResolvedFonts;
		/** `osm.fontGroups` / `satellite.fontGroups`: which topics exist. */
		fontGroups: FontGroupMap;
		fontFaces: Promise<FontFaceInfo[] | undefined>;
		/** The server the glyphs for the previews come from. */
		origin: string;
		/** `text.language`, to warn about faces without its letters. */
		language: string;
		disabled?: boolean;
	} = $props();

	type Tree = Record<string, string | Record<string, string>>;

	let groups = $derived(fontGroupNodes(fontGroups, defaults));
	let expanded = $state<Record<string, boolean>>({});

	const MIXED = 'Mixed';

	function inUse(tree: ResolvedFonts): string[] {
		return Object.values(tree).flatMap((node) =>
			typeof node === 'string' ? [node] : Object.values(node)
		);
	}

	// A select only ever writes a face; `undefined` comes from its reset button and restores the
	// defaults, which may mix faces.
	function setAll(face: string | undefined) {
		fonts = face === undefined ? structuredClone(defaults) : withFace(fonts, face);
	}
	function getGroup(key: string): string | undefined {
		return uniformFace((fonts as Tree)[key]);
	}
	function setGroup(key: string, face: string | undefined) {
		const tree = fonts as Tree;
		tree[key] =
			face === undefined ? structuredClone((defaults as Tree)[key]) : withFace(tree[key], face);
	}
	function groupModified(key: string): boolean {
		return JSON.stringify((fonts as Tree)[key]) !== JSON.stringify((defaults as Tree)[key]);
	}
	function getTopic(group: string, topic: string): string {
		return ((fonts as Tree)[group] as Record<string, string>)[topic];
	}
	function setTopic(group: string, topic: string, face: string | undefined) {
		((fonts as Tree)[group] as Record<string, string>)[topic] = face ?? defaultTopic(group, topic);
	}
	function defaultTopic(group: string, topic: string): string {
		return ((defaults as Tree)[group] as Record<string, string>)[topic];
	}
</script>

{#await fontFaces then faces}
	{#if faces}
		{@const choices = pickerFaces(faces, [...inUse(fonts), ...inUse(defaults)])}
		<InputFont
			label="All labels"
			{disabled}
			bind:value={() => uniformFace(fonts), setAll}
			defaultValue={uniformFace(defaults)}
			modified={JSON.stringify(fonts) !== JSON.stringify(defaults)}
			faces={choices}
			{origin}
			sample={fontSample('all')}
			{language}
			expanded={false}
			warning={coverageWarning(faces, uniformFace(fonts), language)}
		/>
		{#each groups as group (group.key)}
			{@const hasTopics = group.topics.length > 0}
			<InputFont
				label={group.label}
				{disabled}
				bind:value={() => getGroup(group.key), (face) => setGroup(group.key, face)}
				defaultValue={uniformFace((defaults as Tree)[group.key])}
				modified={groupModified(group.key)}
				faces={choices}
				{origin}
				sample={fontSample(group.key)}
				{language}
				expanded={expanded[group.key] ?? false}
				onToggle={hasTopics
					? () => (expanded[group.key] = !(expanded[group.key] ?? false))
					: undefined}
				warning={expanded[group.key]
					? undefined
					: coverageWarning(faces, getGroup(group.key), language)}
			/>
			{#if hasTopics && expanded[group.key]}
				<div class="nested">
					{#each group.topics as topic (topic.key)}
						<InputFont
							label={topic.label}
							{disabled}
							bind:value={
								() => getTopic(group.key, topic.key), (face) => setTopic(group.key, topic.key, face)
							}
							defaultValue={defaultTopic(group.key, topic.key)}
							faces={choices}
							{origin}
							sample={fontSample(`${group.key}.${topic.key}`)}
							{language}
							warning={coverageWarning(faces, getTopic(group.key, topic.key), language)}
						/>
					{/each}
				</div>
			{/if}
		{/each}
	{:else}
		<!-- The server publishes no list of faces: glyph names are typed in. -->
		<InputText
			label="All labels"
			hint="A glyph name, e.g. noto_sans_regular"
			{disabled}
			bind:value={() => uniformFace(fonts), setAll}
			defaultValue={uniformFace(defaults)}
			modified={JSON.stringify(fonts) !== JSON.stringify(defaults)}
			placeholder={MIXED}
		/>
		{#each groups as group (group.key)}
			<InputText
				label={group.label}
				{disabled}
				bind:value={() => getGroup(group.key), (face) => setGroup(group.key, face)}
				defaultValue={uniformFace((defaults as Tree)[group.key])}
				modified={groupModified(group.key)}
				placeholder={MIXED}
			/>
		{/each}
	{/if}
{/await}
