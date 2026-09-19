import { getContext, setContext } from 'svelte';
import { inScriptOrder } from '../../fonts/scripts';

/**
 * What the font pickers of one styler share: the script filter, kept from one picker to the next until
 * it is changed, and a font copied with Ctrl/Cmd+C for pasting elsewhere.
 */
export class FontPickerState {
	/** Show only faces that can write all these scripts (ISO 15924), in `FONT_SCRIPTS` order. */
	scripts = $state<string[]>([]);
	/** The face id copied from a font row. */
	clipboard = $state<string | undefined>();
	/**
	 * The texts of the labels the map shows now, of the given text layers — set by the styler, which has
	 * the map. `undefined` outside a styler.
	 */
	labelTexts: ((layerIds: readonly string[]) => string[]) | undefined;

	toggleScript(code: string): void {
		this.scripts = this.scripts.includes(code)
			? this.scripts.filter((script) => script !== code)
			: inScriptOrder([...this.scripts, code]);
	}

	setScripts(codes: readonly string[]): void {
		this.scripts = inScriptOrder(codes.filter((code, i) => codes.indexOf(code) === i));
	}

	clearScripts(): void {
		this.scripts = [];
	}
}

const KEY = Symbol('font-picker-state');

/** Creates the state for a styler and makes it available to its components. */
export function provideFontPickerState(): FontPickerState {
	return setContext(KEY, new FontPickerState());
}

/** The state of the surrounding styler, or a state of its own outside one. */
export function useFontPickerState(): FontPickerState {
	return getContext<FontPickerState | undefined>(KEY) ?? new FontPickerState();
}
