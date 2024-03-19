## Monorepo pnpm 模式管理多个 web 项目（Vue3）

### git flow 工作流程

- 参考链接：[https://danielkummer.github.io/git-flow-cheatsheet/index.zh_CN.html]

- 新建功能

  - 新建feature分支

  ```shell
  git checkout -b feature/MYFEATURE
  git flow feature start MYFEATURE
  ```

  - 完成新功能开发，将feature分支合并到develop分支
  - 现在已写成文件，直接执行命令 yarn feature即可

  ```shell
  git flow feature finish MYFEATURE
  ```

  - 基于最新的develop分支，切出release分支，此版本为预发布版本，分支为版本号

  ```shell
  git checkout -b release/1.0.0
  git flow release start release/1.0.0
  ```

  - 测试无问题， 执行git flow release finish 1.0.0 ，输出提交日志，合并到develop分支和mian/master分支，输入版本信息

  ```shell
  # -m tag提交信息
  # 参数参考：https://github.com/nvie/gitflow/wiki/Command-Line-Arguments#hotfix
  git flow release finish 1.0.0 -m ""
  ```

  - 在develop分支，并推送develop分支到远程

  ```shell
  git push origin develop
  ```

  - 切换到main/master 分支, 推送到远程，推送最新的tag到远程

  ```shell
  git push origin main
  git push origin v1.0.0
  ```

- bug修改
  - 新增一个hotfix分支
  ```
  git checkout -b hotfix/1.0.1
  git flow hotfix start 1.0.1
  ```
  - 修改完成后的操作与release一样

### pnpm workspace

- 创建 pnpm-workspace.yaml 文件

```shell
 touch pnpm-workspace.yaml
```

- pnpm-workspace.yaml

```yml
packages:
  - 'packages/*' # 代表所有项目都放在packages文件夹之下
```

### .npmrc

```
# 注释：三方依赖也有依赖，要是项目中使用了第三方的依赖，
# 要是哪天第三方卸载不在该包了，那就找不到了，称之为“幽灵依赖” ，
# 所以需要“羞耻提升”，暴露到外层中，即在根目录下的node_modules内，而非在.pnpm文件夹中。

 shamefully-hoist = true

# 根目录下的node_modules里，vue安装到了与.pnpm同层级位置当中了，
# 这就是shamefully-hoist = true的效果，把vue从.pnpm内提到node_modules中，
# 并且vue的相关依赖，也拍平到了该层级文件夹中。
```

### 初始化项目架构

- Conventional Changelog 生态探索: https://zhuanlan.zhihu.com/p/392303778

```shell
# 初始化package.json
pnpm init
# 初始化项目
pnpm run init
# git flow init 前需要 执行 git init
# 每修改一次filter-flow-hotfix-finish-tag-message.sh,filter-flow-release-finish-tag-message.sh 需要重新init
```

-package.json

```json
{
	"script": {
		"init": "sh ./scripts/shell/init.sh --all"
	}
}
```

- init.sh

```shell
# 项目初始化

# 初始化项目配置
SCRIPTPATH=$(pwd -P)

# 初始化git设置
git config core.filemode false
git config tag.sort version:refname
git config pull.rebase true

if [ $1 ]; then

    # 安装 editorconfig 扩展
    command -v code && code --install-extension editorconfig.editorconfig || echo "Make sure your IDEs support for \`EditorConfig\`. You can check by https://editorconfig.org/"

    # 设置git filter-flow-hotfix-finish-tag-message hook 软连接
    rm -f ./.git/hooks/filter-flow-hotfix-finish-tag-message
    chmod +x $SCRIPTPATH/scripts/shell/filter-flow-hotfix-finish-tag-message.sh
    ln -s $SCRIPTPATH/scripts/shell/filter-flow-hotfix-finish-tag-message.sh ./.git/hooks/filter-flow-hotfix-finish-tag-message

    # 设置git filter-flow-release-finish-tag-message hook 软连接
    rm -f ./.git/hooks/filter-flow-release-finish-tag-message
    chmod +x $SCRIPTPATH/scripts/shell/filter-flow-release-finish-tag-message.sh
    ln -s $SCRIPTPATH/scripts/shell/filter-flow-release-finish-tag-message.sh ./.git/hooks/filter-flow-release-finish-tag-message

    # 初始化git-flow设置
    git config gitflow.branch.master master
    git config gitflow.branch.develop develop
    git config gitflow.prefix.versiontag v
    git config gitflow.path.hooks $SCRIPTPATH/.git/hooks
    git flow init
fi


if [ $? -eq 0 ]; then
    echo 'init finish'
else
    echo 'init failed'
fi

```

- filter-flow-hotfix-finish-tag-message.sh,filter-flow-release-finish-tag-message.sh

  - git flow 工作流钩子，用于release，hotfix 打版，自定义两个命令增加中途写入CHANGELOG的功能
  - 执行git flow release finish 和 git flow hotfix finish 工作流时，会执行hooks中的filter-flow-hotfix-finish-tag-message.sh,filter-flow-release-finish-tag-message.sh
  - 具体参考：https://github.com/jaspernbrouwer/git-flow-hooks/blob/master/filter-flow-hotfix-finish-tag-message

- filter-flow-hotfix-finish-tag-message.sh, filter-flow-release-finish-tag-message.sh

```shell
#!/usr/bin/env bash

# Runs during git flow release finish and a tag message is given
#
# Positional arguments:
# $1 Message
# $2 Full version
#
# Return MESSAGE
#
# The following variables are available as they are exported by git-flow:
#
# MASTER_BRANCH - The branch defined as Master
# DEVELOP_BRANCH - The branch defined as Develop

MESSAGE=$1
VERSION=$2
# 同步远程tag，防止本地打版写入多个版本changelog-needed
git fetch --tags

BEHIND_COMMIT=$(git rev-list --count ..origin/develop)
ROOT_DIR=$PWD
# 根据tag来截取需要写入日志的package
PACKAGE=${VERSION#*-}
# 获取需要写入日志的package最近的一个tag
PREVIOUSTAG=$(git tag -l | grep $PACKAGE | tail -n 1)
# 获取semver格式的版本号
PACKAGE_VERSION=${VERSION%%-*}

# 获取两个tag之间的changelog信息
CHANGELOG_MESSAGE=`pnpm cross-env PACKAGE=$PACKAGE PREVIOUS_TAG=$PREVIOUSTAG CURRENT_TAG=$VERSION  conventional-changelog -p custom-config -i -n ./scripts/changelog/changelog-option.cjs | tail -n +4 | sed '$d' | sed 's/(changelog-needed)/ /g'`

# 判断是否需要rebase，落后于target branch合并会失败
[ $BEHIND_COMMIT -ne 0 ] && { echo 'Please rebase develop before finishing this branch'; exit 1; }

isMono=$(echo $VERSION | grep "mono")

# 判断是否为mono的更新，是的话changelog会更新到changelogs目录的mono.md内
if [[ "$isMono" != "" ]]; then
    # 更新版本号
    pnpm version --new-version ${PACKAGE_VERSION/v/} --no-git-tag-version > /dev/null
    TEMP_CHANGELOG_MESSAGE=$(echo "### $PACKAGE_VERSION";git log -1 --pretty="#### %ci";printf "\n";echo "${CHANGELOG_MESSAGE}";printf "\n---\n\n";cat ./changelogs/mono.md)
    echo "$TEMP_CHANGELOG_MESSAGE" > ./changelogs/mono.md
# 否则更新到changelogs目录对应package的package.md内
else
    TEMP_CHANGELOG_MESSAGE=$(echo "### $PACKAGE_VERSION";git log -1 --pretty="#### %ci";printf "\n";echo "${CHANGELOG_MESSAGE}";printf "\n---\n\n";cat ./changelogs/$PACKAGE.md)
    echo "$TEMP_CHANGELOG_MESSAGE" > ./changelogs/$PACKAGE.md
fi
git add . > /dev/null
git commit --amend --no-edit --no-verify > /dev/null

echo $MESSAGE

exit 0
```

- 配置commit规范以及自动生成CHNAGELOG并自定义需要的依赖包

```shell
# conventional-changelog-cli 要配合conventional-changelog-custom-config使用，指定版本为@^2
# conventional-changelog-custom-config参考：https://itxiaohao.github.io/passages/git-commit/#%E6%B7%B1%E5%85%A5-conventional-changelog-%E6%BA%90%E7%A0%81
# lerna 要配合 cz-lerna-changelog 使用，指定版本为@^3.22.1
#  cz-lerna-changelog参考：https://www.npmjs.com/package/cz-lerna-changelog

# -w 有工作区的时候使用
pnpm add @commitlint/cli @commitlint/config-conventional commitizen conventional-changelog-cli@^2.2.2 conventional-changelog-custom-config cz-lerna-changelog lerna@^3.22.1 -D -w

pnpm add cross-env -w
```

- 添加comitizen相应配置，创建commitlint.config.js

```shell
touch commitlint.config.js
```

```js
const fs = require('fs')
const path = require('path')

module.exports = {
	extends: ['monorepo'],
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
```

- 自定定义CHANGELOG配置 changelog-option.cjs

```js
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
```

```json
{
	"repository": {
		"type": "git",
		"url": "https://github.com/example.git"
	},
	"changelog": {
		"bugsUrl": "https://github.com/",
		"authorName": true,
		"authorEmail": false
	}
}
```

- 配置 cz-lerna-changlog,支持选择packages

```js
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
			let customQuestion = [
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
	makePrompter: makePrompter,
}
```

```json
{
	"config": {
		"commitizen": {
			"path": "./scripts/changelog/cz-lerna-changelog.cjs"
		}
	},
	"workspaces": ["packages/*"]
}
```

### 引入Husky规范git提交

- 安装 husky

```shell
pnpm add husky -D -w
```

- 在 package.json 中 scripts 中设置 prepare 钩子:husky install,在使用pnpm install的时候就会自动执行husky,以便于别人拉取完我们代码进行pnpm insall的时候直接进行husky install（版本8操作，版本9直接执行 init）

```shell
pnpm pkg set scripts.prepare="husky install"
```

或者

```json
{
	"scripts": {
		"prepare": "husky install"
	}
}
```

- 执行install， 生成.husky文件夹

```shell
# 版本 8
npx husky install

#版本9
npx husky init
```

- 添加一个 commit 钩子文件

```shell
# 版本8
npx husky add .husky/pre-commit
# 版本8 .husky/commit-msg 中添加npx --no -- commitlint --edit "$1"
npx --no -- commitlint --edit "$1"
# 版本9
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
# .husky/pre-commit中写入以下命令，配合eslint使用
pnpm run lint-staged
```

### 配置eslint和prettier

#### eslint 配置

- 安装依赖包

```shell
# eslint eslint依赖包
# eslint-config-standard JavaScript标准样式的ESLint可配置，基础配置,比较流行的有 airbnb、standard、prettier等
# eslint-plugin-import 支持ES6以上的导入/导出语法，并防止文件路径和导入名称拼写错误的问题
# eslint-plugin-node 为node准备的eslint规则配置
# eslint-plugin-promise es语法promise的eslint最佳配置
# eslint-plugin-vue vue项目的的配置，vue项目必须
# @typescript-eslint/parser 解析器
# @typescript-eslint/eslint-plugin  ts语法的配置
# eslint-define-config eslint-define-config可以帮助我们做语法提示
pnpm add eslint eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-vue @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-define-config -D -w
```

- 根目录下创建.eslintrc.cjs、.eslintignore文件

```js
// .eslinttrc.cjs
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
```

```
.eslintignore
node_modules
.vscode
.idea
dist
.eslintrc.cjs
```

#### prettier 配置

- 安装依赖

```shell
# eslint-config-prettier&eslint-plugin-prettier  用于解决eslint和prettier的冲突问题
pnpm add prettier eslint-config-prettier eslint-plugin-prettier -D -w
```

- 根目录创建.prettierrc文件

```json
{
	"printWidth": 150,
	"tabWidth": 2,
	"useTabs": true,
	"semi": false,
	"singleQuote": true,
	"quoteProps": "as-needed",
	"jsxSingleQuote": false,
	"trailingComma": "es5",
	"bracketSpacing": true,
	"jsxBracketSameLine": false,
	"arrowParens": "always",
	"rangeStart": 0,
	"requirePragma": false,
	"insertPragma": false,
	"proseWrap": "preserve",
	"htmlWhitespaceSensitivity": "css",
	"vueIndentScriptAndStyle": false,
	"endOfLine": "auto"
}
```

- 根目录创建.prettierignore文件用于忽略prewitter格式化

- 安装 VSCode 插件 Prettier - Code formatter
  - 安装该插件以实现在保存的时候自动完成格式化
- 在 .vscode/settings.json 中添加一下规则

```json
{
	// 保存的时候自动格式化
	"editor.formatOnSave": true,
	// 默认格式化工具选择prettier
	"editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### 配置lint-staged

- 提交前在pre-commit中应该做一次lint 校验，在package.json添加

```json
{
	"scripts": {
		"lint:script": "eslint --ext .js,.jsx,.vue,.ts,.tsx --fix --quiet ./"
	}
}
```

- 在pre-commit 中添加命令 npm lint:script

- 根据上面的配置是可以实现我们想要的效果的,但是我们会发现每次提交代码的时候 ESlint 或 Stylelint 都会检查所有文件,而我们需要的是只让它们检测新增的文件,因此我们可以使用lint-staged来解决这个问题

- 安装lint-staged

```shell
pnpm add lint-staged -D -w
```

- 在package.json中添加配置,更改pre-commit的命令 pnpm run lint-staged

```json
{
	"lint-staged": {
		"src/**/*.{js,jsx,ts,tsx,vue}": ["eslint --ext .js,.jsx,.vue,.ts,.tsx --fix --quiet ./"]
	},
	"scripts": {
		"lint-staged": "lint-staged"
	}
}
```

### 创建项目

#### .npmrc

```
# 注释：三方依赖也有依赖，要是项目中使用了第三方的依赖，
# 要是哪天第三方卸载不在该包了，那就找不到了，称之为“幽灵依赖” ，
# 所以需要“羞耻提升”，暴露到外层中，即在根目录下的node_modules内，而非在.pnpm文件夹中。

 shamefully-hoist = true

# 根目录下的node_modules里，vue安装到了与.pnpm同层级位置当中了，
# 这就是shamefully-hoist = true的效果，把vue从.pnpm内提到node_modules中，
# 并且vue的相关依赖，也拍平到了该层级文件夹中。
```

#### 创建shared

- shared项目用来服务其他多个web项目，提供公共方法、组件、样式等等

#### 项目全局安装 vue

```shell
 # -w的意思是，workspace-root把依赖包安装到工作目录的根路径下，
 # 则根目录下会生成node_modules文件夹。可以共用，后续每个项目需要用到vue的
 # 都直接从根目录node_modules里取。
 pnpm add vue -w
```

#### 在 packages 项目下创建 vue 项目

- 执行创建命令，根据提示选择

```shell
 pnpm create vite
```

- 删除 vue @vitejs/plugin-vue vite vue-tsc typescript 等依赖，安装到全局中

```shell
 # 子项目下执行
 pnpm remove vue
 pnpm remove @vitejs/plugin-vue vite vue-tsc typescript -D
 # 根目录下执行
 pnpm add @vitejs/plugin-vue vite vue-tsc typescript -D -w
```

- 运行项目

```shell
 # 子项目下运行
 pnpm dev
```

### 配置全局指令

```json
{
	"script": {
		"dev:project": "cd packages/vite-project & pnpm dev"
		// pnpm -C packages/vue-config-1 & pnpm dev 亦可
	}
}
```

### 引用 shared 内容

- 加入 tsconfig.json 来配置路径

```shell
# 根目录下
pnpm add typescript -D -w
pnpm tsc --init
```

- 配置

```json
{
	"compilerOptions": {
		"outDir": "dist", // 输出的目录
		"sourceMap": true, //采用sourcemap
		"target": "es2016", // 目标语法
		"module": "esnext", // 模块格式
		"moduleResolution": "node", // 模块解析
		"strict": false, // 严格模式
		"resolveJsonModule": true, // 解析json模块
		"esModuleInterop": true, // 允许通过es6语法引入commonjs模块
		"jsx": "preserve", // jsx不转义
		"lib": ["esnext", "dom"], // 支持的类库esnext及dom
		"baseUrl": ".", // 当前是以该路径进行查找
		"paths": {
			"@monorepo/shared/components": ["packages/shared/components"],
			"@monorepo/shared/utils": ["packages/shared/utils"],
			"@monorepo/shared/fetch": ["packages/shared/fetch"],
			"@monorepo/shared/styles": ["packages/shared/styles"],
			// 或者用*号处理匹配
			"@monorepo/shared/*": ["packages/shared/*"]
		}
	}
}
```

#### 建立关联

```shell
# 指定版本号
pnpm add @monorepo/shared@workspace --filter @monorepo/vite-project

```

#### 打包插件

- 安装 minimist esbuild

```shell
pnpm add minimist esbuild -D -w
```

- 新增 打包脚本

```js
// minimist 可以解析命令行参数，非常好用，功能简单
import minimist from 'minimist'
// 打包模块
import { build } from 'esbuild'
// node 中的内置模块
import path from 'path'
import fs from 'fs'
const __dirname = path.resolve()
const args = minimist(process.argv.slice(2))
const target = args._[0]
const format = args.f || 'global'
const entry = path.resolve(__dirname, `./packages/plugins/${target}/src/index.ts`)
/*  iife 立即执行函数(function(){})()
    cjs node中的模块 module.exports
    esm 浏览器中的esModule模块 import */
const outputFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm'
const outfile = path.resolve(__dirname, `./packages/plugins/${target}/dist/${target}.${format}.js`)
const pkaPath = path.resolve(__dirname, `./packages/plugins/${target}/package.json`)
const pkaOps = JSON.parse(fs.readFileSync(pkaPath, 'utf8'))
const packageName = pkaOps.buildOptions?.name
build({
	entryPoints: [entry],
	outfile,
	bundle: true,
	sourcemap: true,
	format: outputFormat,
	globalName: packageName,
	platform: format === 'cjs' ? 'node' : 'browser',
}).then(() => {
	console.log('watching~~~')
})
```

- 配置 plugins package.json

```json
{
	"name": "@monorepo/common",
	"version": "1.0.0",
	"description": "",
	"main": "index.js",
	"scripts": {
		"test": "echo \"Error: no test specified\" && exit 1"
	},
	// 打包会用到, 用于定义全局变量
	"buildOptions": {
		"name": "common"
	},
	"keywords": [],
	"author": "",
	"license": "ISC",
	"dependencies": {
		"@monorepo/shared": "workspace:^"
	}
}
```

- 配置并执行打包命令

```json
{
	"scripts": {
		"dev:common": "node scripts/dev-plugins.js common -f global"
	}
}
```

```shell
pnpm dev:common
```

- 测试使用

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Document</title>
	</head>
	<body>
		<script src="./common.global.js"></script>
		<script>
			const { testFunc } = common
			console.log(testFunc())
		</script>
	</body>
</html>
```

### 配置单命令启动多项目

```json
{
	"scripts": {
		"serve": "node ./scripts/build/build.cjs",
		"build": "node ./scripts/build/build.cjs --production"
	}
}
```

- build.cjs

```js
const { spawn } = require('child_process')
const core = require('./core.cjs')
const path = require('path')

class BuildCore extends core {
	constructor(optionArray = []) {
		super()
		this.initOption(optionArray)
		this.start()
	}

	/**
	 * @description 执行构建流程
	 */
	start() {
		this.getPackages().then(async () => {
			this._argument = this._program.parse(process.argv).args
			try {
				const answer = await this.selectPackage()
				answer && this._argument.unshift(answer)
				this.initBuildSpawn()
			} catch (error) {
				console.error('the application must be selected!')
			}
		})
	}

	/**
	 * @description 初始化本地开发或者构建build过程
	 */
	initBuildSpawn() {
		if (!this.validatePackage()) return false
		const isProduction = this._program.parse(process.argv).production
		process.env.PACKAGE = this._argument[0]
		process.env.NODE_ENV = isProduction ? 'production' : 'development'
		const args = isProduction ? ['build'] : ['dev']
		const clinetPath = path.resolve(__dirname, `../../packages/${process.env.PACKAGE}/`)
		try {
			const clientSpawnInstance = spawn('pnpm', ['-C', clinetPath, args], {
				stdio: 'inherit',
				shell: true, // 兼容部分win10系统Error: spawn yarn ENOENT报错
			})
			this.registErrorHandle(clientSpawnInstance)
		} catch (error) {
			console.log(error)
		}
	}
}

new BuildCore([
	{
		short: '-p',
		long: '--production',
		description: 'build package in production mode',
	},
])
```

- core.js

```js
/**
 * 操作终端面板，选择项目启动
 * 思路：读取packages下的文件，获取每个项目的名称，存到项目数组中（this._packageArray） getPackages
 * 根据项目数组构建命令行选择器，选择对应的项目 selectPackage
 */

const process = require('process')
const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const { Select } = require('enquirer')

class Core {
	constructor() {
		// 项目数组
		this._packageArray = []

		// 命令实例
		this._program = new Command()
	}

	/**
	 * @description 选择应用
	 * @return Promise
	 */
	selectPackage() {
		// 深拷贝应用数组
		const packages = JSON.parse(JSON.stringify(this._packageArray))

		// 判断选择的包是否包含在应用数组中，包含则返回Promise成功状态
		if (this._argument && packages.includes(this._argument[0])) return Promise.resolve()

		// 终端命令行选择
		const prompt = new Select({
			name: 'apps',
			message: 'Please select the application to run',
			choices: packages,
		})

		return prompt.run()
	}

	/**
	 * @description 初始化自定义command参数
	 * @param {Object[]} optionArray 自定义参数数组
	 * @param {String} optionArray[].short 自定义参数缩写，如 -p
	 * @param {String} optionArray[].long 自定义参数全称， 如 --production
	 * @param {String} optionArray[].description 自定义参数作用的描述
	 */
	initOption(optionArray) {
		optionArray.forEach((obj) => {
			this._program.option(`${obj.short}, ${obj.long}`, obj.description)
		})
	}

	/**
	 * @description 检测自定义的package参数是否匹配packages目录下的项目
	 */
	validatePackage() {
		let pass = true
		if (!this._packageArray.includes(this._argument[0])) {
			console.error(`package param should be one of [${this._packageArray.join(',')}]`)
			console.log('eg: yarn <script> auth-overseas')
			pass = false
		}
		return pass
	}

	/**
	 * @description 获取packages目录下的项目
	 */
	getPackages() {
		return new Promise((resolve, reject) => {
			// 读取packages下的文件
			fs.readdir(path.join(__dirname, '../../packages'), { withFileTypes: true }, (err, dir) => {
				if (err) reject(err)
				// 将目录的文件名筛选读取，添加到应用数组中
				this._packageArray = dir
					.filter((i) => {
						const typeKey = Object.getOwnPropertySymbols(i)[0]
						return i.name !== 'plugins' && i.name !== 'shared' && i[typeKey] === 2
					})
					.map((j) => j.name)
				resolve()
			})
		})
	}

	/**
	 * @description 注册对子进程错误进行异常处理
	 * @param {Object} spawnInstance 子进程
	 * @param {Function} callback 子进程执行完成后回调
	 * @param {Function} errorCallback 子进程执行报错后回调
	 */
	registErrorHandle(spawnInstance, callback, errorCallback) {
		spawnInstance.on('error', (err) => {
			console.log(err)
			errorCallback && errorCallback(err)
			process.exit(1)
		})

		spawnInstance.on('exit', (code) => {
			callback && callback()
			// code = 0表示流程正常
			if (code !== 0) {
				process.exit(1)
			}
		})
	}
}

module.exports = Core
```
