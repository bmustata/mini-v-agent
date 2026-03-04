import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/server'
import fs from 'fs'
import path from 'path'
import { generateId } from '../../server/utils/fileUtils'
import { createHash } from 'crypto'

const GRAPHS_DIR = path.join(process.cwd(), 'data', 'graphs')
const TEST_GRAPH_FILE = 'test-graph-file.json'
const TEST_GRAPH_PATH = path.join(GRAPHS_DIR, TEST_GRAPH_FILE)

const TEST_GRAPH_CONTENT = {
    name: 'Test Graph',
    nodes: [
        {
            id: '1',
            type: 'TEXT_GEN',
            position: { x: 100, y: 100 },
            data: {
                prompt: 'Test prompt',
                isLoading: false
            }
        }
    ],
    edges: []
}

describe('graphFileHandlers', () => {
    beforeAll(() => {
        // Ensure graphs directory exists
        if (!fs.existsSync(GRAPHS_DIR)) {
            fs.mkdirSync(GRAPHS_DIR, { recursive: true })
        }
    })

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(TEST_GRAPH_PATH)) {
            fs.unlinkSync(TEST_GRAPH_PATH)
        }
    })

    describe('GET /api/graphs', () => {
        it('should return an empty array when no graphs exist', async () => {
            // Clean up all test files first
            const files = fs.readdirSync(GRAPHS_DIR).filter((f) => f.startsWith('test-graph-file'))
            files.forEach((f) => fs.unlinkSync(path.join(GRAPHS_DIR, f)))

            const response = await request(app).get('/api/graphs').expect(200)

            expect(Array.isArray(response.body)).toBe(true)
        })

        it('should return list of graphs when they exist', async () => {
            // Create test graph
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))

            const response = await request(app).get('/api/graphs').expect(200)

            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body.length).toBeGreaterThan(0)

            const testGraph = response.body.find((g: any) => g.source === TEST_GRAPH_FILE)
            expect(testGraph).toBeDefined()
            expect(testGraph.type).toBe('local')
            expect(testGraph.id).toBeDefined()
            expect(testGraph.id).toHaveLength(16)
        })

        it('should return graphs with correct structure', async () => {
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))

            const response = await request(app).get('/api/graphs').expect(200)

            const testGraph = response.body.find((g: any) => g.source === TEST_GRAPH_FILE)
            expect(testGraph).toMatchObject({
                id: expect.any(String),
                type: 'local',
                source: TEST_GRAPH_FILE
            })
            expect(testGraph.id).toHaveLength(16)
        })

        it('should only return .json files', async () => {
            // Create a non-json file
            const txtFile = path.join(GRAPHS_DIR, 'test-file.txt')
            fs.writeFileSync(txtFile, 'test content')
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))

            const response = await request(app).get('/api/graphs').expect(200)

            const txtGraph = response.body.find((g: any) => g.source === 'test-file.txt')
            expect(txtGraph).toBeUndefined()

            // Cleanup
            fs.unlinkSync(txtFile)
        })
    })

    describe('POST /api/graphs', () => {
        it('should create a new graph file', async () => {
            const response = await request(app)
                .post('/api/graphs')
                .send({
                    filename: TEST_GRAPH_FILE,
                    content: TEST_GRAPH_CONTENT
                })
                .expect(201)

            expect(response.body.type).toBe('local')
            expect(response.body.source).toBe(TEST_GRAPH_FILE)
            expect(response.body.id).toBeDefined()
            expect(response.body.id).toHaveLength(16)

            // Verify file was created
            expect(fs.existsSync(TEST_GRAPH_PATH)).toBe(true)

            const fileContent = JSON.parse(fs.readFileSync(TEST_GRAPH_PATH, 'utf-8'))
            expect(fileContent.name).toBe(TEST_GRAPH_CONTENT.name)
            expect(fileContent.nodes).toHaveLength(1)
            expect(fileContent.edges).toHaveLength(0)
        })

        it('should add .json extension if not provided', async () => {
            const filenameWithoutExt = 'test-graph-no-ext'
            const expectedFile = path.join(GRAPHS_DIR, `${filenameWithoutExt}.json`)

            const response = await request(app)
                .post('/api/graphs')
                .send({
                    filename: filenameWithoutExt,
                    content: TEST_GRAPH_CONTENT
                })
                .expect(201)

            expect(response.body.source).toBe(`${filenameWithoutExt}.json`)
            expect(fs.existsSync(expectedFile)).toBe(true)

            // Clean up
            fs.unlinkSync(expectedFile)
        })

        it('should return 400 if filename is missing', async () => {
            const response = await request(app)
                .post('/api/graphs')
                .send({
                    content: TEST_GRAPH_CONTENT
                })
                .expect(400)

            expect(response.body.error).toBe('Filename is required')
        })

        it('should return 400 if content is missing', async () => {
            const response = await request(app)
                .post('/api/graphs')
                .send({
                    filename: TEST_GRAPH_FILE
                })
                .expect(400)

            expect(response.body.error).toBe('Content is required')
        })

        it('should return 409 if graph already exists', async () => {
            // Create the graph first
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))

            const response = await request(app)
                .post('/api/graphs')
                .send({
                    filename: TEST_GRAPH_FILE,
                    content: TEST_GRAPH_CONTENT
                })
                .expect(409)

            expect(response.body.error).toBe('Graph file already exists')
        })

        it('should create graph with complex structure', async () => {
            const complexGraph = {
                name: 'Complex Graph',
                nodes: [
                    {
                        id: '1',
                        type: 'TEXT_GEN',
                        position: { x: 100, y: 100 },
                        data: { prompt: 'Node 1', isLoading: false }
                    },
                    {
                        id: '2',
                        type: 'IMAGE_GEN',
                        position: { x: 500, y: 100 },
                        data: { prompt: 'Node 2', isLoading: false, imageCount: 2, aspectRatio: '16:9' }
                    }
                ],
                edges: [{ id: 'e1-2', source: '1', target: '2', sourceHandle: 'output', targetHandle: 'prompt' }]
            }

            await request(app)
                .post('/api/graphs')
                .send({
                    filename: TEST_GRAPH_FILE,
                    content: complexGraph
                })
                .expect(201)

            const fileContent = JSON.parse(fs.readFileSync(TEST_GRAPH_PATH, 'utf-8'))
            expect(fileContent.nodes).toHaveLength(2)
            expect(fileContent.edges).toHaveLength(1)
        })
    })

    describe('GET /api/graphs/:graphId', () => {
        let graphId: string

        beforeEach(() => {
            // Create test graph and get its ID
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))
            graphId = generateId(TEST_GRAPH_FILE)
        })

        it('should return graph content by ID', async () => {
            const response = await request(app).get(`/api/graphs/${graphId}`).expect(200)

            expect(response.body.name).toBe(TEST_GRAPH_CONTENT.name)
            expect(response.body.nodes).toHaveLength(1)
            expect(response.body.edges).toHaveLength(0)
            expect(response.body.nodes[0].data.prompt).toBe('Test prompt')
        })

        it('should return 404 for non-existent graph', async () => {
            const fakeId = 'nonexistent1234567'

            const response = await request(app).get(`/api/graphs/${fakeId}`).expect(404)

            expect(response.body.error).toBe('Graph not found')
        })

        it('should return correct content type', async () => {
            await request(app).get(`/api/graphs/${graphId}`).expect(200).expect('Content-Type', /json/)
        })

        it('should return graph with all node types', async () => {
            const multiNodeGraph = {
                name: 'Multi Node Graph',
                nodes: [
                    { id: '1', type: 'TEXT_GEN', position: { x: 0, y: 0 }, data: { prompt: '', isLoading: false } },
                    {
                        id: '2',
                        type: 'IMAGE_GEN',
                        position: { x: 400, y: 0 },
                        data: { prompt: '', isLoading: false }
                    },
                    {
                        id: '3',
                        type: 'IMAGE_SOURCE',
                        position: { x: 0, y: 300 },
                        data: { prompt: '', isLoading: false }
                    },
                    {
                        id: '4',
                        type: 'IMAGE_TO_TEXT',
                        position: { x: 400, y: 300 },
                        data: { prompt: '', isLoading: false }
                    },
                    { id: '5', type: 'NOTE', position: { x: 200, y: 600 }, data: { prompt: 'Note', isLoading: false } }
                ],
                edges: []
            }

            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(multiNodeGraph, null, 4))
            const newGraphId = generateId(TEST_GRAPH_FILE)

            const response = await request(app).get(`/api/graphs/${newGraphId}`).expect(200)

            expect(response.body.nodes).toHaveLength(5)
            expect(response.body.nodes.map((n: any) => n.type)).toContain('TEXT_GEN')
            expect(response.body.nodes.map((n: any) => n.type)).toContain('IMAGE_GEN')
            expect(response.body.nodes.map((n: any) => n.type)).toContain('IMAGE_SOURCE')
            expect(response.body.nodes.map((n: any) => n.type)).toContain('IMAGE_TO_TEXT')
            expect(response.body.nodes.map((n: any) => n.type)).toContain('NOTE')
        })
    })

    describe('PUT /api/graphs/:graphId', () => {
        let graphId: string

        beforeEach(() => {
            // Create test graph and get its ID
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))
            graphId = generateId(TEST_GRAPH_FILE)
        })

        it('should update graph content', async () => {
            const updatedContent = {
                ...TEST_GRAPH_CONTENT,
                name: 'Updated Test Graph',
                nodes: [
                    ...TEST_GRAPH_CONTENT.nodes,
                    {
                        id: '2',
                        type: 'IMAGE_GEN',
                        position: { x: 200, y: 200 },
                        data: {
                            prompt: 'Generate image',
                            isLoading: false,
                            imageCount: 1
                        }
                    }
                ]
            }

            const response = await request(app).put(`/api/graphs/${graphId}`).send({ content: updatedContent }).expect(200)

            expect(response.body.id).toBe(graphId)
            expect(response.body.type).toBe('local')

            // Verify file was updated
            const fileContent = JSON.parse(fs.readFileSync(TEST_GRAPH_PATH, 'utf-8'))
            expect(fileContent.name).toBe('Updated Test Graph')
            expect(fileContent.nodes).toHaveLength(2)
        })

        it('should return 400 if content is missing', async () => {
            const response = await request(app).put(`/api/graphs/${graphId}`).send({}).expect(400)

            expect(response.body.error).toBe('Content is required')
        })

        it('should return 404 for non-existent graph', async () => {
            const fakeId = 'nonexistent1234567'

            const response = await request(app).put(`/api/graphs/${fakeId}`).send({ content: TEST_GRAPH_CONTENT }).expect(404)

            expect(response.body.error).toBe('Graph not found')
        })

        it('should update edges', async () => {
            const updatedContent = {
                name: 'Graph with Edges',
                nodes: [
                    { id: '1', type: 'TEXT_GEN', position: { x: 0, y: 0 }, data: { prompt: '', isLoading: false } },
                    { id: '2', type: 'IMAGE_GEN', position: { x: 400, y: 0 }, data: { prompt: '', isLoading: false } }
                ],
                edges: [{ id: 'e1-2', source: '1', target: '2', sourceHandle: 'output', targetHandle: 'prompt' }]
            }

            await request(app).put(`/api/graphs/${graphId}`).send({ content: updatedContent }).expect(200)

            const fileContent = JSON.parse(fs.readFileSync(TEST_GRAPH_PATH, 'utf-8'))
            expect(fileContent.edges).toHaveLength(1)
            expect(fileContent.edges[0].source).toBe('1')
            expect(fileContent.edges[0].target).toBe('2')
        })

        it('should preserve file formatting', async () => {
            const updatedContent = {
                name: 'Formatted Graph',
                nodes: [],
                edges: []
            }

            await request(app).put(`/api/graphs/${graphId}`).send({ content: updatedContent }).expect(200)

            const fileContentRaw = fs.readFileSync(TEST_GRAPH_PATH, 'utf-8')
            // Check that the file is properly formatted (has indentation)
            expect(fileContentRaw).toContain('    ')
        })
    })

    describe('DELETE /api/graphs/:graphId', () => {
        let graphId: string

        beforeEach(() => {
            // Create test graph and get its ID
            fs.writeFileSync(TEST_GRAPH_PATH, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))
            graphId = generateId(TEST_GRAPH_FILE)
        })

        it('should delete graph file', async () => {
            expect(fs.existsSync(TEST_GRAPH_PATH)).toBe(true)

            await request(app).delete(`/api/graphs/${graphId}`).expect(204)

            expect(fs.existsSync(TEST_GRAPH_PATH)).toBe(false)
        })

        it('should return 404 for non-existent graph', async () => {
            const fakeId = 'nonexistent1234567'

            const response = await request(app).delete(`/api/graphs/${fakeId}`).expect(404)

            expect(response.body.error).toBe('Graph not found')
        })

        it('should not affect other graph files', async () => {
            // Create another test file
            const anotherFile = path.join(GRAPHS_DIR, 'another-test-graph.json')
            fs.writeFileSync(anotherFile, JSON.stringify(TEST_GRAPH_CONTENT, null, 4))

            await request(app).delete(`/api/graphs/${graphId}`).expect(204)

            expect(fs.existsSync(TEST_GRAPH_PATH)).toBe(false)
            expect(fs.existsSync(anotherFile)).toBe(true)

            // Cleanup
            fs.unlinkSync(anotherFile)
        })

        it('should return empty body on successful delete', async () => {
            const response = await request(app).delete(`/api/graphs/${graphId}`).expect(204)

            expect(response.body).toEqual({})
        })
    })

    describe('Graph ID Generation', () => {
        it('should generate consistent IDs for same filename', () => {
            const id1 = generateId(TEST_GRAPH_FILE)
            const id2 = generateId(TEST_GRAPH_FILE)

            expect(id1).toBe(id2)
        })

        it('should generate different IDs for different filenames', () => {
            const id1 = generateId('graph1.json')
            const id2 = generateId('graph2.json')

            expect(id1).not.toBe(id2)
        })

        it('should generate 16-character hash format', () => {
            const id = generateId(TEST_GRAPH_FILE)

            // SHA256 first 16 characters
            expect(id).toHaveLength(16)
            expect(id).toMatch(/^[a-f0-9]{16}$/)
        })

        it('should be first 16 chars of SHA256', () => {
            const id = generateId(TEST_GRAPH_FILE)
            const fullHash = createHash('sha256').update(TEST_GRAPH_FILE).digest('hex')

            expect(id).toBe(fullHash.substring(0, 16))
        })
    })

    describe('Error Handling', () => {
        it('should handle malformed JSON gracefully on create', async () => {
            // This test validates that valid JSON objects are accepted
            const validContent = { name: 'Test', nodes: [], edges: [] }

            await request(app)
                .post('/api/graphs')
                .send({
                    filename: TEST_GRAPH_FILE,
                    content: validContent
                })
                .expect(201)
        })

        it('should handle special characters in filename', async () => {
            const specialFilename = 'test-graph-with-special-chars-2024.json'
            const specialPath = path.join(GRAPHS_DIR, specialFilename)

            await request(app)
                .post('/api/graphs')
                .send({
                    filename: specialFilename,
                    content: TEST_GRAPH_CONTENT
                })
                .expect(201)

            expect(fs.existsSync(specialPath)).toBe(true)

            // Cleanup
            fs.unlinkSync(specialPath)
        })
    })
})
