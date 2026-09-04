import { describe, expect, it } from 'vitest'
import {
  PICKER_UI_STORAGE_KEY,
  readPickerUiState,
  writePickerUiState,
} from '../../src/shared/picker-ui-state.ts'

describe('picker-ui-state', () => {
  it('round-trips query and provider filter', () => {
    const storage = new Map<string, string>()
    const backend = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
    }
    writePickerUiState(
      { query: 'flash', providerFilter: 'deepseek-official' },
      backend,
    )
    expect(storage.get(PICKER_UI_STORAGE_KEY)).toContain('flash')
    expect(readPickerUiState(backend)).toEqual({
      query: 'flash',
      providerFilter: 'deepseek-official',
    })
  })

  it('treats missing providerFilter as All', () => {
    const storage = {
      getItem: () => JSON.stringify({ query: 'x' }),
    }
    expect(readPickerUiState(storage).providerFilter).toBeNull()
  })
})
