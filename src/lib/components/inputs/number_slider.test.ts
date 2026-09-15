import { describe, it, expect } from 'vitest';
import {
	logPositions,
	roundValue,
	sliderLabel,
	sliderPosition,
	sliderRange,
	sliderValue,
	type SliderOptions,
} from './number_slider';

const percent: SliderOptions = { min: 0, max: 1, scale: 100, step: 0.01, logarithmic: false };
const degrees: SliderOptions = { min: 0, max: 360, scale: 1, step: 1, logarithmic: false };
const gamma: SliderOptions = { min: 0.1, max: 10, scale: 1, step: 0.01, logarithmic: true };
const contrast: SliderOptions = { min: 0.1, max: 10, scale: 100, step: 0.01, logarithmic: true };
const exaggeration: SliderOptions = {
	min: 0.1,
	max: 5,
	scale: 100,
	step: 0.01,
	logarithmic: false,
};

describe('linear sliders', () => {
	it('have one integer position per step', () => {
		expect(sliderRange(percent)).toEqual({ min: 0, max: 100, step: 1 });
		expect(sliderRange(degrees)).toEqual({ min: 0, max: 360, step: 1 });
		expect(sliderRange(exaggeration)).toEqual({ min: 10, max: 500, step: 1 });
	});

	it('round-trip every position without float noise', () => {
		for (let p = 0; p <= 100; p++) {
			const value = sliderValue(p, percent);
			expect(sliderPosition(value, percent)).toBe(p);
			expect(String(value).length).toBeLessThanOrEqual(4);
		}
		expect(sliderValue(29, percent)).toBe(0.29);
		expect(sliderValue(57, percent)).toBe(0.57);
	});

	it('clamp values outside the range', () => {
		expect(sliderPosition(2, percent)).toBe(100);
		expect(sliderPosition(-1, percent)).toBe(0);
		expect(sliderValue(1000, exaggeration)).toBe(5);
	});
});

describe('logarithmic sliders', () => {
	it('have one step per position at 1', () => {
		expect(logPositions(gamma)).toBe(462);
	});

	it('put 1 in the middle of 0.1–10, and reach the ends', () => {
		const LOG_POSITIONS = logPositions(gamma);
		expect(sliderRange(gamma)).toEqual({ min: 0, max: LOG_POSITIONS, step: 1 });
		expect(sliderPosition(1, gamma)).toBe(LOG_POSITIONS / 2);
		expect(sliderValue(LOG_POSITIONS / 2, gamma)).toBe(1);
		expect(sliderValue(0, gamma)).toBe(0.1);
		expect(sliderValue(LOG_POSITIONS, gamma)).toBe(10);
	});

	it('move in small steps around 1, and halving takes as long as doubling', () => {
		const LOG_POSITIONS = logPositions(gamma);
		expect(sliderValue(LOG_POSITIONS / 2 + 1, gamma)).toBe(1.01);
		expect(sliderValue(LOG_POSITIONS / 2 - 1, gamma)).toBe(0.99);
		const toDouble = sliderPosition(2, gamma) - sliderPosition(1, gamma);
		const toHalf = sliderPosition(1, gamma) - sliderPosition(0.5, gamma);
		expect(toDouble).toBe(toHalf);
	});

	it('keep three significant digits, and every position is a different value', () => {
		const values = new Set<number>();
		for (let p = 0; p <= logPositions(gamma); p++) values.add(sliderValue(p, gamma));
		expect(values.size).toBe(logPositions(gamma) + 1);
		for (let p = 0; p <= logPositions(gamma); p += 37) {
			const value = sliderValue(p, gamma);
			expect(value).toBe(roundValue(value, gamma));
			expect(String(value).replace(/^0\.0*|\./g, '').length).toBeLessThanOrEqual(3);
		}
	});
});

describe('labels', () => {
	it('show as many decimals as the step allows', () => {
		expect(sliderLabel(0.29, percent, '%')).toBe('29%');
		expect(sliderLabel(1, gamma, '')).toBe('1');
		expect(sliderLabel(1.05, gamma, '')).toBe('1.05');
		expect(sliderLabel(2.5, contrast, '%')).toBe('250%');
		expect(sliderLabel(0.123, contrast, '%')).toBe('12.3%');
		expect(sliderLabel(0.1234, gamma, '')).toBe('0.123');
		expect(sliderLabel(180, degrees, '°')).toBe('180°');
	});
});
