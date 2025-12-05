import { dts } from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import scss from 'rollup-plugin-scss';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: './dist/maplibre-gl-versatiles-styler.js',
				format: 'umd',
				name: 'VersaTilesStyler',
				sourcemap: true
			},
			{
				file: './dist/maplibre-gl-versatiles-styler.min.js',
				format: 'umd',
				name: 'VersaTilesStyler',
				sourcemap: true,
				plugins: [terser()]
			}
		],
		treeshake: true,
		plugins: [scss({ output: false }), commonjs(), nodeResolve(), typescript()],
		watch: {}
	},
	{
		input: './dist/dts/index.d.ts',
		output: [{ file: 'dist/maplibre-gl-versatiles-styler.d.ts', format: 'es' }],
		plugins: [dts()],
		watch: false
	}
];
