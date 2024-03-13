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

  - 测试无问题， 合并前执行yarn release 命令，输出提交日志，合并到develop分支和mian/master分支，输入版本信息
  - 输出提交日志使用的是standard-version，此时已经进行打版，git flow release finish -n中 -n配置跳过打版

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
  "script":{
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

const {
    changelog
} = pkgJson
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

            commit.notes.forEach(note => {
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
                let url = context.repository
                    ? `${context.host}/${context.owner}/${context.repository}`
                    : context.repoUrl
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
                    commit.subject = commit.subject.replace(
                        /\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
                        (_, username) => {
                            if (username.includes('/')) {
                                return `@${username}`
                            }

                            return `[@${username}](${context.host}/${username})`
                        }
                    )
                }
            }
            // remove references that already appear in the subject
            commit.references = commit.references.filter(reference => {
                if (!issues.includes(reference.issue)) {
                    return true
                }

                return false
            })

            if (bugsUrl) {
                commit.references = commit.references.map(ref => {
                    return {
                        ...ref,
                        bugsUrl
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
                linkCompare: false
            })
        }
    }
}

module.exports = {
    gitRawCommitsOpts: {
      from: process.env.PREVIOUS_TAG,
	    to: process.env.CURRENT_TAG
    },
    writerOpts: getWriterOpts()
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
  },
}
   
```

- 配置 cz-lerna-changlog,支持选择packages
```js
const czLernaChangelog = require('cz-lerna-changelog')

function makePrompter() {
    return function(cz, commit) {
        cz.prompt([
            {
                type: 'confirm',
                name: 'addChangeLog',
                message: 'Auto add `(changelog-needed)` to subject line?\n'
            }
        ])
        .then(answer => {
            let customQuestion = [
                {
                    type: 'input',
                    name: 'subject',
                    message: 'Write a short, imperative tense description of the change:\n',
                    filter: function(value) {
                        const mark = answer.addChangeLog && '(changelog-needed)' || ''
                        return value.charAt(0).toLowerCase() + value.slice(1) + mark
                    },
                    validate: function(value) {
                        return !!value
                    }
                }
            ]
            return czLernaChangelog.makePrompter(() => customQuestion)(cz, commit)
        })
    }
}

module.exports = {
    prompter: makePrompter(),
    makePrompter: makePrompter
}

```
```json
{
  "config": {
    "commitizen": {
      "path": "./scripts/changelog/cz-lerna-changelog.cjs"
    }
  },
  "workspaces": [
    "packages/*"
  ]
}
```

