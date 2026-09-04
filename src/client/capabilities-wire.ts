/** Browser fetch for Host capability probe. */

import {
  CAPABILITIES_PATH,
  type CapabilitiesResponse,
  type CapabilityEntry,
  type CapabilityQuery,
} from '../shared/capabilities-contract.ts'

/**
 * Resolve image support for a batch of model routes.
 * @param models - provider/model pairs from the catalog.
 */
export async function fetchCapabilities(
  models: readonly CapabilityQuery[],
): Promise<readonly CapabilityEntry[]> {
  if (models.length === 0) return []
  const params = new URLSearchParams()
  for (const item of models) {
    params.append('m', `${item.provider}/${item.model}`)
  }
  const response = await fetch(`${CAPABILITIES_PATH}?${params.toString()}`)
  const body = await response.json() as CapabilitiesResponse | { ok: false; message?: string }
  if (!response.ok || body.ok !== true) {
    throw new Error(
      'ok' in body && body.ok === false && typeof body.message === 'string'
        ? body.message
        : `capabilities HTTP ${response.status}`,
    )
  }
  return body.capabilities
}

/** In-memory cache keyed by `provider/model`. */
export class CapabilityCache {
  private readonly map = new Map<string, boolean>()

  get(provider: string, model: string): boolean | undefined {
    return this.map.get(`${provider}/${model}`)
  }

  snapshot(): ReadonlyMap<string, boolean> {
    return this.map
  }

  async ensure(queries: readonly CapabilityQuery[]): Promise<void> {
    const missing = queries.filter(q => !this.map.has(`${q.provider}/${q.model}`))
    if (missing.length === 0) return
    const entries = await fetchCapabilities(missing)
    for (const entry of entries) {
      this.map.set(`${entry.provider}/${entry.model}`, entry.supportsImage)
    }
  }
}
