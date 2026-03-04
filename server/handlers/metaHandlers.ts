import type { Request, Response } from 'express'
import { ENDPOINTS, type EndpointParam, type EndpointMeta } from '../utils/constMeta.ts'

/**
 * GET /api/meta
 * Returns all API endpoints as a JSON array.
 */
export const getApiMeta = (_req: Request, res: Response): void => {
    res.json(ENDPOINTS)
}

/**
 * GET /api/meta-llms
 * Returns all API endpoints as Markdown with parameter descriptions.
 */
export const getApiMetaLlms = (_req: Request, res: Response): void => {
    const lines: string[] = ['# MiniVAgent API Reference', '']

    const groups: Record<string, EndpointMeta[]> = {
        Health: [],
        Models: [],
        Meta: [],
        Generation: [],
        Render: [],
        Graphs: [],
        Resources: []
    }

    for (const ep of ENDPOINTS) {
        if (ep.path === '/api/health') groups.Health.push(ep)
        else if (ep.path.startsWith('/api/models')) groups.Models.push(ep)
        else if (ep.path.startsWith('/api/meta')) groups.Meta.push(ep)
        else if (ep.path.startsWith('/api/render')) groups.Render.push(ep)
        else if (ep.path.startsWith('/api/graphs')) groups.Graphs.push(ep)
        else if (ep.path.startsWith('/api/resources')) groups.Resources.push(ep)
        else groups.Generation.push(ep)
    }

    const renderParam = (p: EndpointParam): string => `  - \`${p.name}\` (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}`

    for (const [group, eps] of Object.entries(groups)) {
        if (eps.length === 0) continue
        lines.push(`## ${group}`, '')
        for (const ep of eps) {
            lines.push(`### \`${ep.method} ${ep.path}\``, '', ep.description, '')
            if (ep.params?.length) {
                lines.push('**Path parameters:**', '', ...ep.params.map(renderParam), '')
            }
            if (ep.body?.length) {
                lines.push('**Request body (JSON):**', '', ...ep.body.map(renderParam), '')
            }
            if (ep.returns) {
                lines.push('**Returns:**', '', `  ${ep.returns}`, '')
            }
            if (ep.notes) {
                lines.push(`> ${ep.notes}`, '')
            }
        }
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.send(lines.join('\n'))
}
