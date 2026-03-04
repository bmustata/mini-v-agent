import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

/**
 * Run a command and stream output
 */
export function runCommand(cmd, label, cwd) {
    const child = spawn(cmd, { shell: true, stdio: 'inherit', cwd })

    child.on('error', (error) => {
        console.error(`[${label}] Error:`, error)
        process.exit(1)
    })

    child.on('exit', (code) => {
        if (code !== 0) {
            console.error(`[${label}] exited with code ${code}`)
            process.exit(code)
        }
    })

    return child
}

/**
 * Run multiple commands concurrently
 */
export function runConcurrent(commands) {
    const processes = commands.map(({ cmd, label, cwd }) => {
        console.log(`Starting ${label}...`)
        return runCommand(cmd, label, cwd)
    })

    // Handle cleanup on exit
    process.on('SIGINT', () => {
        console.log('\nShutting down...')
        processes.forEach((p) => p.kill())
        process.exit(0)
    })
}

/**
 * Kill process running on a specific port
 */
export async function killProcessOnPort(port, label) {
    try {
        const { stdout } = await execAsync(`lsof -ti:${port}`)
        const pids = stdout.trim().split('\n').filter(Boolean)

        if (pids.length === 0) {
            console.log(`No process found on port ${port}`)
            return
        }

        for (const pid of pids) {
            try {
                process.kill(pid, 'SIGTERM')
                console.log(`✓ Killed ${label} process (PID: ${pid}) on port ${port}`)
            } catch (err) {
                console.error(`Failed to kill process ${pid}:`, err.message)
            }
        }
    } catch (error) {
        if (error.code === 1) {
            console.log(`No process found on port ${port}`)
        } else {
            console.error(`Error checking port ${port}:`, error.message)
        }
    }
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(port = 3201, timeout = 30000) {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
        const checkServer = async () => {
            try {
                const response = await axios.get(`http://localhost:${port}/api/health`, {
                    timeout: 5000
                })
                if (response.status === 200) {
                    console.log('✓ Server is ready')
                    resolve()
                } else {
                    retry()
                }
            } catch (error) {
                retry()
            }
        }

        const retry = () => {
            if (Date.now() - startTime > timeout) {
                reject(new Error('Server failed to start within timeout'))
            } else {
                setTimeout(checkServer, 500)
            }
        }

        checkServer()
    })
}

/**
 * Get version from package.json
 */
export function getVersion(projectRoot) {
    try {
        const packagePath = path.resolve(projectRoot, 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
        return packageJson.version || '0.0.0'
    } catch (error) {
        return '0.0.0'
    }
}
