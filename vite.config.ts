import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import dts from 'vite-plugin-dts';

export default defineConfig({
	plugins: [
		svelte(),
		dts({
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.svelte'],
			rollupTypes: true,
		}),
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'VersaTilesStylerControl',
			fileName: 'maplibre-versatiles-styler',
			formats: ['umd', 'es'],
		},
		sourcemap: true,
		cssCodeSplit: false,
	},
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler',
			},
		},
	},
	test: {
		environment: 'jsdom',
		exclude: ['e2e/**', 'node_modules/**'],
		coverage: {
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.(test|d).ts'],
			all: true,
		},
	},
});
