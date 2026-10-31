import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const base = await generateEslintConfig({
	enableTypescript: true,
})

export default [
	...base,
	{
		// Tests import the compiled module from dist/, which is not part of the published files.
		files: ['test/**/*.mjs'],
		rules: { 'n/no-unpublished-import': 'off' },
	},
]
