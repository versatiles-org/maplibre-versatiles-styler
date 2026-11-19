import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	minimalConfig,
	satelliteDefaults,
	satelliteStateFromConfig,
	vectorDefaults,
	vectorStateFromConfig,
	type StyleKey,
} from './config';
import {
	enterStyle,
	leaveStyle,
	noCarriedChanges,
	type CarriedChanges,
	type StyleChanges,
} from './carry';

/**
 * The changes as the styler has them once a style is on the map: resolved into the panel's state and
 * minimized again. Changes that do not resolve would warn and fall back to the defaults.
 */
function asApplied(key: StyleKey, changes: StyleChanges): StyleChanges {
	if (key === 'satellite') {
		return minimalConfig(key, vectorDefaults('colorful'), satelliteStateFromConfig(changes));
	}
	return minimalConfig(key, vectorStateFromConfig(key, changes), satelliteDefaults());
}

/** Switches from one style, with its changes, to another, as the styler does. */
function switchStyle(
	carried: CarriedChanges,
	from: StyleKey,
	changes: StyleChanges,
	to: StyleKey
): { carried: CarriedChanges; changes: StyleChanges } {
	const next = leaveStyle(carried, from, changes);
	const entered = enterStyle(next, to);
	// The changes are already those the style has: nothing in them is invalid or a default.
	expect(asApplied(to, entered)).toEqual(entered);
	return { carried: next, changes: entered };
}

describe('carrying changes between styles', () => {
	const warn = vi.spyOn(console, 'warn');
	afterEach(() => {
		expect(warn).not.toHaveBeenCalled();
		warn.mockClear();
	});

	it('carries the options every palette shares, but not the colours', () => {
		const changes = asApplied('colorful', {
			text: { language: 'de' },
			layers: { roads: { motorways: false } },
			features: { hillshade: true, buildings: 'extruded' },
			projection: 'mercator',
			colors: { water: '#ff0000' },
			recolor: { rotateHue: 90 },
		});
		const { changes: dark } = switchStyle(noCarriedChanges(), 'colorful', changes, 'colorful-dark');
		expect(dark).toEqual({
			text: { language: 'de' },
			layers: { roads: { motorways: false } },
			features: { hillshade: true, buildings: 'extruded' },
			projection: 'mercator',
		});
	});

	it('brings back the colours of a palette when it is chosen again', () => {
		const light = asApplied('colorful', { colors: { water: '#ff0000' }, text: { language: 'de' } });
		let step = switchStyle(noCarriedChanges(), 'colorful', light, 'colorful-dark');
		step = switchStyle(step.carried, 'colorful-dark', step.changes, 'colorful');
		expect(step.changes).toEqual(light);
	});

	it('changes nothing for a palette that is left and chosen again', () => {
		const changes = asApplied('colorful', {
			colors: { water: '#ff0000' },
			recolor: { saturate: 0.5 },
		});
		const carried = leaveStyle(noCarriedChanges(), 'colorful', changes);
		expect(enterStyle(carried, 'colorful')).toEqual(changes);
	});

	it('does not bring back a shared change that a later style took back', () => {
		const light = asApplied('colorful', { text: { language: 'de' } });
		let step = switchStyle(noCarriedChanges(), 'colorful', light, 'colorful-dark');
		// The language goes back to the default in the dark palette.
		step = switchStyle(step.carried, 'colorful-dark', {}, 'colorful');
		expect(step.changes).toEqual({});
	});

	it('moves the map options into the overlay of the satellite style', () => {
		const changes = asApplied('colorful', {
			text: { language: 'fr' },
			layers: { roads: { motorways: false } },
			features: { terrain: true, buildings: 'extruded', landcover: false },
			colors: { water: '#ff0000' },
		});
		const { changes: satellite } = switchStyle(
			noCarriedChanges(),
			'colorful',
			changes,
			'satellite'
		);
		expect(satellite).toEqual({
			osmOverlay: { text: { language: 'fr' }, layers: { roads: { motorways: false } } },
			features: { terrain: true },
		});
		expect(satelliteStateFromConfig(satellite).osmOverlay).toMatchObject({
			text: { language: 'fr' },
		});
	});

	it('keeps the options satellite lacks for the vector style that comes after it', () => {
		const changes = asApplied('colorful', {
			features: { buildings: 'extruded', landcover: false },
			text: { language: 'fr' },
		});
		let step = switchStyle(noCarriedChanges(), 'colorful', changes, 'satellite');
		step = switchStyle(step.carried, 'satellite', step.changes, 'natural');
		expect(step.changes).toEqual(changes);
	});

	it('carries the overlay options of satellite back to the vector styles', () => {
		const changes = asApplied('satellite', {
			osmOverlay: { text: { language: 'it' }, colors: { water: '#00ff00' } },
			raster: { opacity: 0.5 },
			projection: 'mercator',
		});
		const { changes: vector } = switchStyle(noCarriedChanges(), 'satellite', changes, 'gray');
		expect(vector).toEqual({ text: { language: 'it' }, projection: 'mercator' });
	});

	it('brings back the imagery and the overlay of satellite when it is chosen again', () => {
		const changes = asApplied('satellite', {
			osmOverlay: { theme: 'colorful', colors: { water: '#00ff00' } },
			raster: { opacity: 0.5 },
		});
		let step = switchStyle(noCarriedChanges(), 'satellite', changes, 'colorful');
		step = switchStyle(step.carried, 'colorful', step.changes, 'satellite');
		expect(step.changes).toEqual(changes);
	});

	it('keeps the map options through a satellite style without its overlay', () => {
		const changes = asApplied('colorful', { text: { language: 'de' } });
		let step = switchStyle(noCarriedChanges(), 'colorful', changes, 'satellite');
		// The overlay is switched off: satellite has no map options then, and keeps none.
		step = switchStyle(step.carried, 'satellite', { osmOverlay: false }, 'colorful-dark');
		expect(step.changes).toEqual(changes);
		step = switchStyle(step.carried, 'colorful-dark', step.changes, 'satellite');
		expect(step.changes).toEqual({ osmOverlay: false });
	});

	it('does not change the changes it is given', () => {
		const changes = asApplied('colorful', {
			text: { language: 'de' },
			colors: { water: '#ff0000' },
		});
		const copy = structuredClone(changes);
		const carried = leaveStyle(noCarriedChanges(), 'colorful', changes);
		const entered = enterStyle(carried, 'colorful-dark');
		(entered.text as Record<string, unknown>).language = 'en';
		expect(changes).toEqual(copy);
		expect(enterStyle(carried, 'colorful-dark')).toEqual({ text: { language: 'de' } });
	});
});
