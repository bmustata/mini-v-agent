import type { Request, Response } from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger.ts'

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
const version = packageJson.version || '1.0.0'

/**
 * Health check handler
 * GET /api/health
 * No input parameters required
 */
export const healthCheck = (_req: Request, res: Response): void => {
    logger.info('GET /api/health')
    const result = { status: 'ok', version, timestamp: new Date().toISOString() }
    logger.info(`GET /api/health - ✓ status: ${result.status}, version: ${result.version}`)
    res.json(result)
}
