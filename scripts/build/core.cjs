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
