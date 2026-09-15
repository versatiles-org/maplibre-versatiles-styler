import type { StyleSpecification } from 'maplibre-gl';

export function downloadStyle(style: StyleSpecification): void {
	const json = JSON.stringify(style, null, 2);
	const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
	const a = document.createElement('a');
	a.setAttribute('href', dataStr);
	a.setAttribute('download', 'style.json');
	document.body.appendChild(a);
	a.click();
	a.remove();
}

export async function copyStyleCode(code: string): Promise<void> {
	await navigator.clipboard.writeText(code);
}
