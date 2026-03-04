import type { Request, Response } from 'express'
import * as path from 'path'
import { generateId, ensureDir, fileExists, readJsonFile, writeJsonFile, getJsonFiles, deleteFile } from '../utils/fileUtils.ts'
import { findGraphFile } from '../helpers/index.ts'
import { logger } from '../utils/logger.ts'

const GRAPHS_DIR = path.join(process.cwd(), 'data', 'graphs')

interface GraphResource {
    id: string
    type: 'local' | 'remote'
    source: string
}

/**
 * Ensure graphs directory exists
 */
function ensureGraphsDir(): void {
    ensureDir(GRAPHS_DIR)
}

/**
 * GET /api/graphs
 * Returns list of local graphs from ./graphs/*.json directory
 * No input parameters required
 */
export const listGraphs = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.info('GET /api/graphs')
        ensureGraphsDir()
        const jsonFiles = getJsonFiles(GRAPHS_DIR)

        const graphs: GraphResource[] = jsonFiles.map((file) => ({
            id: generateId(file),
            type: 'local',
            source: file
        }))

        logger.info(`GET /api/graphs - ✓ found: ${graphs.length}`)
        graphs.forEach((graph) => {
            logger.info(`\t${graph.id} - ${graph.type} - ${graph.source}`)
        })
        res.json(graphs)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`GET /api/graphs - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to list graphs' })
    }
}

/**
 * GET /api/graphs/:graphId
 * Returns the graph content
 * @param {string} graphId - Path parameter: The graph ID or filename (without extension)
 */
export const getGraph = async (req: Request, res: Response): Promise<void> => {
    try {
        const graphId = String(req.params.graphId)
        ensureGraphsDir()

        const matchingFile = findGraphFile(graphId, GRAPHS_DIR)

        if (!matchingFile) {
            logger.warn(`GET /api/graphs/${graphId} - ✗ not found`)
            res.status(404).json({ error: 'Graph not found' })
            return
        }

        const filePath = path.join(GRAPHS_DIR, matchingFile)
        const graphData = readJsonFile(filePath)

        logger.info(`GET /api/graphs/${graphId} - ✓ file: ${matchingFile}`)
        res.json(graphData)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`GET /api/graphs/${req.params.graphId} - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to get graph' })
    }
}

/**
 * POST /api/graphs
 * Create a new graph file
 * @param {string} filename - The filename for the new graph (with or without .json extension)
 * @param {object} content - The graph content/data to save
 */
export const createGraph = async (req: Request, res: Response): Promise<void> => {
    try {
        const { filename, content } = req.body
        logger.info(`POST /api/graphs - filename: ${filename}`)

        if (!filename) {
            logger.warn('POST /api/graphs - ✗ missing filename')
            res.status(400).json({ error: 'Filename is required' })
            return
        }

        if (!content) {
            logger.warn('POST /api/graphs - ✗ missing content')
            res.status(400).json({ error: 'Content is required' })
            return
        }

        ensureGraphsDir()

        // Ensure filename ends with .json
        const jsonFilename = filename.endsWith('.json') ? filename : `${filename}.json`
        const filePath = path.join(GRAPHS_DIR, jsonFilename)

        // Check if file already exists
        if (fileExists(filePath)) {
            logger.warn(`POST /api/graphs - ✗ file already exists: ${jsonFilename}`)
            res.status(409).json({ error: 'Graph file already exists' })
            return
        }

        // Write the file
        writeJsonFile(filePath, content)

        const graphResource: GraphResource = {
            id: generateId(jsonFilename),
            type: 'local',
            source: jsonFilename
        }

        logger.info(`POST /api/graphs - ✓ created: ${jsonFilename}`)
        res.status(201).json(graphResource)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/graphs - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to create graph' })
    }
}

/**
 * PUT /api/graphs/:graphId
 * Update a graph file content
 * @param {string} graphId - Path parameter: The graph ID or filename to update
 * @param {object} content - The updated graph content/data
 */
export const updateGraph = async (req: Request, res: Response): Promise<void> => {
    try {
        const graphId = String(req.params.graphId)
        const { content } = req.body
        logger.info(`PUT /api/graphs/${graphId}`)

        if (!content) {
            logger.warn(`PUT /api/graphs/${graphId} - ✗ missing content`)
            res.status(400).json({ error: 'Content is required' })
            return
        }

        ensureGraphsDir()

        const matchingFile = findGraphFile(graphId, GRAPHS_DIR)

        if (!matchingFile) {
            logger.warn(`PUT /api/graphs/${graphId} - ✗ not found`)
            res.status(404).json({ error: 'Graph not found' })
            return
        }

        const filePath = path.join(GRAPHS_DIR, matchingFile)

        // Write the updated content
        writeJsonFile(filePath, content)

        const graphResource: GraphResource = {
            id: generateId(matchingFile),
            type: 'local',
            source: matchingFile
        }

        logger.info(`PUT /api/graphs/${graphId} - ✓ updated: ${matchingFile}`)
        res.json(graphResource)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`PUT /api/graphs/${req.params.graphId} - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to update graph' })
    }
}

/**
 * DELETE /api/graphs/:graphId
 * Delete a graph file
 * @param {string} graphId - Path parameter: The graph ID or filename to delete
 */
export const deleteGraph = async (req: Request, res: Response): Promise<void> => {
    try {
        const graphId = String(req.params.graphId)
        logger.info(`DELETE /api/graphs/${graphId}`)
        ensureGraphsDir()

        const matchingFile = findGraphFile(graphId, GRAPHS_DIR)

        if (!matchingFile) {
            logger.warn(`DELETE /api/graphs/${graphId} - ✗ not found`)
            res.status(404).json({ error: 'Graph not found' })
            return
        }

        const filePath = path.join(GRAPHS_DIR, matchingFile)
        deleteFile(filePath)

        logger.info(`DELETE /api/graphs/${graphId} - ✓ deleted: ${matchingFile}`)
        res.status(204).send()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`DELETE /api/graphs/${req.params.graphId} - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to delete graph' })
    }
}
