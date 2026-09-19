<script lang="ts">
	import { tokenize, truncateCode } from '../transfer/highlight';
	import { byteLength, copyText, formatSize } from '../transfer/export';

	/**
	 * A read-only code preview with a copy button.
	 *
	 * Tokens are rendered as elements, never as HTML, so nothing here can be interpolated as markup.
	 */
	let {
		code,
		label,
		maxChars = 20_000,
		filename,
		ondownload,
	}: {
		code: string;
		/** Names what is being copied, for the button's accessible name and the confirmation. */
		label: string;
		/** Long code is cut for the preview; the copy button still copies all of it. */
		maxChars?: number;
		/** Shown beside the size when this code is also downloadable. */
		filename?: string;
		ondownload?: () => void;
	} = $props();

	let preview = $derived(truncateCode(code, maxChars));
	let tokens = $derived(tokenize(preview.code));
	let size = $derived(formatSize(byteLength(code)));

	/** Set for a moment after copying, so the button can confirm without a dialog. */
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		await copyText(code);
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="code-block">
	<div class="code-actions">
		<span class="code-size">{filename ? `${filename} · ${size}` : size}</span>
		{#if ondownload}
			<button type="button" class="secondary-button" onclick={ondownload}>Download</button>
		{/if}
		<button type="button" class="primary-button" onclick={copy} aria-label="Copy {label}">
			{copied ? 'Copied' : 'Copy'}
		</button>
	</div>
	<!--
		Focusable and labelled on purpose: the preview scrolls, and a scrollable region that cannot be
		focused cannot be scrolled by keyboard alone (WCAG 2.1.1). The rule below only knows that `pre`
		is not interactive.
	-->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<pre class="code-preview" tabindex="0" role="region" aria-label="{label} preview"><code
			>{#each tokens as token, index (index)}<span class="tok-{token.kind}">{token.text}</span
				>{/each}</code
		>{#if preview.dropped > 0}<span class="code-cut"
				>… {formatSize(preview.dropped)} more not shown — copy or download for the whole file</span
			>{/if}</pre>
</div>
