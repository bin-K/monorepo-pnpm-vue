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
