import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import less from 'rollup-plugin-less';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: 'src/index.ts',
		output: {
			file: './dist/maplibre-gl-versatiles-styler.js',
			format: 'umd',
			name: 'VersatilesStyler',
			sourcemap: true,
		},
		treeshake: false,
		plugins: [
			less({ output: false }),
			commonjs({ sourceMap: false }),
			nodeResolve(),
			typescript({ cacheDir: '.rollup.tscache' })
		]
	}
]