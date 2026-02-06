import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Map as MLGLMap } from 'maplibre-gl';
import { VersaTilesStylerControl } from './control';
import type { VersaTilesStylerConfig } from './types';

// Mock Svelte mount/unmount
const mountMock = vi.fn(() => ({}));
const unmountMock = vi.fn();

vi.mock('svelte', () => ({
	mount: (...args: any[]) => mountMock(...args),
	unmount: (...args: any[]) => unmountMock(...args),
}));

vi.mock('./Styler.svelte', () => ({
	default: {},
}));

vi.mock('./styles', () => ({
	ensureStylesInjected: vi.fn(),
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe('VersaTilesStylerControl', () => {
	it('returns the default position "top-right"', () => {
		const control = new VersaTilesStylerControl();
		expect(control.getDefaultPosition()).toBe('top-right');
	});

	it('calls ensureStylesInjected and mounts Svelte component on add', () => {
		const map = {} as MLGLMap;
		const config: VersaTilesStylerConfig = { origin: 'https://example.com', open: true };

		const control = new VersaTilesStylerControl(config);
		const container = control.onAdd(map);

		expect(mountMock).toHaveBeenCalledTimes(1);
		expect(container).toBeInstanceOf(HTMLDivElement);
		expect(container.className).toBe('maplibregl-versatiles-styler');
	});

	it('passes map and config as props when mounting', () => {
		const map = {} as MLGLMap;
		const config: VersaTilesStylerConfig = { origin: 'https://example.com', open: true };

		const control = new VersaTilesStylerControl(config);
		control.onAdd(map);

		expect(mountMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				props: { map, config },
			})
		);
	});

	it('onRemove is a no-op if never added', () => {
		const control = new VersaTilesStylerControl();
		expect(() => control.onRemove()).not.toThrow();
		expect(unmountMock).not.toHaveBeenCalled();
	});

	it('onRemove unmounts the component and cleans up', () => {
		const map = {} as MLGLMap;
		const control = new VersaTilesStylerControl();

		control.onAdd(map);
		expect(mountMock).toHaveBeenCalledTimes(1);

		control.onRemove();
		expect(unmountMock).toHaveBeenCalledTimes(1);
	});

	it('onRemove cleans up so that onAdd can be used again', () => {
		const map1 = {} as MLGLMap;
		const map2 = {} as MLGLMap;
		const control = new VersaTilesStylerControl();

		control.onAdd(map1);
		control.onRemove();
		control.onAdd(map2);

		expect(mountMock).toHaveBeenCalledTimes(2);
	});
});
