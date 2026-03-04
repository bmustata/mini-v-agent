import sharp from 'sharp'
import { logger } from '../utils/logger.ts'
import { imageFormatBytes } from '../utils/imageUtils.ts'
import { formatElapsed } from '../utils/observabilityUtils.ts'

export type ConvertFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif'

const QUALITY_FORMATS = new Set<string>(['jpg', 'jpeg', 'webp', 'avif'])

export const FORMAT_MIME: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif'
}

export interface ConvertImageOptions {
    format: string
    /** 1–100, only applied for jpg/webp/avif (ignored for png) */
    quality?: number
}

export interface ConvertImageResult {
    buffer: Buffer
    mimeType: string
}

/**
 * Validates format string and returns the sharp-compatible format key.
 * Throws an error with a descriptive message on unknown formats.
 */
export function resolveFormat(format: string): { sharpFormat: keyof sharp.FormatEnum; mimeType: string } {
    const key = format.toLowerCase()
    const mimeType = FORMAT_MIME[key]
    if (!mimeType) {
        throw Object.assign(new Error(`Unsupported format: ${format}. Accepted: jpg, png, webp, avif`), { status: 400 })
    }
    const sharpFormat = (key === 'jpg' ? 'jpeg' : key) as keyof sharp.FormatEnum
    return { sharpFormat, mimeType }
}

/**
 * Converts an image buffer to the requested format with optional quality.
 * Quality (1–100) is only applied for lossy formats (jpg/webp/avif).
 */
export async function convertImage(buffer: Buffer, options: ConvertImageOptions): Promise<ConvertImageResult> {
    const { sharpFormat, mimeType } = resolveFormat(options.format)

    const applyQuality = options.quality !== undefined && QUALITY_FORMATS.has(options.format.toLowerCase())
    const quality = applyQuality ? Math.min(100, Math.max(1, options.quality!)) : undefined

    let pipeline = sharp(buffer).toFormat(sharpFormat)

    if (quality !== undefined) {
        // Re-apply with quality — sharp's toFormat overload accepts options
        pipeline = sharp(buffer).toFormat(sharpFormat, { quality })
    }

    const t0 = performance.now()
    try {
        const converted = await pipeline.toBuffer()
        const timeStr = formatElapsed(performance.now() - t0)

        const qualityNote = quality !== undefined ? `, q${quality}` : ''
        logger.info(`convertImage: ${options.format} ${imageFormatBytes(buffer.length)} → ${mimeType}${qualityNote} ${imageFormatBytes(converted.length)} (${timeStr})`)

        return { buffer: converted, mimeType }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`convertImage: failed to convert to ${options.format} — ${errorMessage}`)
        throw Object.assign(new Error(`Image conversion failed: ${errorMessage}`), { status: 500 })
    }
}
