import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	output: {
		name: 'VersatilesStyler',
		dir: 'dist',
		format: 'umd',
		sourcemap: true,
		indent: false,
	},
	treeshake: true,
	plugins: [
		typescript()
	]
};