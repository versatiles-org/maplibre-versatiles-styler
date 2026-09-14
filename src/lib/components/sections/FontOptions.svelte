<script lang="ts">
	import type { FontFaceInfo, ResolvedFonts } from '@versatiles/style';
	import { osm } from '@versatiles/style';
	import InputSelect from '../inputs/InputSelect.svelte';

	// Interim: one select that sets every label topic to the same face. Replaced by the per-topic
	// font tree (phase 3 of the v6 migration).

	let {
		fonts = $bindable(),
		defaults,
		fontFaces,
	}: {
		fonts: ResolvedFonts;
		defaults: ResolvedFonts;
		fontFaces: Promise<FontFaceInfo[] | undefined>;
	} = $props();

	const THEME_DEFAULT = '';

	/** The face every topic uses, or `THEME_DEFAULT` when they differ. */
	function uniformFace(tree: ResolvedFonts): string {
		const faces: string[] = [];
		const walk = (node: unknown) => {
			if (typeof node === 'string') faces.push(node);
			else if (node && typeof node === 'object') Object.values(node).forEach(walk);
		};
		walk(tree);
		return faces.length > 0 && faces.every((face) => face === faces[0]) ? faces[0] : THEME_DEFAULT;
	}

	let defaultFace = $derived(uniformFace(defaults));

	function faceOptions(faces: FontFaceInfo[] | undefined): Record<string, string> {
		const options: Record<string, string> = { 'Theme default': THEME_DEFAULT };
		for (const face of faces ?? []) options[face.title] = face.id;
		return options;
	}
</script>

{#await fontFaces then faces}
	<InputSelect
		label="Font"
		bind:value={
			() => uniformFace(fonts),
			(id) =>
				(fonts =
					id === THEME_DEFAULT
						? structuredClone(defaults)
						: osm.resolveOptions({ text: { fonts: id } }).text.fonts)
		}
		defaultValue={defaultFace}
		options={faceOptions(faces)}
	/>
{/await}
