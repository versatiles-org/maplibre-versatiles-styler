<script lang="ts">
	import type { StyleSpecification } from 'maplibre-gl';
	import Modal from './Modal.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import { downloadStyle, styleJson, type JsonFormat } from '../transfer/export';
	import { DOCS } from '../transfer/docs';

	let {
		style,
		code,
		onclose,
	}: {
		/** The style as built, or `undefined` while a TileJSON it needs is still loading. */
		style: StyleSpecification | undefined;
		/** The `@versatiles/style` snippet for the current options, for where it will run. */
		code: (target: 'npm' | 'browser') => string;
		onclose: () => void;
	} = $props();

	type Tab = 'json' | 'code';
	const tabs: { id: Tab; label: string }[] = [
		{ id: 'json', label: 'style.json' },
		{ id: 'code', label: 'Code' },
	];

	let tab = $state<Tab>('json');
	let format = $state<JsonFormat>('pretty');
	let target = $state<'npm' | 'browser'>('npm');

	// Stringifying a large style is not free, so it happens for the tab actually being looked at.
	let json = $derived(tab === 'json' && style ? styleJson(style, format) : '');
	let snippet = $derived(tab === 'code' ? code(target) : '');

	/** ←/→ move between tabs, as in a tablist. */
	function handleTabKeydown(event: KeyboardEvent, index: number) {
		const moves: Record<string, number> = {
			ArrowLeft: index - 1,
			ArrowRight: index + 1,
			Home: 0,
			End: tabs.length - 1,
		};
		if (!(event.key in moves)) return;
		event.preventDefault();
		const next = (moves[event.key] + tabs.length) % tabs.length;
		tab = tabs[next].id;
		const list = (event.currentTarget as HTMLElement).parentElement;
		(list?.children[next] as HTMLElement | undefined)?.focus();
	}
</script>

{#snippet segmented(
	label: string,
	value: string,
	options: { value: string; label: string }[],
	choose: (v: string) => void
)}
	<div class="segmented" role="radiogroup" aria-label={label}>
		{#each options as option (option.value)}
			<button
				type="button"
				role="radio"
				aria-checked={option.value === value}
				tabindex={option.value === value ? 0 : -1}
				onclick={() => choose(option.value)}>{option.label}</button
			>
		{/each}
	</div>
{/snippet}

{#snippet tabStrip()}
	<div class="dialog-tabs" role="tablist" aria-label="What to export">
		{#each tabs as entry, index (entry.id)}
			<button
				type="button"
				role="tab"
				id="export-tab-{entry.id}"
				aria-selected={tab === entry.id}
				aria-controls="export-panel-{entry.id}"
				tabindex={tab === entry.id ? 0 : -1}
				onclick={() => (tab = entry.id)}
				onkeydown={(event) => handleTabKeydown(event, index)}>{entry.label}</button
			>
		{/each}
	</div>
{/snippet}

<Modal
	title="Export style"
	description="Take this map style with you."
	toolbar={tabStrip}
	{onclose}
>
	{#if tab === 'json'}
		<div
			class="dialog-panel"
			role="tabpanel"
			id="export-panel-json"
			aria-labelledby="export-tab-json"
		>
			<p class="dialog-note">
				A <strong>style.json</strong> is the finished map style: colours, fonts and every layer,
				ready for MapLibre to draw. Nothing is loaded from this styler afterwards — hand the file to
				<code>new maplibregl.Map({'{ style: … }'})</code>.
				<a href={DOCS.styleSpec} target="_blank" rel="noopener noreferrer"
					>What is in a style.json?</a
				>
			</p>
			{#if style}
				<div class="dialog-choice">
					<span class="dialog-choice-label">Format</span>
					{@render segmented(
						'Format',
						format,
						[
							{ value: 'pretty', label: 'Readable' },
							{ value: 'minified', label: 'Smallest' },
						],
						(value) => (format = value as JsonFormat)
					)}
				</div>
				<CodeBlock
					code={json}
					label="style.json"
					filename="style.json"
					ondownload={() => style && downloadStyle(style, format)}
				/>
			{:else}
				<p class="dialog-note">The style is still loading.</p>
			{/if}
		</div>
	{:else if tab === 'code'}
		<div
			class="dialog-panel"
			role="tabpanel"
			id="export-panel-code"
			aria-labelledby="export-tab-code"
		>
			<p class="dialog-note">
				Instead of a file, let <strong>@versatiles/style</strong> build the style in your own page.
				The options below are exactly what you set here, so you can keep editing them in code.
				<a
					href={target === 'npm' ? DOCS.styleNpm : DOCS.styleBrowser}
					target="_blank"
					rel="noopener noreferrer">How to use it</a
				>
			</p>
			<div class="dialog-choice">
				<span class="dialog-choice-label">For</span>
				{@render segmented(
					'Where the code runs',
					target,
					[
						{ value: 'npm', label: 'npm project' },
						{ value: 'browser', label: 'HTML page' },
					],
					(value) => (target = value as 'npm' | 'browser')
				)}
			</div>
			<CodeBlock code={snippet} label="the code snippet" />
		</div>
	{/if}
</Modal>
