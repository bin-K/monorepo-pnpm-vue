const fs = require('fs')
const path = require('path')
module.exports = {
	extends: ['monorepo'],
	// 定义规则类型
	rules: {
		'header-max-length': [0, 'always'],
		'scope-enum': [2, 'always', [...fs.readdirSync(path.join(__dirname, 'packages')), 'mono']],
		'type-enum': [2, 'always', ['build', 'ci', 'chore', 'feat', 'fix', 'refactor', 'style', 'test', 'config', 'docs']],
		'close-issue-needed': [2, 'always'],
	},
	plugins: [
		{
			rules: {
				'close-issue-needed': (msg) => {
					const ISSUES_CLOSED = 'ISSUES CLOSED:'
					return [msg.raw.includes(ISSUES_CLOSED), 'Your commit message must contain ISSUES message']
				},
			},
		},
	],
}