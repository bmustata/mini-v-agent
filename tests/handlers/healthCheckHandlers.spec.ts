import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../server/server'

describe('healthCheckHandlers', () => {
    describe('GET /api/health', () => {
        it('should return status ok', async () => {
            const response = await request(app).get('/api/health').expect(200)

            expect(response.body.status).toBe('ok')
            expect(response.body.timestamp).toBeDefined()
        })

        it('should return valid ISO timestamp', async () => {
            const response = await request(app).get('/api/health').expect(200)

            const timestamp = new Date(response.body.timestamp)
            expect(timestamp.toISOString()).toBe(response.body.timestamp)
        })

        it('should have timestamp as a string', async () => {
            const response = await request(app).get('/api/health').expect(200)

            expect(typeof response.body.timestamp).toBe('string')
        })

        it('should have content-type json', async () => {
            const response = await request(app).get('/api/health').expect(200).expect('Content-Type', /json/)

            expect(response.body.status).toBe('ok')
        })
    })
})
