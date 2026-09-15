import { getContext, setContext } from 'svelte';

/**
 * What the font pickers of one styler share: the language filter, kept from one font row to the next
 * until it is reset, and a font copied with Ctrl/Cmd+C for pasting into another row.
 */
export class FontPickerState {
	/** Show only faces with the letters of all these languages. */
	languages = $state<string[]>([]);
	/** The face id copied from a font row. */
	clipboard = $state<string | undefined>();

	toggleLanguage(code: string): void {
		this.languages = this.languages.includes(code)
			? this.languages.filter((language) => language !== code)
			: [...this.languages, code];
	}

	resetLanguages(): void {
		this.languages = [];
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
