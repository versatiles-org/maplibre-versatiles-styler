import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Map as MLGLMap } from 'maplibre-gl';
import { HashManager } from './hash';

function createMockMap(overrides: Partial<Record<string, any>> = {}) {
	return {
		getCenter: vi.fn(() => ({ lat: 51.5, lng: -0.12 })),
		getZoom: vi.fn(() => 10),
		getBearing: vi.fn(() => 0),
		getPitch: vi.fn(() => 0),
		jumpTo: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		once: vi.fn(),
		loaded: vi.fn(() => true),
		_hash: null,
		...overrides,
	} as unknown as MLGLMap;
}

describe('HashManager', () => {
	let replaceStateSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		window.location.hash = '';
		replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		window.location.hash = '';
	});

	describe('initialize', () => {
		it('returns "colorful" when hash is empty', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());

			expect(hm.initialize()).toBe('colorful');
		});

		it('parses map and style from hash', () => {
			window.location.hash = '#map=10/51.5/-0.12&style=eclipse';
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());

			expect(hm.initialize()).toBe('eclipse');
			expect(map.jumpTo).toHaveBeenCalledWith({
				center: [-0.12, 51.5],
				zoom: 10,
				bearing: 0,
				pitch: 0,
			});
		});

		it('parses bearing and pitch from hash', () => {
			window.location.hash = '#map=10/51.5/-0.12/30/60';
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());

			hm.initialize();
			expect(map.jumpTo).toHaveBeenCalledWith({
				center: [-0.12, 51.5],
				zoom: 10,
				bearing: 30,
				pitch: 60,
			});
		});

		it('falls back to colorful for invalid style key', () => {
			window.location.hash = '#style=nonexistent';
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());

			expect(hm.initialize()).toBe('colorful');
		});

		it('does not call jumpTo when map values are invalid', () => {
			window.location.hash = '#map=abc/def/ghi';
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());

			hm.initialize();
			expect(map.jumpTo).not.toHaveBeenCalled();
		});

		it('registers moveend and hashchange listeners', () => {
			const map = createMockMap();
			const addEventSpy = vi.spyOn(window, 'addEventListener');
			const hm = new HashManager(map, vi.fn());

			hm.initialize();

			expect(map.on).toHaveBeenCalledWith('moveend', expect.any(Function));
			expect(addEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
		});

		it('calls updateHash immediately when map is loaded', () => {
			const map = createMockMap({ loaded: vi.fn(() => true) });
			const hm = new HashManager(map, vi.fn());

			hm.initialize();
			vi.advanceTimersByTime(300);

			expect(replaceStateSpy).toHaveBeenCalledTimes(1);
			expect(map.once).not.toHaveBeenCalled();
		});

		it('defers updateHash via once("load") when map is not loaded', () => {
			const map = createMockMap({ loaded: vi.fn(() => false) });
			const hm = new HashManager(map, vi.fn());

			hm.initialize();
			vi.advanceTimersByTime(300);

			expect(replaceStateSpy).not.toHaveBeenCalled();
			expect(map.once).toHaveBeenCalledWith('load', expect.any(Function));
		});

		it('disables MapLibre hash when _hash is present', () => {
			const removeMock = vi.fn();
			const map = createMockMap({ _hash: { remove: removeMock } });
			const hm = new HashManager(map, vi.fn());

			hm.initialize();

			expect(removeMock).toHaveBeenCalledTimes(1);
		});

		it('does not throw when _hash is absent', () => {
			const map = createMockMap({ _hash: null });
			const hm = new HashManager(map, vi.fn());

			expect(() => hm.initialize()).not.toThrow();
		});
	});

	describe('setStyleKey', () => {
		it('updates hash with new style key', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();
			vi.advanceTimersByTime(300);
			replaceStateSpy.mockClear();

			hm.setStyleKey('eclipse');
			vi.advanceTimersByTime(300);

			expect(replaceStateSpy).toHaveBeenCalledTimes(1);
			const url = replaceStateSpy.mock.calls[0][2] as string;
			expect(url).toContain('style=eclipse');
		});

		it('omits style param when set to colorful', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();
			hm.setStyleKey('eclipse');
			vi.advanceTimersByTime(300);
			replaceStateSpy.mockClear();

			hm.setStyleKey('colorful');
			vi.advanceTimersByTime(300);

			const url = replaceStateSpy.mock.calls[0][2] as string;
			expect(url).not.toContain('style=');
		});
	});

	describe('buildHash', () => {
		it('builds hash with correct map coordinates', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();
			vi.advanceTimersByTime(300);

			const url = replaceStateSpy.mock.calls[0][2] as string;
			expect(url).toMatch(/^#map=10\//);
			expect(url).toContain('/51.5');
			expect(url).toContain('/-0.1');
			// No bearing/pitch segment
			expect(url.split('/').length).toBe(3);
		});

		it('includes bearing and pitch when non-zero', () => {
			const map = createMockMap({
				getBearing: vi.fn(() => 45),
				getPitch: vi.fn(() => 30),
			});
			const hm = new HashManager(map, vi.fn());
			hm.initialize();
			vi.advanceTimersByTime(300);

			const url = replaceStateSpy.mock.calls[0][2] as string;
			expect(url).toMatch(/\/45\/30$/);
			expect(url.split('/').length).toBe(5);
		});

		it('omits bearing and pitch when both are zero', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();
			vi.advanceTimersByTime(300);

			const url = replaceStateSpy.mock.calls[0][2] as string;
			const parts = url.replace('#map=', '').split('/');
			expect(parts.length).toBe(3);
		});
	});

	describe('throttling', () => {
		it('throttles multiple rapid updates into one replaceState call', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();

			hm.setStyleKey('eclipse');
			hm.setStyleKey('shadow');
			hm.setStyleKey('neutrino');
			vi.advanceTimersByTime(300);

			// Only the last scheduled timer fires
			expect(replaceStateSpy).toHaveBeenCalledTimes(1);
			const url = replaceStateSpy.mock.calls[0][2] as string;
			expect(url).toContain('style=neutrino');
		});
	});

	describe('hashchange handler', () => {
		it('calls onStyleChange when style changes via hash', () => {
			const onStyleChange = vi.fn();
			const map = createMockMap();
			const hm = new HashManager(map, onStyleChange);
			hm.initialize();
			vi.advanceTimersByTime(300);

			// Simulate hashchange
			window.location.hash = '#map=10/51.5/-0.12&style=shadow';
			window.dispatchEvent(new HashChangeEvent('hashchange'));

			expect(onStyleChange).toHaveBeenCalledWith('shadow');
			expect(map.jumpTo).toHaveBeenCalled();
		});

		it('does not call onStyleChange when style is unchanged', () => {
			const onStyleChange = vi.fn();
			const map = createMockMap();
			const hm = new HashManager(map, onStyleChange);
			hm.initialize();
			vi.advanceTimersByTime(300);

			// Set hash with same default style
			window.location.hash = '#map=12/48.0/11.0';
			window.dispatchEvent(new HashChangeEvent('hashchange'));

			expect(onStyleChange).not.toHaveBeenCalled();
		});
	});

	describe('moveend handler', () => {
		it('triggers hash update on map moveend', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();
			vi.advanceTimersByTime(300);
			replaceStateSpy.mockClear();

			// Get the moveend handler and invoke it
			const moveendCall = (map.on as any).mock.calls.find((c: any[]) => c[0] === 'moveend');
			expect(moveendCall).toBeDefined();
			moveendCall[1]();

			vi.advanceTimersByTime(300);
			expect(replaceStateSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('destroy', () => {
		it('removes all listeners and clears pending timer', () => {
			const map = createMockMap();
			const removeEventSpy = vi.spyOn(window, 'removeEventListener');
			const hm = new HashManager(map, vi.fn());
			hm.initialize();

			hm.destroy();

			expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
			expect(removeEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
		});

		it('clears pending throttle timer', () => {
			const map = createMockMap();
			const hm = new HashManager(map, vi.fn());
			hm.initialize();

			// Trigger a pending update
			hm.setStyleKey('eclipse');
			// Destroy before timer fires
			hm.destroy();
			vi.advanceTimersByTime(300);

			// Only the initial hash update from initialize should have fired
			// The setStyleKey one should have been cleared
			expect(replaceStateSpy).not.toHaveBeenCalled();
		});
	});
});
