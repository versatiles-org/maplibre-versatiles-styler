import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		ignores: [
			'dist/**/*.*',
			'demo/**/*.*',
			'e2e/**/*.*',
			'node_modules/**/*.*',
			'playwright.config.ts',
		],
	},
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.browser,
			parser: ts.parser,
			parserOptions: {
				sourceType: 'module',
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'@typescript-eslint': ts.plugin,
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		files: ['src/**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				parser: ts.parser,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
];
