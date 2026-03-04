import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResourceItem } from '../../server/utils/types'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

vi.mock('../../server/utils/fileUtils', () => ({
    getJsonFiles: vi.fn(),
    readJsonFile: vi.fn()
}))

vi.mock('../../server/services/resourcesSrv', () => ({
    listResources: vi.fn(),
    deleteResource: vi.fn()
}))

vi.mock('../../server/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

vi.mock('../../server/utils/observabilityUtils', () => ({
    startTimer: vi.fn(() => ({ stop: () => '1ms' }))
}))

import { getJsonFiles, readJsonFile } from '../../server/utils/fileUtils'
import { deleteResource, listResources } from '../../server/services/resourcesSrv'
import { getCleanupStats, getUsedResourceIds, runResourceCleanup } from '../../server/services/resourceCleanupSchedulerSrv'

function makeResource(id: string, ageDays: number, size = 1024): ResourceItem {
    const createdAt = new Date(Date.now() - ageDays * ONE_DAY_MS).toISOString()
    return { id, mimeType: 'image/png', size, sizeStr: `${size} B`, createdAt }
}

function makeGraph(resourceIds: string[]) {
    return {
        nodes: [{ id: 'n1', type: 'IMAGE_GEN', position: { x: 0, y: 0 }, data: { prompt: '', isLoading: false, imageResources: resourceIds } }],
        edges: []
    }
}

describe('resourceCleanupSchedulerSrv', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getUsedResourceIds', () => {
        it('returns empty set when no graph files exist', () => {
            vi.mocked(getJsonFiles).mockReturnValue([])

            const ids = getUsedResourceIds('/graphs')

            expect(ids.size).toBe(0)
        })

        it('collects resource IDs from a single graph', () => {
            vi.mocked(getJsonFiles).mockReturnValue(['graph1.json'])
            vi.mocked(readJsonFile).mockReturnValue(makeGraph(['uuid-a', 'uuid-b']))

            const ids = getUsedResourceIds('/graphs')

            expect(ids).toEqual(new Set(['uuid-a', 'uuid-b']))
        })

        it('collects resource IDs across multiple graphs without duplicates', () => {
            vi.mocked(getJsonFiles).mockReturnValue(['g1.json', 'g2.json'])
            vi.mocked(readJsonFile)
                .mockReturnValueOnce(makeGraph(['uuid-a', 'uuid-b']))
                .mockReturnValueOnce(makeGraph(['uuid-b', 'uuid-c']))

            const ids = getUsedResourceIds('/graphs')

            expect(ids).toEqual(new Set(['uuid-a', 'uuid-b', 'uuid-c']))
        })

        it('skips nodes with no imageResources field', () => {
            vi.mocked(getJsonFiles).mockReturnValue(['g.json'])
            vi.mocked(readJsonFile).mockReturnValue({
                nodes: [{ id: 'n1', type: 'TEXT_GEN', position: { x: 0, y: 0 }, data: { prompt: '', isLoading: false } }],
                edges: []
            })

            const ids = getUsedResourceIds('/graphs')

            expect(ids.size).toBe(0)
        })

        it('skips malformed graph files silently', () => {
            vi.mocked(getJsonFiles).mockReturnValue(['bad.json'])
            vi.mocked(readJsonFile).mockImplementation(() => {
                throw new Error('parse error')
            })

            expect(() => getUsedResourceIds('/graphs')).not.toThrow()
            const ids = getUsedResourceIds('/graphs')
            expect(ids.size).toBe(0)
        })
    })

    describe('getCleanupStats', () => {
        it('returns zero counts when there are no graphs or resources', () => {
            vi.mocked(getJsonFiles).mockReturnValue([])
            vi.mocked(listResources).mockReturnValue([])

            const stats = getCleanupStats('/graphs', '/resources')

            expect(stats.graphCount).toBe(0)
            expect(stats.resourceCount).toBe(0)
            expect(stats.usedCount).toBe(0)
            expect(stats.unusedCount).toBe(0)
            expect(stats.totalSizeStr).toBe('0 B')
        })

        it('correctly splits used vs unused resources', () => {
            vi.mocked(getJsonFiles).mockReturnValue(['g.json'])
            vi.mocked(readJsonFile).mockReturnValue(makeGraph(['used-id']))
            vi.mocked(listResources).mockReturnValue([makeResource('used-id', 2, 2048), makeResource('unused-id', 2, 1024)])

            const stats = getCleanupStats('/graphs', '/resources')

            expect(stats.graphCount).toBe(1)
            expect(stats.resourceCount).toBe(2)
            expect(stats.usedCount).toBe(1)
            expect(stats.unusedCount).toBe(1)
            expect(stats.totalSizeStr).toBe('3.0 KB')
            expect(stats.usedSizeStr).toBe('2.0 KB')
            expect(stats.unusedSizeStr).toBe('1.0 KB')
        })

        it('formats sizes in MB for large files', () => {
            vi.mocked(getJsonFiles).mockReturnValue([])
            vi.mocked(listResources).mockReturnValue([makeResource('r1', 0, 2 * 1024 * 1024)])

            const stats = getCleanupStats('/graphs', '/resources')

            expect(stats.totalSizeStr).toBe('2.00 MB')
        })
    })

    describe('runResourceCleanup', () => {
        it('deletes a stale, unused resource and returns deleted count', async () => {
            vi.mocked(getJsonFiles).mockReturnValue([])
            vi.mocked(listResources).mockReturnValue([makeResource('stale-id', 2)])
            vi.mocked(deleteResource).mockImplementation(() => {})

            const result = await runResourceCleanup('/graphs', '/resources')

            expect(deleteResource).toHaveBeenCalledWith('/resources', 'stale-id')
            expect(result.deleted).toBe(1)
        })

        it('does not delete a used resource even if stale', async () => {
            vi.mocked(getJsonFiles).mockReturnValue(['g.json'])
            vi.mocked(readJsonFile).mockReturnValue(makeGraph(['used-id']))
            vi.mocked(listResources).mockReturnValue([makeResource('used-id', 2)])

            const result = await runResourceCleanup('/graphs', '/resources')

            expect(deleteResource).not.toHaveBeenCalled()
            expect(result.deleted).toBe(0)
        })

        it('does not delete a fresh, unused resource (age < maxAgeMs)', async () => {
            vi.mocked(getJsonFiles).mockReturnValue([])
            // Resource created 1 second ago — well within 1 day
            vi.mocked(listResources).mockReturnValue([makeResource('fresh-id', 0)])

            const result = await runResourceCleanup('/graphs', '/resources')

            expect(deleteResource).not.toHaveBeenCalled()
            expect(result.deleted).toBe(0)
        })

        it('handles mixed resources: only deletes stale+unused ones', async () => {
            vi.mocked(getJsonFiles).mockReturnValue(['g.json'])
            vi.mocked(readJsonFile).mockReturnValue(makeGraph(['used-old']))
            vi.mocked(listResources).mockReturnValue([
                makeResource('used-old', 5), // old + used → keep
                makeResource('unused-old', 3), // old + unused → delete
                makeResource('unused-fresh', 0) // fresh + unused → keep
            ])
            vi.mocked(deleteResource).mockImplementation(() => {})

            const result = await runResourceCleanup('/graphs', '/resources')

            expect(deleteResource).toHaveBeenCalledTimes(1)
            expect(deleteResource).toHaveBeenCalledWith('/resources', 'unused-old')
            expect(result.deleted).toBe(1)
        })

        it('returns deleted: 0 when nothing qualifies', async () => {
            vi.mocked(getJsonFiles).mockReturnValue([])
            vi.mocked(listResources).mockReturnValue([])

            const result = await runResourceCleanup('/graphs', '/resources')

            expect(result.deleted).toBe(0)
        })

        it('continues and warns when a deleteResource call fails', async () => {
            const { logger } = await import('../../server/utils/logger')
            vi.mocked(getJsonFiles).mockReturnValue([])
            vi.mocked(listResources).mockReturnValue([makeResource('bad-id', 2), makeResource('good-id', 2)])
            vi.mocked(deleteResource)
                .mockImplementationOnce(() => {
                    throw new Error('disk full')
                })
                .mockImplementationOnce(() => {})

            const result = await runResourceCleanup('/graphs', '/resources')

            expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(expect.stringContaining('bad-id'))
            expect(result.deleted).toBe(1)
        })

        it('respects a custom maxAgeMs parameter', async () => {
            vi.mocked(getJsonFiles).mockReturnValue([])
            // Resource is 30 minutes old
            const thirtyMinutesMs = 30 * 60 * 1000
            vi.mocked(listResources).mockReturnValue([makeResource('semi-fresh-id', 0)])
            // Override createdAt to be exactly 31 minutes ago
            const resources = [makeResource('semi-fresh-id', 0)]
            resources[0].createdAt = new Date(Date.now() - thirtyMinutesMs - 1000).toISOString()
            vi.mocked(listResources).mockReturnValue(resources)
            vi.mocked(deleteResource).mockImplementation(() => {})

            // Pass maxAgeMs = 29 minutes → should delete
            const result = await runResourceCleanup('/graphs', '/resources', 29 * 60 * 1000)

            expect(deleteResource).toHaveBeenCalledWith('/resources', 'semi-fresh-id')
            expect(result.deleted).toBe(1)
        })
    })
})
