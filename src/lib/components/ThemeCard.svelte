<script lang="ts">
	import type { Palette } from '@versatiles/style';
	import { themeSwatch, type StyleKey } from '../style/config';

	let { key }: { key: StyleKey } = $props();

	let swatch = $derived(key === 'satellite' ? undefined : themeSwatch(key as Palette));
</script>

<!-- A style as a small map in its own colours; satellite as a patch of imagery. -->
<span
	class="theme-card"
	class:satellite-card={!swatch}
	style:--land={swatch?.land}
	style:--water={swatch?.water}
	style:--park={swatch?.park}
	style:--street={swatch?.street}
	style:--motorway={swatch?.motorway}
></span>
