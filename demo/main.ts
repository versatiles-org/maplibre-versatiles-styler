import VersaTilesStylerControl from '../src/index';

declare const maplibregl: any;

window.addEventListener('DOMContentLoaded', () => {
	const map = new maplibregl.Map({
		container: 'map',
		bounds: [-180, -80, 180, 80],
		zoom: 5,
		maxZoom: 20,
		hash: true,
	});

	map.addControl(new maplibregl.NavigationControl(), 'top-right');
	map.addControl(
		new VersaTilesStylerControl({
			origin: 'https://tiles.versatiles.org',
			open: true,
		}),
		'top-left'
	);

	// collapse attribution control
	document
		.getElementsByClassName('maplibregl-ctrl-attrib')[0]
		.classList.remove('maplibregl-compact-show');
});
