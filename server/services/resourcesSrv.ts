import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { ensureDir } from '../utils/fileUtils.ts'
import type { ResourceItem } from '../utils/types.ts'

// Accepted sharp format strings
const ACCEPTED_FORMATS = ['png', 'jpeg', 'webp'] as const
type AcceptedFormat = (typeof ACCEPTED_FORMATS)[number]

// Map sharp format → MIME type
const FORMAT_TO_MIME: Record<AcceptedFormat, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp'
}

// Map file extension → MIME type (used for listing without re-running sharp)
const EXT_TO_MIME: Record<string, string> = {
    '.png': 'image/png',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function buildResourceItem(id: string, ext: string, filePath: string): ResourceItem {
    const stat = fs.statSync(filePath)
    return {
        id,
        mimeType: EXT_TO_MIME[ext] ?? 'application/octet-stream',
        size: stat.size,
        sizeStr: formatSize(stat.size),
        createdAt: stat.birthtime.toISOString()
    }
}

/**
 * List all resources in the directory.
 * Derives metadata from filename + fs.statSync — no sharp call per file.
 */
export function listResources(dir: string): ResourceItem[] {
    ensureDir(dir)
    const files = fs.readdirSync(dir)
    const result: ResourceItem[] = []

    for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (!EXT_TO_MIME[ext]) continue
        const id = path.basename(file, ext)
        const filePath = path.join(dir, file)
        result.push(buildResourceItem(id, ext, filePath))
    }

    return result
}

/**
 * Save a new resource.
 * Detects format from magic bytes via sharp — ignores uploaded filename/mimetype.
 * Throws with status 400 if format is not accepted.
 * @returns ResourceItem with id (UUID), mimeType, size (bytes), sizeStr, and createdAt (ISO timestamp)
 */
export async function saveResource(dir: string, buffer: Buffer): Promise<ResourceItem> {
    ensureDir(dir)

    const metadata = await sharp(buffer).metadata()
    const format = metadata.format as string

    if (!ACCEPTED_FORMATS.includes(format as AcceptedFormat)) {
        const err = new Error(`Unsupported image format: ${format ?? 'unknown'}. Accepted: png, jpeg, webp`)
        ;(err as any).status = 400
        throw err
    }

    const ext = `.${format}` // .png | .jpeg | .webp
    const id = uuidv4()
    const filename = `${id}${ext}`
    const filePath = path.join(dir, filename)

    fs.writeFileSync(filePath, buffer)

    return buildResourceItem(id, ext, filePath)
}

/**
 * Read a resource's binary content.
 */
export function readResource(dir: string, resourceId: string): { buffer: Buffer; mimeType: string } {
    ensureDir(dir)
    const file = findResourceFile(dir, resourceId)

    if (!file) {
        const err = new Error(`Resource not found: ${resourceId}`)
        ;(err as any).status = 404
        throw err
    }

    const ext = path.extname(file).toLowerCase()
    const buffer = fs.readFileSync(path.join(dir, file))
    return { buffer, mimeType: EXT_TO_MIME[ext] ?? 'application/octet-stream' }
}

/**
 * Get metadata for a single resource without reading the full buffer.
 */
export function getResourceInfo(dir: string, resourceId: string): ResourceItem {
    ensureDir(dir)
    const file = findResourceFile(dir, resourceId)

    if (!file) {
        const err = new Error(`Resource not found: ${resourceId}`)
        ;(err as any).status = 404
        throw err
    }

    const ext = path.extname(file).toLowerCase()
    const filePath = path.join(dir, file)
    return buildResourceItem(resourceId, ext, filePath)
}

/**
 * Delete a resource file.
 */
export function deleteResource(dir: string, resourceId: string): void {
    ensureDir(dir)
    const file = findResourceFile(dir, resourceId)

    if (!file) {
        const err = new Error(`Resource not found: ${resourceId}`)
        ;(err as any).status = 404
        throw err
    }

    fs.unlinkSync(path.join(dir, file))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findResourceFile(dir: string, resourceId: string): string | undefined {
    const files = fs.readdirSync(dir)
    return files.find((f) => {
        const ext = path.extname(f).toLowerCase()
        return path.basename(f, ext) === resourceId && EXT_TO_MIME[ext] !== undefined
    })
}
