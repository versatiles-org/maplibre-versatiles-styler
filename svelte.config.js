import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	onwarn: (warning, handler) => {
		if (warning.code === 'a11y_consider_explicit_label') return;
		if (warning.code === 'state_referenced_locally') return;
		handler(warning);
	},
};
