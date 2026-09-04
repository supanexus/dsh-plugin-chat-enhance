/** localStorage key for cross-session recent model picks. */
export const RECENT_MODELS_STORAGE_KEY = 'supanexus-chat-enhance:recent'
/** Previous chat-enhance key (one-time migrate). */
const LEGACY_CHAT_ENHANCE_RECENT_KEY = 'whale:chat-enhance:recent'
/** Legacy key from older model-search plugin (one-time migrate). */
const LEGACY_MODEL_SEARCH_RECENT_KEY = 'whale:model-search:recent'

const LEGACY_RECENT_KEYS = [
  LEGACY_CHAT_ENHANCE_RECENT_KEY,
  LEGACY_MODEL_SEARCH_RECENT_KEY,
] as const

/** One persisted recent model entry. */
export interface RecentModelEntry {
  readonly provider: string
  readonly model: string
  /** Display label captured at selection time. */
  readonly label: string
  /** Provider display name captured at selection time (disambiguates same model labels). */
  readonly providerName?: string
}

/**
 * Escape user input for use inside a RegExp.
 * @param value - raw search fragment.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Case-insensitive multi-term match; whitespace-separated terms act as wildcards.
 * @param value - haystack.
 * @param query - user search string.
 */
export function matchesQuery(value: string, query: string): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const pattern = new RegExp(terms.map(escapeRegExp).join('.*'))
  return pattern.test(value.toLocaleLowerCase())
}

function parseRecentList(raw: string): readonly RecentModelEntry[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item): RecentModelEntry[] => {
      if (item === null || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      if (typeof row.provider !== 'string' || typeof row.model !== 'string') return []
      const label = typeof row.label === 'string' ? row.label : row.model
      const providerName = typeof row.providerName === 'string' ? row.providerName : undefined
      return [{
        provider: row.provider,
        model: row.model,
        label,
        ...(providerName === undefined ? {} : { providerName }),
      }]
    })
  } catch {
    return []
  }
}

/**
 * Read recent models from storage (migrates legacy keys once).
 * @param storage - storage backend (localStorage in browser).
 * @param key - storage key.
 */
export function readRecentModels(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  key = RECENT_MODELS_STORAGE_KEY,
): readonly RecentModelEntry[] {
  if (storage === undefined) return []
  const current = storage.getItem(key)
  if (current !== null && current !== '') return parseRecentList(current)
  for (const legacyKey of LEGACY_RECENT_KEYS) {
    const legacy = storage.getItem(legacyKey)
    if (legacy === null || legacy === '') continue
    const migrated = parseRecentList(legacy)
    try {
      storage.setItem(key, JSON.stringify(migrated))
    } catch {
      /* ignore */
    }
    return migrated
  }
  return []
}

/**
 * Push one selection to the front of the recent list and persist.
 * @param entry - model route to remember.
 * @param maxRecent - cap on stored entries.
 * @param storage - storage backend.
 * @param key - storage key.
 */
export function pushRecentModel(
  entry: RecentModelEntry,
  maxRecent: number,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  key = RECENT_MODELS_STORAGE_KEY,
): readonly RecentModelEntry[] {
  if (storage === undefined) return [entry]
  const dedupeKey = `${entry.provider}/${entry.model}`
  const next = [
    entry,
    ...readRecentModels(storage, key).filter(item => `${item.provider}/${item.model}` !== dedupeKey),
  ].slice(0, maxRecent)
  storage.setItem(key, JSON.stringify(next))
  return next
}
