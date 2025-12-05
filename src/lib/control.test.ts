// control.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Map as MLGLMap } from 'maplibre-gl';

import { VersaTilesStylerControl } from './control';
import * as html from './html';
import { Styler } from './styler';
import type { VersaTilesStylerConfig } from './config';

// Optional: mock Styler, so we don't pull full UI in
vi.mock('./styler', () => {
	const StylerMock = vi.fn(function (this: any, map: MLGLMap, config: VersaTilesStylerConfig) {
		this.map = map;
		this.config = config;
		this.container = {} as HTMLElement;
	});

	return {
		Styler: StylerMock,
	};
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('VersaTilesStylerControl', () => {
	it('returns the default position "top-right"', () => {
		const control = new VersaTilesStylerControl();
		expect(control.getDefaultPosition()).toBe('top-right');
	});

	it('calls ensureStylesInjected only once per control instance', () => {
		const ensureSpy = vi.spyOn(html, 'ensureStylesInjected');

		const map = {} as MLGLMap;
		const control = new VersaTilesStylerControl();

		control.onAdd(map);
		control.onAdd(map); // weird usage, but good for testing the guard

		expect(ensureSpy).toHaveBeenCalledTimes(1);
	});

	it('creates a Styler with the given map and config and returns its container', () => {
		const map = {} as MLGLMap;
		const config: VersaTilesStylerConfig = { origin: 'https://example.com', open: true };

		const control = new VersaTilesStylerControl(config);
		const container = control.onAdd(map);

		const StylerMock = vi.mocked(Styler);
		expect(StylerMock).toHaveBeenCalledTimes(1);
		expect(StylerMock).toHaveBeenCalledWith(map, config);
		expect(container).toBe(StylerMock.mock.results[0].value.container);
	});

	it('onRemove is a no-op if never added', () => {
		const control = new VersaTilesStylerControl();
		expect(() => control.onRemove()).not.toThrow();
	});

	it('onRemove cleans up so that onAdd can be used again', () => {
		const map1 = {} as MLGLMap;
		const map2 = {} as MLGLMap;
		const control = new VersaTilesStylerControl();

		control.onAdd(map1);
		control.onRemove();
		control.onAdd(map2);

		const StylerMock = vi.mocked(Styler);
		expect(StylerMock).toHaveBeenCalledTimes(2);
		expect(StylerMock.mock.calls[0][0]).toBe(map1);
		expect(StylerMock.mock.calls[1][0]).toBe(map2);
	});
});