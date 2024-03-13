// eslint-define-config可以帮助我们做语法提示
const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
	// ESLint 一旦发现配置文件中有 "root": true，它就会停止在父级目录中寻找。
	root: true,
	// 解析器
	parser: 'vue-eslint-parser',
	parserOptions: {
		// 解析器
		parser: '@typescript-eslint/parser',
		// js的版本
		ecmaVersion: 2020,
		// 模块化方案
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
		},
	},
	// 启用的规则
	extends: ['plugin:vue/vue3-recommended', 'plugin:@typescript-eslint/recommended', 'standard'],
	rules: {
		quotes: ['error', 'single'],
		'@typescript-eslint/ban-ts-ignore': 'off',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-var-requires': 'off',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^h$',
				varsIgnorePattern: '^h$',
			},
		],
		'no-use-before-define': 'off',
		'no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^h$',
				varsIgnorePattern: '^h$',
			},
		],
		'no-tabs': 'off',
		'no-new': 'off',
		indent: 'off',
		'vue/custom-event-name-casing': 'off',
		'vue/html-indent': 'off',
		'vue/max-attributes-per-line': 'off',
		'vue/html-self-closing': 'off',
		'vue/singleline-html-element-content-newline': 'off',
		'vue/multi-word-component-names': 'off',
		'space-before-function-paren': 'off',
		'comma-dangle': 'off',
	},
})
