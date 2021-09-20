const { execSync } = require('child_process')
const { writeFileSync, existsSync, copyFileSync, rmSync } = require('fs')

void function main() {
    if (existsSync('./build/')) rmSync('./build/', { recursive: true })
    console.log(execSync('tsc').toString())
    const package = require('./package.json')
    package.main = 'index.js'
    writeFileSync('./build/package.json', JSON.stringify(package, null, 4))
}()
