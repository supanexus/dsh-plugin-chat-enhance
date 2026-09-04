import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { matchesQuery } from './recent-models.ts'

/** Minimal directory snapshot shape used by the picker UI. */
export interface ModelGroupSnapshot {
  readonly id: string
  readonly name: string
  readonly models: readonly {
    readonly id: string
    readonly name: string
    readonly description?: string
    readonly reasoning?: {
      readonly defaultEffort?: string
      readonly efforts: readonly { readonly id: string; readonly name: string }[]
    }
  }[]
}

/** One flattened selectable row in the picker. */
export interface ModelChoiceRow {
  readonly provider: string
  readonly providerName: string
  readonly modelId: string
  readonly modelName: string
  readonly description?: string
  readonly selection: ModelSelection
  readonly selected: boolean
  /** True when Host reported image input; undefined while unknown. */
  readonly supportsImage?: boolean
}

/**
 * Flatten provider groups into searchable rows.
 * @param groups - loaded catalog groups.
 * @param current - active session selection.
 * @param imageSupport - optional map keyed by `provider/model`.
 */
export function flattenModelChoices(
  groups: readonly ModelGroupSnapshot[],
  current: ModelSelection | null,
  imageSupport?: ReadonlyMap<string, boolean>,
): readonly ModelChoiceRow[] {
  const rows: ModelChoiceRow[] = []
  for (const group of groups) {
    for (const model of group.models) {
      const selected = current?.provider === group.id && current.model === model.id
      const supportKey = `${group.id}/${model.id}`
      const supportsImage = imageSupport?.get(supportKey)
      rows.push({
        provider: group.id,
        providerName: group.name,
        modelId: model.id,
        modelName: model.name,
        ...(model.description === undefined ? {} : { description: model.description }),
        selection: {
          provider: group.id,
          model: model.id,
          ...(model.reasoning?.defaultEffort === undefined
            ? {}
            : { reasoningEffort: model.reasoning.defaultEffort }),
        },
        selected,
        ...(supportsImage === undefined ? {} : { supportsImage }),
      })
    }
  }
  return rows
}

/**
 * Filter model rows by a search query (provider, display name, model id).
 * @param rows - catalog rows.
 * @param query - user search string.
 */
export function filterModelChoices(rows: readonly ModelChoiceRow[], query: string): readonly ModelChoiceRow[] {
  if (query.trim() === '') return rows
  return rows.filter(row =>
    matchesQuery(`${row.providerName} ${row.modelName} ${row.modelId}`, query))
}

/**
 * Keep only rows known to support image input.
 * @param rows - catalog rows.
 * @param imageOnly - when true, drop non-image / unknown rows.
 */
export function filterImageCapable(
  rows: readonly ModelChoiceRow[],
  imageOnly: boolean,
): readonly ModelChoiceRow[] {
  if (!imageOnly) return rows
  return rows.filter(row => row.supportsImage === true)
}

/** Injected business face of the composer model seat (mirrors ui-model-selection). */
export interface ModelSelectInjected {
  readonly available: boolean
  readonly directory: SnapshotStore<{
    readonly current: ModelSelection | null
    readonly groups: readonly ModelGroupSnapshot[]
    readonly failures: readonly { readonly id: string; readonly name: string; readonly message: string }[]
    readonly status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
    readonly error: string | null
  }>
  readonly load: () => void
  readonly select: (selection: ModelSelection) => Promise<boolean>
}
