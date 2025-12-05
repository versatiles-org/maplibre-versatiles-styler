import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import scss from 'rollup-plugin-scss';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: 'src/index.ts',
		output: {
			file: './dist/maplibre-gl-versatiles-styler.js',
			format: 'umd',
			name: 'VersaTilesStyler',
			sourcemap: true
		},
		treeshake: false,
		plugins: [
			scss({ output: false }),
			commonjs({ sourceMap: false }),
			nodeResolve(),
			typescript({ cacheDir: '.rollup.tscache' })
		]
	}
];
