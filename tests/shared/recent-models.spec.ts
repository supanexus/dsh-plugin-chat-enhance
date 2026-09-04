import { describe, expect, it } from 'vitest'
import {
  matchesQuery,
  pushRecentModel,
  readRecentModels,
  RECENT_MODELS_STORAGE_KEY,
} from '../../src/shared/recent-models.ts'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => { map.clear() },
    getItem: key => map.get(key) ?? null,
    key: index => [...map.keys()][index] ?? null,
    removeItem: key => { map.delete(key) },
    setItem: (key, value) => { map.set(key, value) },
  }
}

describe('matchesQuery', () => {
  it('matches case-insensitive wildcard terms', () => {
    expect(matchesQuery('GPT-5.6 Flash', 'gpt 6')).toBe(true)
    expect(matchesQuery('DeepSeek-V4', 'claude')).toBe(false)
  })

  it('returns true for empty query', () => {
    expect(matchesQuery('anything', '   ')).toBe(true)
  })
})

describe('recent models storage', () => {
  it('dedupes and caps recent entries', () => {
    const storage = memoryStorage()
    pushRecentModel({ provider: 'p1', model: 'm1', label: 'One' }, 3, storage)
    pushRecentModel({ provider: 'p2', model: 'm2', label: 'Two' }, 3, storage)
    pushRecentModel({ provider: 'p1', model: 'm1', label: 'One again' }, 3, storage)
    pushRecentModel({ provider: 'p3', model: 'm3', label: 'Three' }, 3, storage)
    pushRecentModel({ provider: 'p4', model: 'm4', label: 'Four' }, 3, storage)

    expect(readRecentModels(storage)).toEqual([
      { provider: 'p4', model: 'm4', label: 'Four' },
      { provider: 'p3', model: 'm3', label: 'Three' },
      { provider: 'p1', model: 'm1', label: 'One again' },
    ])
    expect(storage.getItem(RECENT_MODELS_STORAGE_KEY)).not.toBeNull()
  })

  it('persists providerName for disambiguation', () => {
    const storage = memoryStorage()
    pushRecentModel({
      provider: 'deepseek-official',
      model: 'deepseek-v4-flash',
      label: 'DeepSeek-V4-Flash',
      providerName: 'DeepSeek',
    }, 3, storage)
    pushRecentModel({
      provider: 'supanexus',
      model: 'deepseek/deepseek-v4-flash',
      label: 'DeepSeek V4 Flash',
      providerName: 'SupaNexus',
    }, 3, storage)

    expect(readRecentModels(storage)).toEqual([
      {
        provider: 'supanexus',
        model: 'deepseek/deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
        providerName: 'SupaNexus',
      },
      {
        provider: 'deepseek-official',
        model: 'deepseek-v4-flash',
        label: 'DeepSeek-V4-Flash',
        providerName: 'DeepSeek',
      },
    ])
  })
})
