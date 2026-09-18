import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import dts from 'vite-plugin-dts';

export default defineConfig({
	plugins: [
		svelte(),
		dts({
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.svelte'],
			bundleTypes: true,
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
	// MapLibre GL JS 6 loads its worker as `new URL('./maplibre-gl-worker.mjs', import.meta.url)`,
	// which the dependency pre-bundler does not copy into `.vite/deps`.
	optimizeDeps: {
		exclude: ['maplibre-gl'],
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
