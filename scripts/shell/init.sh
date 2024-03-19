#!/bin/sh

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
