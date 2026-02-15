import type { StyleSpecification } from 'maplibre-gl';
import type { StyleBuilderOptions, SatelliteStyleOptions } from '@versatiles/style';
import type { StyleKey } from './style_config';

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

export async function copyStyleCode(
	styleKey: StyleKey,
	minimalOptions: StyleBuilderOptions | SatelliteStyleOptions
): Promise<void> {
	let optionsString = minimalOptions ? JSON.stringify(minimalOptions, null, 2) : '';
	optionsString = optionsString.replace(/\s\s"([^"]+)": /g, '  $1: ');
	const awaitPrefix = styleKey === 'satellite' ? 'await ' : '';
	const call = `${awaitPrefix}${styleKey}(${optionsString})`;
	const code = `import { ${styleKey} } from '@versatiles/style';\nconst style = ${call};`;
	await navigator.clipboard.writeText(code);
	alert('Style code copied to clipboard');
}
