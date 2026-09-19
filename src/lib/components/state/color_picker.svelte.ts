import { getContext, setContext } from 'svelte';
import type { Space } from '../inputs/color_model';

/** What the color pickers of one styler share: the color space, kept from one picker to the next. */
export class ColorPickerState {
	space = $state<Space>('srgb');
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
