import type { StyleSpecification } from 'maplibre-gl';

/** How a style.json is written out: readable, or as small as it goes. */
export type JsonFormat = 'pretty' | 'minified';

/**
 * A style as JSON.
 *
 * `'minified'` is what a style actually served to a browser should be — a pretty-printed style is
 * roughly a third larger for indentation nobody reads. `'pretty'` is for reading it here, and for
 * putting it under version control.
 */
export function styleJson(style: StyleSpecification, format: JsonFormat = 'pretty'): string {
	return format === 'minified' ? JSON.stringify(style) : JSON.stringify(style, null, 2);
}

/** Bytes as `1.2 kB` / `340 kB` / `1.1 MB`, for telling someone how big the download is. */
export function formatSize(bytes: number): string {
	if (bytes < 1000) return `${bytes} B`;
	if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} kB`;
	return `${(bytes / 1000 / 1000).toFixed(1)} MB`;
}

/** The byte length of `text` as UTF-8 — what the file will actually weigh, not its character count. */
export function byteLength(text: string): number {
	return new TextEncoder().encode(text).length;
}

/**
 * Offers `text` as a file download.
 *
 * Through a Blob URL rather than a `data:` URL: a style.json runs to hundreds of kilobytes, and
 * `encodeURIComponent` of that is both slow and up to triple the size, which some browsers refuse.
 */
export function downloadText(text: string, filename: string, type = 'application/json'): void {
	const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
	const a = document.createElement('a');
	a.setAttribute('href', url);
	a.setAttribute('download', filename);
	document.body.appendChild(a);
	a.click();
	a.remove();
	// The object URL holds the blob in memory until it is released; the click has already read it.
	URL.revokeObjectURL(url);
}

export function downloadStyle(style: StyleSpecification, format: JsonFormat = 'pretty'): void {
	downloadText(styleJson(style, format), 'style.json');
}

/** Copies `text` to the clipboard. Says nothing itself — the caller reports it. */
export async function copyText(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

/**
 * The link that reopens this map as it stands.
 *
 * It is just the current URL: the styler already keeps the view, the theme and every changed option in
 * the hash, so there is nothing to build. Returns `undefined` when the hash is switched off, since then
 * the URL says nothing about the style and sharing it would mislead.
 */
export function shareLink(hashEnabled: boolean): string | undefined {
	return hashEnabled ? window.location.href : undefined;
}
