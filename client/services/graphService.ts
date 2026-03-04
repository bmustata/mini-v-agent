const API_BASE = '/api'

export interface GraphResource {
    id: string
    type: 'local' | 'remote'
    source: string
}

export interface GraphData {
    name?: string
    nodes: any[]
    edges: any[]
}

/**
 * List all available graphs
 */
export const listGraphs = async (): Promise<GraphResource[]> => {
    try {
        const response = await fetch(`${API_BASE}/graphs`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to list graphs')
        }

        return await response.json()
    } catch (error) {
        console.error('List graphs error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to list graphs')
    }
}

/**
 * Get a specific graph by ID
 */
export const getGraph = async (graphId: string): Promise<GraphData> => {
    try {
        const response = await fetch(`${API_BASE}/graphs/${graphId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to get graph')
        }

        return await response.json()
    } catch (error) {
        console.error('Get graph error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to load graph')
    }
}

/**
 * Create a new graph
 */
export const createGraph = async (filename: string, content: GraphData): Promise<GraphResource> => {
    try {
        const response = await fetch(`${API_BASE}/graphs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to create graph')
        }

        return await response.json()
    } catch (error) {
        console.error('Create graph error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to save graph')
    }
}

/**
 * Update an existing graph
 */
export const updateGraph = async (graphId: string, content: GraphData): Promise<GraphResource> => {
    try {
        const response = await fetch(`${API_BASE}/graphs/${graphId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to update graph')
        }

        return await response.json()
    } catch (error) {
        console.error('Update graph error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to update graph')
    }
}

/**
 * Delete a graph
 */
export const deleteGraph = async (graphId: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE}/graphs/${graphId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to delete graph')
        }
    } catch (error) {
        console.error('Delete graph error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to delete graph')
    }
}
