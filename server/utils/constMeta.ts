export interface EndpointParam {
    name: string
    type: string
    required: boolean
    description: string
}

export interface EndpointMeta {
    method: string
    path: string
    description: string
    params?: EndpointParam[]
    body?: EndpointParam[]
    returns?: string
    notes?: string
}

export const ENDPOINTS: EndpointMeta[] = [
    // Health
    {
        method: 'GET',
        path: '/api/health',
        description: 'Health check — returns server status and uptime',
        returns: '{ status: "ok", uptime: number }'
    },

    // Models
    {
        method: 'GET',
        path: '/api/models',
        description: 'Returns all supported AI models grouped by category (TEXT, IMAGE, VISION, PLANNER)',
        returns: '{ TEXT: Model[], IMAGE: Model[], VISION: Model[], PLANNER: Model[] }'
    },

    // Meta
    {
        method: 'GET',
        path: '/api/meta',
        description: 'Returns all API endpoints as a JSON array',
        returns: 'EndpointMeta[]'
    },
    {
        method: 'GET',
        path: '/api/meta-llms',
        description: 'Returns all API endpoints as Markdown with parameter descriptions',
        returns: 'Markdown text (Content-Type: text/markdown)'
    },

    // Generation
    {
        method: 'POST',
        path: '/api/enhance-prompt',
        description: 'Rewrite a prompt using AI to improve quality and specificity',
        body: [
            { name: 'prompt', type: 'string', required: true, description: 'The original prompt text to enhance' },
            { name: 'type', type: '"TEXT" | "IMAGE"', required: false, description: 'Prompt category — influences enhancement style (default: "TEXT")' },
            { name: 'model', type: 'string', required: false, description: 'Text model to use (default: gemini-2.5-flash)' }
        ],
        returns: '{ enhancedPrompt: string }'
    },
    {
        method: 'POST',
        path: '/api/generate-text',
        description: 'Generate text from a prompt using a text AI model',
        body: [
            { name: 'prompt', type: 'string', required: true, description: 'Input text prompt' },
            { name: 'model', type: 'string', required: false, description: 'Text model to use (default: gemini-2.5-flash)' },
            { name: 'shouldEnhance', type: 'boolean', required: false, description: 'Run prompt enhancement before generation' }
        ],
        returns: '{ text: string }'
    },
    {
        method: 'POST',
        path: '/api/extract-text-from-image',
        description: 'Analyse one or more images using a vision model and return a text description',
        body: [
            { name: 'prompt', type: 'string', required: false, description: 'Instructions for the vision model (default: "Describe this image")' },
            { name: 'images', type: 'string[]', required: true, description: 'Base64 data URIs or URLs of images to analyse' },
            { name: 'model', type: 'string', required: false, description: 'Vision model to use (default: gemini-2.5-flash)' }
        ],
        returns: '{ text: string }'
    },
    {
        method: 'POST',
        path: '/api/generate-images',
        description: 'Generate images from a text prompt, optionally with reference images',
        body: [
            { name: 'prompt', type: 'string', required: true, description: 'Text description of the desired image' },
            { name: 'count', type: 'number', required: false, description: 'Number of images to generate (1–4, default: 1)' },
            { name: 'model', type: 'string', required: false, description: 'Image model to use (default: gemini-2.5-flash-image)' },
            { name: 'preset', type: 'string', required: false, description: 'Resolution preset — model-dependent (e.g. "1K", "2K", "4K")' },
            { name: 'aspectRatio', type: 'string', required: false, description: 'Image aspect ratio (e.g. "1:1", "16:9", "9:16")' },
            { name: 'outputFormat', type: '"PNG" | "JPEG"', required: false, description: 'Output image format (default: PNG)' },
            { name: 'referenceImages', type: 'string[]', required: false, description: 'Base64 data URIs for reference/style images' },
            { name: 'shouldEnhance', type: 'boolean', required: false, description: 'Run prompt enhancement before generation' }
        ],
        returns: '{ images: string[], enhancedPrompt?: string } — images are base64 data URIs'
    },
    {
        method: 'POST',
        path: '/api/plan-graph',
        description: 'Generate a graph node/edge structure from a natural-language workflow description',
        body: [
            { name: 'prompt', type: 'string', required: true, description: 'Natural language description of the desired workflow' },
            { name: 'model', type: 'string', required: false, description: 'Planner model to use (default: gemini-2.5-flash)' }
        ],
        returns: '{ nodes: GraphNode[], edges: GraphEdge[] }'
    },

    // Render
    {
        method: 'POST',
        path: '/api/render/run',
        description: 'Execute a self-contained graph supplied entirely in the request body — no saved graph file required',
        body: [
            { name: 'nodes', type: 'GraphNode[]', required: true, description: 'Array of graph nodes to execute' },
            { name: 'edges', type: 'GraphEdge[]', required: false, description: 'Array of edges defining connections between nodes (default: [])' },
            { name: 'name', type: 'string', required: false, description: 'Graph name used in logs and response (default: "Unnamed Graph")' }
        ],
        returns: '{ status, graphName, nodeCount, edgeCount, executedNodes, elapsed, nodes: NodeResult[], edges }'
    },
    {
        method: 'POST',
        path: '/api/render/:graphId/run',
        description: 'Execute a saved graph by ID and return all node results as JSON',
        params: [{ name: 'graphId', type: 'string', required: true, description: 'ID of a saved graph in data/graphs/' }],
        body: [
            { name: 'nodes', type: 'GraphNode[]', required: false, description: 'Override graph nodes' },
            { name: 'edges', type: 'GraphEdge[]', required: false, description: 'Override graph edges' },
            { name: 'name', type: 'string', required: false, description: 'Override graph name' }
        ],
        returns: '{ status, graphId, graphName, nodeCount, edgeCount, executedNodes, elapsed, nodes: NodeResult[], edges }'
    },
    {
        method: 'POST',
        path: '/api/render/:graphId/run/stream',
        description: 'Execute a saved graph and stream results as Server-Sent Events (job_start, node_start, node_end, job_done, job_error)',
        params: [{ name: 'graphId', type: 'string', required: true, description: 'ID of a saved graph in data/graphs/' }],
        body: [
            { name: 'nodes', type: 'GraphNode[]', required: false, description: 'Override graph nodes' },
            { name: 'edges', type: 'GraphEdge[]', required: false, description: 'Override graph edges' },
            { name: 'name', type: 'string', required: false, description: 'Override graph name' }
        ],
        returns: 'SSE stream — job_done payload mirrors /api/render/:graphId/run response',
        notes: 'SSE events: job_start (jobId, graphId, graphName, nodeCount, edgeCount, executionOrder), node_start (nodeId, type), node_end (node result), job_done (full result), job_error (error)'
    },

    // Graphs
    {
        method: 'GET',
        path: '/api/graphs',
        description: 'List all saved graph files',
        returns: 'GraphResource[] — each item: { id, type, source }'
    },
    {
        method: 'GET',
        path: '/api/graphs/:graphId',
        description: 'Retrieve a single saved graph by ID',
        params: [{ name: 'graphId', type: 'string', required: true, description: 'Graph ID' }],
        returns: 'Full graph JSON object — { id, name, nodes, edges }'
    },
    {
        method: 'POST',
        path: '/api/graphs',
        description: 'Create and save a new graph',
        body: [
            { name: 'nodes', type: 'GraphNode[]', required: true, description: 'Graph nodes' },
            { name: 'edges', type: 'GraphEdge[]', required: true, description: 'Graph edges' },
            { name: 'name', type: 'string', required: false, description: 'Graph name' }
        ],
        returns: 'GraphResource { id, type, source } — HTTP 201'
    },
    {
        method: 'PUT',
        path: '/api/graphs/:graphId',
        description: 'Update an existing saved graph',
        params: [{ name: 'graphId', type: 'string', required: true, description: 'Graph ID' }],
        body: [
            { name: 'nodes', type: 'GraphNode[]', required: false, description: 'Replacement nodes' },
            { name: 'edges', type: 'GraphEdge[]', required: false, description: 'Replacement edges' },
            { name: 'name', type: 'string', required: false, description: 'Replacement name' }
        ],
        returns: 'GraphResource { id, type, source }'
    },
    {
        method: 'DELETE',
        path: '/api/graphs/:graphId',
        description: 'Delete a saved graph',
        params: [{ name: 'graphId', type: 'string', required: true, description: 'Graph ID' }],
        returns: '204 No Content'
    },

    // Resources
    {
        method: 'GET',
        path: '/api/resources',
        description: 'List all stored image resources with metadata',
        returns: 'ResourceItem[] — each item: { id, mimeType, size, sizeStr, createdAt }'
    },
    {
        method: 'POST',
        path: '/api/resources',
        description: 'Upload an image resource (multipart/form-data, field: "file"; accepted: PNG, JPEG, WebP)',
        returns: 'ResourceItem { id, mimeType, size, sizeStr, createdAt } — HTTP 201'
    },
    {
        method: 'GET',
        path: '/api/resources/:resourceId/info',
        description: 'Get metadata for a stored image (id, mimeType, size, sizeStr, createdAt)',
        params: [{ name: 'resourceId', type: 'string', required: true, description: 'Resource UUID' }],
        returns: 'ResourceItem { id, mimeType, size, sizeStr, createdAt }'
    },
    {
        method: 'GET',
        path: '/api/resources/:resourceId',
        description: 'Fetch the raw image binary for a stored resource',
        params: [{ name: 'resourceId', type: 'string', required: true, description: 'Resource UUID' }],
        returns: 'Raw image binary — Content-Type: image/png | image/jpeg | image/webp'
    },
    {
        method: 'DELETE',
        path: '/api/resources/:resourceId',
        description: 'Delete a stored image resource',
        params: [{ name: 'resourceId', type: 'string', required: true, description: 'Resource UUID' }],
        returns: '204 No Content'
    }
]
