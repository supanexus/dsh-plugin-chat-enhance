import { describe, expect, it } from 'vitest'
import {
  filterImageCapable,
  filterModelChoices,
  flattenModelChoices,
} from '../../src/shared/model-picker.ts'

const groups = [{
  id: 'deepseek',
  name: 'DeepSeek',
  models: [
    { id: 'v4-flash', name: 'DeepSeek-V4-Flash' },
    { id: 'v4', name: 'DeepSeek-V4' },
  ],
}, {
  id: 'other',
  name: 'Other',
  models: [{ id: 'gpt-6', name: 'GPT-6' }],
}]

describe('flattenModelChoices', () => {
  it('marks the current selection', () => {
    const rows = flattenModelChoices(groups, { provider: 'deepseek', model: 'v4-flash' })
    expect(rows.find(row => row.modelId === 'v4-flash')?.selected).toBe(true)
    expect(rows.find(row => row.modelId === 'v4')?.selected).toBe(false)
  })

  it('attaches supportsImage from the capability map', () => {
    const support = new Map([['deepseek/v4-flash', true], ['other/gpt-6', false]])
    const rows = flattenModelChoices(groups, null, support)
    expect(rows.find(row => row.modelId === 'v4-flash')?.supportsImage).toBe(true)
    expect(rows.find(row => row.modelId === 'gpt-6')?.supportsImage).toBe(false)
    expect(rows.find(row => row.modelId === 'v4')?.supportsImage).toBeUndefined()
  })
})

describe('filterModelChoices', () => {
  it('filters by provider, display name, and model id', () => {
    const rows = flattenModelChoices(groups, null)
    expect(filterModelChoices(rows, 'flash')).toHaveLength(1)
    expect(filterModelChoices(rows, 'other gpt')).toHaveLength(1)
    expect(filterModelChoices(rows, '')).toHaveLength(3)
  })
})

describe('filterImageCapable', () => {
  it('keeps only known image-capable rows when enabled', () => {
    const support = new Map([['deepseek/v4-flash', true]])
    const rows = flattenModelChoices(groups, null, support)
    expect(filterImageCapable(rows, false)).toHaveLength(3)
    expect(filterImageCapable(rows, true)).toEqual([
      expect.objectContaining({ modelId: 'v4-flash', supportsImage: true }),
    ])
  })
})
