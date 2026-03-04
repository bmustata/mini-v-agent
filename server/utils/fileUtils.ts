import { createHash } from 'crypto'
import * as fs from 'fs'

/**
 * Generate SHA256 hash ID from a string (first 16 characters)
 */
export function generateId(source: string): string {
    return createHash('sha256').update(source).digest('hex').substring(0, 16)
}

/**
 * Ensure a directory exists, create it if it doesn't
 */
export function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath)
}

/**
 * Read JSON file and parse it
 */
export function readJsonFile<T = any>(filePath: string): T {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
}

/**
 * Write JSON to file with formatting
 */
export function writeJsonFile(filePath: string, data: any): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8')
}

/**
 * Get all JSON files from a directory
 */
export function getJsonFiles(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) {
        return []
    }
    const files = fs.readdirSync(dirPath)
    return files.filter((file) => file.endsWith('.json'))
}

/**
 * Delete a file
 */
export function deleteFile(filePath: string): void {
    fs.unlinkSync(filePath)
}
