/** Persist chat-enhance picker UI (query + provider tab) across open/close. */

/** localStorage key for picker filter/search state. */
export const PICKER_UI_STORAGE_KEY = 'supanexus-chat-enhance:picker-ui'
/** Previous chat-enhance key (one-time migrate). */
const LEGACY_CHAT_ENHANCE_PICKER_KEY = 'whale:chat-enhance:picker-ui'
/** Legacy key from older model-search plugin. */
const LEGACY_MODEL_SEARCH_PICKER_KEY = 'whale:model-search:picker-ui'

const LEGACY_PICKER_KEYS = [
  LEGACY_CHAT_ENHANCE_PICKER_KEY,
  LEGACY_MODEL_SEARCH_PICKER_KEY,
] as const

/** Last search box + provider tab selection. */
export interface PickerUiState {
  readonly query: string
  /** `null` means “All” tab. */
  readonly providerFilter: string | null
}

const EMPTY: PickerUiState = { query: '', providerFilter: null }

function parseState(raw: string): PickerUiState {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return EMPTY
    const row = parsed as Record<string, unknown>
    const query = typeof row.query === 'string' ? row.query : ''
    const providerFilter = typeof row.providerFilter === 'string'
      ? row.providerFilter
      : null
    return { query, providerFilter }
  } catch {
    return EMPTY
  }
}

/**
 * Read last picker UI state from storage (migrates legacy keys once).
 * @param storage - storage backend.
 * @param key - storage key.
 */
export function readPickerUiState(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  key = PICKER_UI_STORAGE_KEY,
): PickerUiState {
  if (storage === undefined) return EMPTY
  const current = storage.getItem(key)
  if (current !== null && current !== '') return parseState(current)
  for (const legacyKey of LEGACY_PICKER_KEYS) {
    const legacy = storage.getItem(legacyKey)
    if (legacy === null || legacy === '') continue
    const migrated = parseState(legacy)
    try {
      storage.setItem(key, JSON.stringify(migrated))
    } catch {
      /* ignore */
    }
    return migrated
  }
  return EMPTY
}

/**
 * Persist picker UI state.
 * @param state - query + provider tab.
 * @param storage - storage backend.
 * @param key - storage key.
 */
export function writePickerUiState(
  state: PickerUiState,
  storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  key = PICKER_UI_STORAGE_KEY,
): void {
  if (storage === undefined) return
  try {
    storage.setItem(key, JSON.stringify({
      query: state.query,
      providerFilter: state.providerFilter,
    }))
  } catch {
    /* quota / private mode — ignore */
  }
}
