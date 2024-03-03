import { dts } from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import less from 'rollup-plugin-less';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: './dist/maplibre-gl-versatiles-styler.js',
				format: 'umd',
				name: 'VersatilesStyler',
				sourcemap: true,
			},
			{
				file: './dist/maplibre-gl-versatiles-styler.min.js',
				format: 'umd',
				name: 'VersatilesStyler',
				sourcemap: true,
				plugins: [
					terser()
				]
			},
		],
		treeshake: true,
		plugins: [
			less({ output: false }),
			commonjs(),
			nodeResolve(),
			typescript()
		],
		watch: {}
	},
	{
		input: './dist/dts/index.d.ts',
		output: [{ file: 'dist/maplibre-gl-versatiles-styler.d.ts', format: 'es' }],
		plugins: [dts()],
		watch: false,
	},
]