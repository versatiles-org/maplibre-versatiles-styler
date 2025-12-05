import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import scss from 'rollup-plugin-scss';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: 'src/index.ts',
		output: {
			file: './demo/maplibre-versatiles-styler.js',
			format: 'iife',
			name: 'VersaTilesStylerControl',
			sourcemap: true
		},
		treeshake: false,
		plugins: [
			scss({ output: false }),
			commonjs({ sourceMap: false }),
			nodeResolve(),
			typescript({ cacheDir: '.rollup.tscache', declaration: false, declarationDir: null })
		]
	}
];
