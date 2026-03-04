#!/usr/bin/env node

import path from 'path'
import { fileURLToPath } from 'url'
import { runServer, runUI, showHelp } from './commands.js'
import { getVersion } from './utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const command = args[0]
const version = getVersion(projectRoot)

switch (command) {
    case 'srv':
        console.log(`Starting server... (v${version})`)
        runServer(projectRoot)
        break

    case 'ui':
        console.log(`Starting UI and server... (v${version})`)
        runUI(projectRoot)
        break

    default:
        showHelp()
        process.exit(0)
}
