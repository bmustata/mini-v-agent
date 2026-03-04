/**
 * Image utility functions for processing and analyzing images
 */

/**
 * Calculate file size from base64-encoded image data
 * @param base64 - Base64-encoded image string (with or without data URL prefix)
 * @returns Object containing size in bytes, formatted size string, and image type
 * @example
 * const result = getBase64ImageSize('data:image/png;base64,iVBORw0KG...')
 * // Returns: { size: 12345, sizeStr: '12.1 KB', type: 'PNG' }
 */
export const getBase64ImageSize = (base64: string): { size: number; sizeStr: string; type: string } => {
    // Remove data URL prefix to get pure base64
    const base64Data = base64.split(',')[1] || base64
    // Calculate size: base64 length * 0.75 (base64 encoding overhead)
    const bytes = Math.round(base64Data.length * 0.75)

    // Infer type from data URL
    const match = base64.match(/data:image\/(\w+);base64/)
    const type = match ? match[1].toUpperCase() : 'UNKNOWN TYPE'

    let sizeStr: string
    if (bytes < 1024) sizeStr = `${bytes} B`
    else if (bytes < 1024 * 1024) sizeStr = `${(bytes / 1024).toFixed(1)} KB`
    else sizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`

    return { size: bytes, sizeStr, type }
}

/**
 * Extract image type from URL (either data URL or regular URL with extension)
 * @param url - Image URL (data URL or HTTP/HTTPS URL with extension)
 * @returns Uppercase image type (e.g., 'PNG', 'JPEG', 'GIF') or 'UNKNOWN TYPE'
 * @example
 * getImageTypeFromUrl('data:image/jpeg;base64,...') // Returns: 'JPEG'
 * getImageTypeFromUrl('https://example.com/photo.png') // Returns: 'PNG'
 * getImageTypeFromUrl('https://example.com/image.jpg?v=123') // Returns: 'JPEG'
 */
/**
 * Convert a resource reference to a displayable URL.
 * - A UUID (no protocol) → /api/resources/<uuid>
 * - An http/https/data URL → returned unchanged
 */
export const resourceToUrl = (resource: string): string => {
    if (resource.startsWith('http://') || resource.startsWith('https://') || resource.startsWith('data:')) {
        return resource
    }
    return `/api/resources/${resource}`
}

export const getImageTypeFromUrl = (url: string): string => {
    // Check if it's a data URL first
    const dataUrlMatch = url.match(/data:image\/(\w+);base64/)
    if (dataUrlMatch) {
        return dataUrlMatch[1].toUpperCase()
    }

    // Extract extension from URL
    const urlMatch = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)
    if (urlMatch) {
        const ext = urlMatch[1].toUpperCase()
        return ext === 'JPG' ? 'JPEG' : ext
    }

    return 'UNKNOWN TYPE'
}
