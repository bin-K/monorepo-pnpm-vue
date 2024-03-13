const czLernaChangelog = require('cz-lerna-changelog')

function makePrompter() {
	return function (cz, commit) {
		cz.prompt([
			{
				type: 'confirm',
				name: 'addChangeLog',
				message: 'Auto add `(changelog-needed)` to subject line?\n',
			},
		]).then((answer) => {
			const customQuestion = [
				{
					type: 'input',
					name: 'subject',
					message: 'Write a short, imperative tense description of the change:\n',
					filter: function (value) {
						const mark = (answer.addChangeLog && '(changelog-needed)') || ''
						return value.charAt(0).toLowerCase() + value.slice(1) + mark
					},
					validate: function (value) {
						return !!value
					},
				},
			]
			return czLernaChangelog.makePrompter(() => customQuestion)(cz, commit)
		})
	}
}

module.exports = {
	prompter: makePrompter(),
	makePrompter,
}
