/** Host HTTP: resolve model input modalities via llm.resolveModelInfo. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import {
  CAPABILITIES_PATH,
  type CapabilitiesResponse,
  type CapabilityEntry,
  type CapabilityQuery,
} from '../shared/capabilities-contract.ts'

/** Minimal llm face used by the capability probe (avoids pulling dsh-llm workspace graph). */
interface LlmCapabilityFace {
  resolveModelInfo(
    provider: string,
    model: string,
  ): Promise<{ readonly inputModalities?: readonly string[] }>
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function routeKey(provider: string, model: string): string {
  return `${provider}/${model}`
}

function parseQueries(request: Request): CapabilityQuery[] {
  const url = new URL(request.url)
  const seen = new Set<string>()
  const unique: CapabilityQuery[] = []
  for (const raw of url.searchParams.getAll('m')) {
    const slash = raw.indexOf('/')
    if (slash <= 0 || slash >= raw.length - 1) continue
    const provider = raw.slice(0, slash)
    const model = raw.slice(slash + 1)
    const key = routeKey(provider, model)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ provider, model })
  }
  return unique
}

/**
 * Register GET /api/chat-enhance.capabilities?m=provider/model for Vision tags + upload gate.
 * (Host connection.fetch only allows GET/HEAD.)
 * @param ctx - Host context with `llm` + `connection`.
 */
export function registerCapabilityRoutes(ctx: Context): void {
  ctx.effect(() => ctx.connection.fetch.register({
    path: CAPABILITIES_PATH,
    methods: ['GET'],
    fetch: async (request) => {
      try {
        const llm = ctx.get('llm') as LlmCapabilityFace
        const unique = parseQueries(request)

        const capabilities: CapabilityEntry[] = await Promise.all(unique.map(async (query) => {
          try {
            const info = await llm.resolveModelInfo(query.provider, query.model)
            const inputModalities: string[] = info.inputModalities === undefined
              ? ['text']
              : [...info.inputModalities]
            return {
              provider: query.provider,
              model: query.model,
              inputModalities,
              supportsImage: inputModalities.includes('image'),
            }
          } catch {
            return {
              provider: query.provider,
              model: query.model,
              inputModalities: ['text'],
              supportsImage: false,
            }
          }
        }))

        const payload: CapabilitiesResponse = { ok: true, capabilities }
        return jsonResponse(payload)
      } catch (error) {
        return jsonResponse({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        }, 500)
      }
    },
  }), 'supanexus-chat-enhance: capabilities')
}
