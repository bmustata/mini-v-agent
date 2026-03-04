import type { Request, Response, NextFunction } from 'express'
import * as path from 'path'
import multer from 'multer'
import { ensureDir } from '../utils/fileUtils.ts'
import { listResources, saveResource, readResource, getResourceInfo, deleteResource } from '../services/resourcesSrv.ts'
import { convertImage, FORMAT_MIME } from '../services/imageConvertSrv.ts'
import { imageFormatBytes } from '../utils/imageUtils.ts'
import { logger } from '../utils/logger.ts'

export const RESOURCES_DIR = path.join(process.cwd(), 'data', 'resources')

const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Multer — memory storage so the service owns the write and UUID naming
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        if (ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Accepted: image/png, image/jpeg, image/webp`))
        }
    }
})

// Multer error middleware — converts multer errors to 400 responses
function handleMulterError(err: any, _req: Request, res: Response, next: NextFunction): void {
    if (err instanceof multer.MulterError || err?.message?.startsWith('Unsupported file type')) {
        res.status(400).json({ error: err.message })
        return
    }
    next(err)
}

export const uploadMiddleware = [upload.single('file'), handleMulterError]

/**
 * GET /api/resources
 * Returns list of all stored resources
 */
export const listResourcesHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        logger.info('GET /api/resources')
        ensureDir(RESOURCES_DIR)
        const resources = listResources(RESOURCES_DIR)
        logger.info(`GET /api/resources - ✓ found: ${resources.length}`)
        res.json(resources)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`GET /api/resources - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to list resources' })
    }
}

/**
 * POST /api/resources
 * Upload a new image resource (multipart/form-data, field: file)
 * MIME type and extension are determined by sharp magic-byte detection
 */
export const addResourceHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            logger.warn('POST /api/resources - ✗ missing file')
            res.status(400).json({ error: 'File is required' })
            return
        }

        logger.info(`POST /api/resources - originalname: ${req.file.originalname}, declared mimetype: ${req.file.mimetype}, size: ${req.file.size}`)

        const resource = await saveResource(RESOURCES_DIR, req.file.buffer)

        logger.info(`POST /api/resources - ✓ saved: ${resource.id}, mimeType: ${resource.mimeType}, size: ${resource.sizeStr}`)
        res.status(201).json(resource)
    } catch (error) {
        const status = (error as any).status ?? 500
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/resources - ✗ error: ${errorMessage}`)
        res.status(status).json({ error: errorMessage })
    }
}

/**
 * GET /api/resources/:resourceId/info
 * Returns metadata for a resource without reading the full binary
 */
export const getResourceInfoHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const resourceId = String(req.params.resourceId)

        const info = getResourceInfo(RESOURCES_DIR, resourceId)

        logger.info(`GET /api/resources/${resourceId}/info - ✓ mimeType: ${info.mimeType}, size: ${info.sizeStr}`)
        res.json(info)
    } catch (error) {
        const status = (error as any).status ?? 500
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`GET /api/resources/${req.params.resourceId}/info - ✗ error: ${errorMessage}`)
        res.status(status).json({ error: errorMessage })
    }
}

/**
 * GET /api/resources/:resourceId
 * Returns the raw binary of a resource with correct Content-Type
 */
export const getResourceHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const resourceId = String(req.params.resourceId)
        const formatParam = req.query.format ? String(req.query.format).toLowerCase() : null
        const qualityParam = req.query.quality ? parseInt(String(req.query.quality), 10) : undefined

        const { buffer, mimeType } = readResource(RESOURCES_DIR, resourceId)

        if (formatParam !== null) {
            const outMime = FORMAT_MIME[formatParam]
            if (!outMime) {
                res.status(400).json({ error: `Unsupported format: ${formatParam}. Accepted: jpg, png, webp, avif` })
                return
            }
            if (qualityParam !== undefined && (isNaN(qualityParam) || qualityParam < 1 || qualityParam > 100)) {
                res.status(400).json({ error: 'quality must be an integer between 1 and 100' })
                return
            }
            const result = await convertImage(buffer, { format: formatParam, quality: qualityParam })
            const qualityNote = qualityParam !== undefined ? `, q${qualityParam}` : ''
            logger.info(`GET /api/resources/${resourceId} - ✓ ${mimeType} → ${result.mimeType}${qualityNote}, ${imageFormatBytes(result.buffer.length)}`)
            res.set('Content-Type', result.mimeType)
            res.send(result.buffer)
            return
        }

        const b = buffer.length
        logger.info(`GET /api/resources/${resourceId} - ✓ ${mimeType}, ${imageFormatBytes(b)}`)
        res.set('Content-Type', mimeType)
        res.send(buffer)
    } catch (error) {
        const status = (error as any).status ?? 500
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`GET /api/resources/${req.params.resourceId} - ✗ error: ${errorMessage}`)
        res.status(status).json({ error: errorMessage })
    }
}

/**
 * DELETE /api/resources/:resourceId
 * Deletes a resource file
 */
export const removeResourceHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const resourceId = String(req.params.resourceId)
        logger.info(`DELETE /api/resources/${resourceId}`)

        deleteResource(RESOURCES_DIR, resourceId)

        logger.info(`DELETE /api/resources/${resourceId} - ✓ deleted`)
        res.status(204).send()
    } catch (error) {
        const status = (error as any).status ?? 500
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`DELETE /api/resources/${req.params.resourceId} - ✗ error: ${errorMessage}`)
        res.status(status).json({ error: errorMessage })
    }
}
