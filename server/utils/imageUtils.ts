import type { ImageMetadataResult } from '../utils/types.ts'
import { IMAGE_ASPECT_RATIOS } from './const.ts'
import { getModelConfig } from './modelUtils.ts'

/**
 * Check if a model uses the Imagen API (ai.models.generateImages)
 * @example
 * // { imagegen: true } → true
 * isImagenModel('imagen-4.0-generate-001') // true
 * @example
 * // { imagegen: false } → false
 * isImagenModel('some-model-with-imagegen-false') // false
 */
export const isImagenModel = (model: string): boolean => {
    const config = getModelConfig(model, 'IMAGE')
    return !!(config?.options && 'imagegen' in config.options && config.options.imagegen)
}

/**
 * Helper function to format bytes to human-readable string
 */
export const imageFormatBytes = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes.toFixed(2)} B`
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`
    } else if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    } else {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
}

/**
 * Helper function to calculate image metadata (size and types)
 * @param images - Array of base64-encoded image strings
 * @returns Object containing total size (bytes and human-readable) and individual image details
 * @example
 * const images = ['data:image/png;base64,iVBORw0KGg...', 'data:image/jpeg;base64,/9j/4AAQ...']
 * const metadata = imageGetMetadata(images)
 * // Returns: {
 * //   totalSize: 2560000,
 * //   totalSizeStr: '2.45 MB',
 * //   imageDetails: [
 * //     { size: 1258291, sizeStr: '1.2 MB', type: 'image/png' },
 * //     { size: 1310720, sizeStr: '1.25 MB', type: 'image/jpeg' }
 * //   ]
 * // }
 */
export const imageGetMetadata = (images: string[]): ImageMetadataResult => {
    let totalBytes = 0
    const imageDetails: { size: number; sizeStr: string; type: string }[] = []

    for (const img of images) {
        const match = img.match(/^data:(.*?);base64,(.*)$/)
        if (match) {
            const mimeType = match[1]
            const bytes = Math.round((match[2].length * 3) / 4)

            imageDetails.push({
                size: bytes,
                sizeStr: imageFormatBytes(bytes),
                type: mimeType
            })
            totalBytes += bytes
        }
    }

    return {
        totalSize: totalBytes,
        totalSizeStr: imageFormatBytes(totalBytes),
        imageDetails
    }
}

/**
 * Helper to convert image URL to base64
 */
export async function imageUrlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        return `data:${contentType};base64,${base64}`
    } catch (error) {
        throw new Error(`Failed to fetch image from URL: ${url}`)
    }
}

/**
 * Returns a human-readable label describing the source type of a reference image string.
 * - `resource:<uuid>` → "resource: resource:<uuid>"
 * - `http(s)://...` → "remote url: <url>"
 * - `data:...;base64,...` → "base64 (N chars)"
 */
export const getRefImageSourceDescription = (img: string): string => {
    const truncate = (s: string, max = 60) => (s.length > max ? s.slice(0, max) + '...' : s)
    if (img.startsWith('resource:')) return `resource: ${truncate(img)}`
    if (img.startsWith('http://') || img.startsWith('https://')) return `remote url: ${truncate(img)}`
    return `base64 (${img.length} chars)`
}

/**
 * Validate aspect ratio value
 * @param aspectRatio - The aspect ratio string to validate
 * @returns true if valid, false otherwise
 */
export const isValidAspectRatio = (aspectRatio: string): boolean => {
    return IMAGE_ASPECT_RATIOS.includes(aspectRatio as any)
}

/**
 * Get list of valid aspect ratios
 * @returns Array of valid aspect ratio strings
 */
export const getValidAspectRatios = (): readonly string[] => {
    return IMAGE_ASPECT_RATIOS
}
