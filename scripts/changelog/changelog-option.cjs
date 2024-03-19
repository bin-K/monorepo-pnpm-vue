const path = require('path')
const compareFunc = require('compare-func')

// 自定义配置
let pkgJson = {}
try {
	pkgJson = require(path.join(__dirname, '../../package.json'))
} catch (err) {
	console.error('no root package.json found')
}

const { changelog } = pkgJson
let bugsUrl = changelog ? changelog.bugsUrl || false : false
if (typeof bugsUrl !== 'string') bugsUrl = false
const authorName = changelog ? changelog.authorName || false : false
const authorEmail = changelog ? changelog.authorEmail || false : false

let gitUserInfo = ''
if (authorName && authorEmail) {
	gitUserInfo = 'by: **{{authorName}}** ({{authorEmail}})'
}
if (authorName && authorEmail === false) {
	gitUserInfo = 'by: **{{authorName}}**'
}
if (authorName === false && authorEmail) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
	gitUserInfo = 'by: ({{authorEmail}})'
}

const getWriterOpts = () => {
	return {
		transform: (commit, context) => {
			let discard = true
			const issues = []

			commit.notes.forEach((note) => {
				note.title = 'BREAKING CHANGES'
				discard = false
			})

			if (commit.type === 'feat') {
				commit.type = 'Features'
			} else if (commit.type === 'fix') {
				commit.type = 'Bug Fixes'
			} else if (commit.type === 'perf') {
				commit.type = 'Performance Improvements'
			} else if (commit.type === 'revert') {
				commit.type = 'Reverts'
			} else if (commit.type === 'docs') {
				commit.type = 'Documentation'
			} else if (commit.type === 'style') {
				commit.type = 'Styles'
			} else if (commit.type === 'refactor') {
				commit.type = 'Code Refactoring'
			} else if (commit.type === 'test') {
				commit.type = 'Tests'
			} else if (commit.type === 'build') {
				commit.type = 'Build System'
			} else if (commit.type === 'ci') {
				commit.type = 'Continuous Integration'
			} else if (commit.type === 'chore') {
				commit.type = 'Chores'
			} else if (discard) {
				return
			}

			if (commit.scope === '*') {
				commit.scope = ''
			}

			if (typeof commit.hash === 'string') {
				commit.hash = commit.hash.substring(0, 7)
			}

			if (typeof commit.subject === 'string') {
				let url = context.repository ? `${context.host}/${context.owner}/${context.repository}` : context.repoUrl
				if (url) {
					url = `${url}/issues/`
					// Issue URLs.
					commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
						issues.push(issue)
						return `[#${issue}](${url}${issue})`
					})
				}
				if (context.host) {
					// User URLs.
					commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
						if (username.includes('/')) {
							return `@${username}`
						}

						return `[@${username}](${context.host}/${username})`
					})
				}
			}
			// remove references that already appear in the subject
			commit.references = commit.references.filter((reference) => {
				if (!issues.includes(reference.issue)) {
					return true
				}

				return false
			})

			if (bugsUrl) {
				commit.references = commit.references.map((ref) => {
					return {
						...ref,
						bugsUrl,
					}
				})
			}
			const needChangelog = commit.header.includes('(changelog-needed)') && commit.header.includes(`(${process.env.PACKAGE}):`)
			// 可在此过滤所需要的commit信息
			if (needChangelog) {
				commit.header = commit.header.replace(/\(changelog-needed\)/g, '')
			}
			return needChangelog ? commit : null
		},
		groupBy: 'type',
		commitGroupsSort: 'title',
		commitsSort: ['scope', 'subject'],
		noteGroupsSort: 'title',
		notesSort: compareFunc,
		finalizeContext: (context) => {
			return Object.assign(context, {
				version: process.env.CURRENT_TAG,
				linkCompare: false,
			})
		},
	}
}

module.exports = {
	gitRawCommitsOpts: {
		from: process.env.PREVIOUS_TAG,
		to: process.env.CURRENT_TAG,
	},
	writerOpts: getWriterOpts(),
}
