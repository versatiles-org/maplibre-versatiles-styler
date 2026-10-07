// MapLibre GL JS 6 is an ES module without a default export.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import VersaTilesStylerControl from '../src/index';

// Expose the library for E2E tests, which patch `Map.prototype` before the map is created.
(window as any).maplibregl = maplibregl;

window.addEventListener('DOMContentLoaded', () => {
	const map = new maplibregl.Map({
		container: 'map',
		bounds: [-180, -80, 180, 80],
		zoom: 5,
		maxZoom: 20,
	});

	// Expose map for E2E tests
	(window as any)._map = map;

	map.addControl(new maplibregl.NavigationControl(), 'top-right');
	map.addControl(
		new VersaTilesStylerControl({
			origin: 'https://tiles.versatiles.org',
			// The demo offers the tiles of other providers; `?external=0` shows it as a VersaTiles server does.
			addProtocol: maplibregl.addProtocol,
			externalSources: new URLSearchParams(window.location.search).get('external') !== '0',
		}),
		'top-left'
	);

	// collapse attribution control
	document
		.getElementsByClassName('maplibregl-ctrl-attrib')[0]
		.classList.remove('maplibregl-compact-show');
});
