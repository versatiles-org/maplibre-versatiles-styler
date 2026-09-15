export interface SliderOptions {
	min: number;
	max: number;
	/** Factor from the option value to the displayed value, e.g. 100 for percent. */
	scale: number;
	/** The smallest change of the option value; values are rounded to it. */
	step: number;
	/**
	 * Positions spread evenly over the ratio from `min` to `max`, for factors where 1 means no change:
	 * 0.1–10 puts 1 in the middle, and halving takes as much slider travel as doubling.
	 */
	logarithmic: boolean;
}

/**
 * How many positions a logarithmic slider has: one `step` per position at the value 1, where these
 * factors are neutral, and an even count so that 1 lies on a position when the range is symmetric
 * around it (0.1–10 with a step of 0.01: 462 positions, 1 at position 231).
 */
export function logPositions(options: Pick<SliderOptions, 'min' | 'max' | 'step'>): number {
	return 2 * Math.round(Math.log(options.max / options.min) / Math.log(1 + options.step) / 2);
}

/** The attributes of the `<input type="range">`. */
export function sliderRange(options: SliderOptions): { min: number; max: number; step: number } {
	if (options.logarithmic) return { min: 0, max: logPositions(options), step: 1 };
	// Integer positions, one per `step`: a fractional `step` attribute accumulates rounding errors in the
	// browser, and a `min` that is not a multiple of the step moves every reachable value off the round
	// numbers (gamma used to offer 0.1, 1.1, 2.1, … but not 1).
	return {
		min: Math.round(options.min / options.step),
		max: Math.round(options.max / options.step),
		step: 1,
	};
}

/** The slider position of an option value. */
export function sliderPosition(value: number, options: SliderOptions): number {
	const v = Math.min(Math.max(value, options.min), options.max);
	if (options.logarithmic) {
		return Math.round(
			(Math.log(v / options.min) / Math.log(options.max / options.min)) * logPositions(options)
		);
	}
	return Math.round(v / options.step);
}

/**
 * The option value at a slider position. A linear slider rounds to `step`; a logarithmic one keeps as many
 * significant digits as `step` gives at 1 (0.01: three — 0.102, 1.01, 9.87), so every position is about
 * 1 % apart across the whole range instead of 0.01 apart.
 */
export function sliderValue(position: number, options: SliderOptions): number {
	const raw = options.logarithmic
		? options.min * Math.pow(options.max / options.min, position / logPositions(options))
		: position * options.step;
	return roundValue(Math.min(Math.max(raw, options.min), options.max), options);
}

export function roundValue(
	value: number,
	options: Pick<SliderOptions, 'step' | 'logarithmic'>
): number {
	if (options.logarithmic) return Number(value.toPrecision(significantDigits(options.step)));
	return Number((Math.round(value / options.step) * options.step).toFixed(decimals(options.step)));
}

/** The value as the slider shows it: scaled, with the precision the slider has. */
export function sliderLabel(value: number, options: SliderOptions, unit: string): string {
	const clamped = Math.min(Math.max(value, options.min), options.max);
	const shown = options.logarithmic
		? Number(
				(roundValue(clamped, options) * options.scale).toPrecision(significantDigits(options.step))
			)
		: Number((clamped * options.scale).toFixed(decimals(options.step * options.scale)));
	return `${shown}${unit}`;
}

function decimals(step: number): number {
	return Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
}

function significantDigits(step: number): number {
	return decimals(step) + 1;
}
