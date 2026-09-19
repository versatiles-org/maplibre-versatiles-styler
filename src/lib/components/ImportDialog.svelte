<script lang="ts">
	import Modal from './Modal.svelte';
	import {
		countSettings,
		groupDiagnostics,
		parseImport,
		summarizeProvenance,
		type ImportResult,
	} from '../transfer/import';
	import { is, type Diagnostic } from '@versatiles/style/migrate';
	import { DOCS } from '../transfer/docs';

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

	let groups = $derived(groupDiagnostics(result?.diagnostics ?? []));
	/** How much of the colour palette was actually read, rather than taken from the nearest theme. */
	let colors = $derived(summarizeProvenance(result?.provenance ?? {}, 'colors'));

	/**
	 * The colours a diagnostic offers as alternatives, or `undefined` for every other code.
	 *
	 * `color.conflict` is several layers painting the same feature — a z-order contest. `color.collapsed`
	 * is the source telling apart features this style has one setting for, which for an OpenMapTiles POI
	 * layer is systematic rather than incidental. Both end as "one colour had to serve", so both are
	 * worth showing as swatches.
	 */
	function swatches(d: Diagnostic): { color: string; label: string }[] | undefined {
		if (is(d, 'color.conflict')) {
			return d.data.observed.map((o) => ({ color: o.color, label: o.layers.join(', ') }));
		}
		if (is(d, 'color.collapsed')) {
			return d.data.observed.map((o) => ({ color: o.color, label: o.feature }));
		}
		return undefined;
	}

	/** The colour a diagnostic settled on, so the swatch that won can be marked. */
	function chosen(d: Diagnostic): string | undefined {
		if (is(d, 'color.conflict')) return d.data.chosen;
		if (is(d, 'color.collapsed')) return d.data.chosen;
		return undefined;
	}

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
				{#if colors.total > 0}
					<p class="import-note">
						{colors.observed} of {colors.total} colours were read from the style; the rest follow the
						<strong>{result.styleKey}</strong> theme.
					</p>
				{/if}

				{#if groups.warnings.length > 0}
					<p class="import-note">Worth knowing before you apply:</p>
					<ul class="import-diagnostics">
						{#each groups.warnings as d, index (index)}
							{@const alternatives = swatches(d)}
							<li>
								{d.message}
								{#if alternatives}
									{@const winner = chosen(d)}
									<!-- The whole point of the payload: the colours it had to choose between. -->
									<ul class="import-swatches">
										{#each alternatives as option, i (i)}
											<li class:won={option.color === winner}>
												<span class="import-swatch" style:--swatch={option.color}></span>
												<code>{option.color}</code>
												<span class="import-swatch-label">{option.label}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if groups.notes.length > 0}
					<!-- Collapsed: these are true of almost every import, and beside a real warning they
					     would only teach people to skim past both. -->
					<details class="import-notes">
						<summary
							>{groups.notes.length} more {groups.notes.length === 1 ? 'note' : 'notes'}</summary
						>
						<ul class="import-diagnostics">
							{#each groups.notes as d, index (index)}
								<li>{d.message}</li>
							{/each}
						</ul>
					</details>
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
