import * as path from 'path'
import { getJsonFiles, readJsonFile } from '../utils/fileUtils.ts'
import { logger } from '../utils/logger.ts'
import type { GraphData } from '../utils/types.ts'
import { startTimer } from '../utils/observabilityUtils.ts'
import { deleteResource, listResources } from './resourcesSrv.ts'

export interface CleanupStats {
    graphCount: number
    resourceCount: number
    usedCount: number
    unusedCount: number
    totalSizeStr: string
    usedSizeStr: string
    unusedSizeStr: string
}

export interface CleanupResult {
    deleted: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Collect all resource UUIDs referenced in any graph node's imageResources field.
 */
export function getUsedResourceIds(graphsDir: string): Set<string> {
    const usedIds = new Set<string>()
    const files = getJsonFiles(graphsDir)

    for (const file of files) {
        try {
            const filePath = path.join(graphsDir, file)
            const graph = readJsonFile<GraphData>(filePath)
            for (const node of graph.nodes ?? []) {
                for (const id of node.data?.imageResources ?? []) {
                    usedIds.add(id)
                }
            }
        } catch {
            // skip malformed graph files
        }
    }

    return usedIds
}

/**
 * Compute cleanup stats: graph count, resource totals / used / unused with human-readable sizes.
 */
export function getCleanupStats(graphsDir: string, resourcesDir: string): CleanupStats {
    const graphCount = getJsonFiles(graphsDir).length
    const usedIds = getUsedResourceIds(graphsDir)
    const resources = listResources(resourcesDir)

    let totalBytes = 0
    let usedBytes = 0

    for (const r of resources) {
        totalBytes += r.size
        if (usedIds.has(r.id)) usedBytes += r.size
    }

    const unusedBytes = totalBytes - usedBytes
    const usedCount = resources.filter((r) => usedIds.has(r.id)).length

    return {
        graphCount,
        resourceCount: resources.length,
        usedCount,
        unusedCount: resources.length - usedCount,
        totalSizeStr: formatSize(totalBytes),
        usedSizeStr: formatSize(usedBytes),
        unusedSizeStr: formatSize(unusedBytes)
    }
}

/**
 * Run resource cleanup:
 * 1. Logs graph count and resource stats (total / used / unused with sizes)
 * 2. Deletes resources older than maxAgeMs (default: 1 day) not referenced by any graph
 *
 * @param graphsDir   - Absolute path to the graphs directory (e.g. `data/graphs`)
 * @param resourcesDir - Absolute path to the resources directory (e.g. `data/resources`)
 * @param maxAgeMs    - Maximum age in milliseconds before an unused resource is deleted (default: 1 day)
 */
export async function runResourceCleanup(graphsDir: string, resourcesDir: string, maxAgeMs: number = ONE_DAY_MS): Promise<CleanupResult> {
    const timer = startTimer()
    const stats = getCleanupStats(graphsDir, resourcesDir)

    logger.info('Resource cleanup scheduler')
    logger.info(`  Graphs: ${stats.graphCount}`)
    logger.info(`  Resources: ${stats.resourceCount} total (${stats.totalSizeStr})` + ` / ${stats.usedCount} used (${stats.usedSizeStr})` + ` / ${stats.unusedCount} unused (${stats.unusedSizeStr})`)

    const usedIds = getUsedResourceIds(graphsDir)
    const resources = listResources(resourcesDir)
    const now = Date.now()
    let deleted = 0

    for (const resource of resources) {
        const ageMs = now - new Date(resource.createdAt).getTime()
        if (ageMs > maxAgeMs && !usedIds.has(resource.id)) {
            try {
                deleteResource(resourcesDir, resource.id)
                const ageDays = Math.floor(ageMs / ONE_DAY_MS)
                logger.info(`  Deleted stale resource: ${resource.id} (age: ${ageDays}d, size: ${resource.sizeStr})`)
                deleted++
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                logger.warn(`  Failed to delete resource ${resource.id}: ${msg}`)
            }
        }
    }

    if (deleted === 0) {
        logger.info(`  No stale resources to delete`)
    } else {
        logger.info(`  Deleted ${deleted} stale resource(s)`)
    }
    logger.info(`  Completed in ${timer.stop()}`)

    return { deleted }
}
