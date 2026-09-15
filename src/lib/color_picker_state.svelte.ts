import { getContext, setContext } from 'svelte';

export type ColorMode = 'rgb' | 'hsl' | 'hex';

/** What the color pickers of one styler share: the channel tab, kept from one picker to the next. */
export class ColorPickerState {
	mode = $state<ColorMode>('rgb');
}

const KEY = Symbol('color-picker-state');

/** Creates the state for a styler and makes it available to its components. */
export function provideColorPickerState(): ColorPickerState {
	return setContext(KEY, new ColorPickerState());
}

/** The state of the surrounding styler, or a state of its own outside one. */
export function useColorPickerState(): ColorPickerState {
	return getContext<ColorPickerState | undefined>(KEY) ?? new ColorPickerState();
}
