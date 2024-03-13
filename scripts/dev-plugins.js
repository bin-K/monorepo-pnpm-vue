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
