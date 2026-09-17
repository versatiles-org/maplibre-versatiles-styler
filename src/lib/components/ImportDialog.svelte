<script lang="ts">
	import Modal from './Modal.svelte';
	import { countSettings, parseImport, type ImportResult } from '../import';
	import { DOCS } from '../docs_links';

	let {
		currentOrigin,
		onapply,
		onclose,
	}: {
		/** The tile server in use, to notice when an imported style names another one. */
		currentOrigin: string;
		/** Applies the import. `origin` is set only when the user chose to switch tile server too. */
		onapply: (result: ImportResult, origin?: string) => void;
		onclose: () => void;
	} = $props();

	const uid = $props.id();

	let text = $state('');
	let busy = $state(false);
	let result = $state<ImportResult | undefined>();
	let error = $state<{ error: string; detail?: string } | undefined>();
	/** Whether to adopt the tile server the imported style names. */
	let adoptOrigin = $state(true);
	let dragging = $state(false);

	/** What each recognised input is called, and how exact it is. */
	const KINDS = {
		link: { name: 'a styler link', exact: true },
		options: { name: 'an options object', exact: true },
		recorded: { name: 'a style.json from this styler', exact: true },
		derived: { name: 'a MapLibre style', exact: false },
	} as const;

	let otherOrigin = $derived(
		result?.origin && result.origin !== currentOrigin ? result.origin : undefined
	);

	async function check() {
		if (busy) return;
		busy = true;
		result = undefined;
		error = undefined;
		const outcome = await parseImport(text);
		if (outcome.ok) result = outcome.result;
		else error = { error: outcome.error, detail: outcome.detail };
		busy = false;
	}

	function apply() {
		if (!result) return;
		onapply(result, otherOrigin && adoptOrigin ? otherOrigin : undefined);
	}

	/** Any change invalidates what was checked, so Apply never acts on stale text. */
	function handleInput() {
		result = undefined;
		error = undefined;
	}

	async function readFile(file: File) {
		text = await file.text();
		handleInput();
		await check();
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) await readFile(file);
	}

	async function handleFileInput(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) await readFile(file);
	}

	/** Ctrl/Cmd+Enter checks, so the keyboard alone gets through the dialog. */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			void check();
		}
	}
</script>

<Modal
	title="Import style"
	description="Bring in a style you made earlier, or one from somewhere else."
	{onclose}
>
	<div class="dialog-panel">
		<p class="dialog-note">
			Paste any of these, or drop a file: a <strong>link</strong> from this styler's Export, a
			<strong>style.json</strong>, the address of one, or a
			<strong>@versatiles/style</strong> options object. A style built for other tiles is translated
			as closely as it can be, and anything that could not come along is listed before you apply it.
			<a href={DOCS.migrate} target="_blank" rel="noopener noreferrer">More about importing</a>
		</p>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="drop-area"
			class:dragging
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={handleDrop}
		>
			<label class="visually-hidden" for="{uid}-text">Style, link or options</label>
			<textarea
				id="{uid}-text"
				bind:value={text}
				oninput={handleInput}
				onkeydown={handleKeydown}
				spellcheck="false"
				rows="8"
				placeholder={'https://example.org/#style=gray&config=…\n\nor  {"theme": "gray", "text": {"scale": 1.5}}\n\nor the contents of a style.json'}
			></textarea>
		</div>

		<div class="dialog-choice">
			<label class="file-button">
				Choose a file…
				<input type="file" accept="application/json,.json" onchange={handleFileInput} />
			</label>
			<button
				type="button"
				class="primary-button"
				disabled={busy || text.trim() === ''}
				onclick={check}>{busy ? 'Checking…' : 'Check'}</button
			>
		</div>

		{#if error}
			<div class="import-report import-error" role="alert">
				<p class="import-headline">{error.error}</p>
				{#if error.detail}
					<pre class="import-detail">{error.detail}</pre>
				{/if}
			</div>
		{:else if result}
			{@const kind = KINDS[result.kind]}
			{@const changes = countSettings(result.config)}
			<div class="import-report" role="status">
				<p class="import-headline">
					Recognised {kind.name} — <strong>{result.styleKey}</strong>
					{#if changes > 0}with {changes} changed setting{changes === 1 ? '' : 's'}{/if}.
				</p>
				{#if !kind.exact}
					<p class="import-note">
						Read by working out what the style draws, so it is a close copy rather than the
						original.
					</p>
				{/if}
				{#if result.warnings.length > 0}
					<!-- Neutral, because these are a mix: some things genuinely did not come across, others
					     merely follow the theme rather than the source style. -->
					<p class="import-note">Worth knowing before you apply:</p>
					<ul class="import-warnings">
						{#each result.warnings as warning, index (index)}
							<li>{warning}</li>
						{/each}
					</ul>
				{/if}
				{#if otherOrigin}
					<label class="import-origin">
						<input type="checkbox" bind:checked={adoptOrigin} />
						Also switch the tile server to <code>{otherOrigin}</code>
					</label>
				{/if}
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<button type="button" class="secondary-button" onclick={onclose}>Cancel</button>
		<button type="button" class="primary-button" disabled={!result} onclick={apply}>
			Apply to the map
		</button>
	{/snippet}
</Modal>
