/**
 * Searchable model picker with recent-model quick chips for the composer seat.
 */
import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ErrorInfo,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  filterImageCapable,
  filterModelChoices,
  flattenModelChoices,
  type ModelSelectInjected,
} from '../shared/model-picker.ts'
import {
  pushRecentModel,
  readRecentModels,
  type RecentModelEntry,
} from '../shared/recent-models.ts'
import {
  readPickerUiState,
  writePickerUiState,
} from '../shared/picker-ui-state.ts'
import type { CapabilityCache } from './capabilities-wire.ts'
import css from './model-search-select.module.css'

const DEFAULT_MAX_RECENT = 8
/** Show the back-to-top control after the catalog scrolls past this many pixels. */
const BACK_TOP_THRESHOLD = 80

interface EffortChoice {
  readonly key: string
  readonly effort: string | undefined
  readonly label: string
}

type ModelSearchSelectProps =
  ModelSelectInjected & {
    readonly locked: boolean
    readonly capabilityCache: CapabilityCache
  } & PropsLocale<'chatEnhance'> & {
    /** Optional standard prop from the model seat (used to warn when draft has images). */
    readonly useInput?: <S>(sel: (state: { readonly imageIds: readonly unknown[] }) => S) => S
  }

function routeKey(provider: string, model: string): string {
  return `${provider}/${model}`
}

function BackTopIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 3.2 3.6 7.6l1.1 1.1L7.2 6.2V13h1.6V6.2l2.5 2.5 1.1-1.1L8 3.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Keep render crashes inside this occupant so the slot framework does not
 * abdicate back to the official ModelSelect.
 */
class ModelSearchBoundary extends Component<
  { readonly children: ReactNode },
  { readonly message: string | null }
> {
  override state: { readonly message: string | null } = { message: null }

  static getDerivedStateFromError(error: unknown): { readonly message: string } {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[supanexus-chat-enhance] render crash', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div
          data-snx-chat-enhance="error"
          className={css.chip}
          title={this.state.message}
        >
          SupaNexus chat enhance
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Render the composer model seat with recent chips and a searchable picker panel.
 */
export function ModelSearchSelect(props: ModelSearchSelectProps): JSX.Element {
  return (
    <ModelSearchBoundary>
      <ModelSearchSelectInner {...props} />
    </ModelSearchBoundary>
  )
}

function ModelSearchSelectInner({
  locked,
  available,
  directory,
  load,
  select,
  capabilityCache,
  useInput,
  t,
}: ModelSearchSelectProps): JSX.Element | null {
  const state = useSyncExternalStore(
    fn => directory.subscribe(fn),
    () => directory.getSnapshot(),
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(() => readPickerUiState().query)
  const [providerFilter, setProviderFilter] = useState<string | null>(
    () => readPickerUiState().providerFilter,
  )
  const [imageOnly, setImageOnly] = useState(false)
  const [capVersion, setCapVersion] = useState(0)
  const [recent, setRecent] = useState<readonly RecentModelEntry[]>(() => readRecentModels())
  const [toast, setToast] = useState<string | null>(null)
  const [showBackTop, setShowBackTop] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const catalogRef = useRef<HTMLDivElement | null>(null)
  const panelId = useId()
  const draftImageCount = useInput?.(s => s.imageIds.length) ?? 0
  const draftImageCountRef = useRef(draftImageCount)
  draftImageCountRef.current = draftImageCount

  useEffect(() => {
    if (state.status !== 'ready' || state.groups.length === 0) return
    const queries = state.groups.flatMap(group =>
      group.models.map(model => ({ provider: group.id, model: model.id })))
    void capabilityCache.ensure(queries)
      .then(() => { setCapVersion(value => value + 1) })
      .catch(() => { /* tags stay absent */ })
  }, [capabilityCache, state.groups, state.status])

  const choices = useMemo(
    () => flattenModelChoices(state.groups, state.current, capabilityCache.snapshot()),
    [capabilityCache, capVersion, state.groups, state.current],
  )
  const providerTabs = useMemo(
    () => state.groups.map(group => ({
      id: group.id,
      name: group.name,
      count: group.models.length,
    })),
    [state.groups],
  )
  const allProviderCount = useMemo(
    () => providerTabs.reduce((sum, tab) => sum + tab.count, 0),
    [providerTabs],
  )
  const filtered = useMemo(() => {
    return filterImageCapable(filterModelChoices(choices, query), imageOnly)
  }, [choices, imageOnly, query])
  const filteredGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rows: typeof filtered }>()
    for (const row of filtered) {
      if (providerFilter !== null && row.provider !== providerFilter) continue
      const group = map.get(row.provider)
      if (group === undefined) {
        map.set(row.provider, { id: row.provider, name: row.providerName, rows: [row] })
      } else {
        group.rows = [...group.rows, row]
      }
    }
    return [...map.values()]
  }, [filtered, providerFilter])

  const currentChoice = choices.find(row => row.selected)
  const reasoning = currentChoice === undefined
    ? undefined
    : state.groups
      .find(group => group.id === currentChoice.provider)
      ?.models.find(model => model.id === currentChoice.modelId)
      ?.reasoning
  const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort
  const effortChoices = useMemo<readonly EffortChoice[]>(() => {
    if (reasoning === undefined) return []
    return [
      ...(reasoning.defaultEffort === undefined
        ? [{ key: 'provider-default', effort: undefined, label: t('effort.providerDefault') }]
        : []),
      ...reasoning.efforts.map(effort => ({
        key: `effort:${effort.id}`,
        effort: effort.id,
        label: effort.name,
      })),
    ]
  }, [reasoning, t])

  const labelOf = useCallback((provider: string, model: string, fallback: string): string => {
    const row = choices.find(item => item.provider === provider && item.modelId === model)
    return row?.modelName ?? fallback
  }, [choices])

  const providerNameOf = useCallback((provider: string, fallback?: string): string => {
    const row = choices.find(item => item.provider === provider)
    return row?.providerName ?? fallback ?? provider
  }, [choices])

  const recentChips = useMemo(() => {
    const seen = new Set<string>()
    const chips: RecentModelEntry[] = []
    const push = (entry: RecentModelEntry): void => {
      const key = routeKey(entry.provider, entry.model)
      if (seen.has(key)) return
      seen.add(key)
      chips.push({
        provider: entry.provider,
        model: entry.model,
        label: labelOf(entry.provider, entry.model, entry.label),
        providerName: providerNameOf(entry.provider, entry.providerName),
      })
    }
    for (const entry of recent.slice(0, DEFAULT_MAX_RECENT)) push(entry)
    if (state.current !== null) {
      push({
        provider: state.current.provider,
        model: state.current.model,
        label: labelOf(
          state.current.provider,
          state.current.model,
          `${state.current.provider}/${state.current.model}`,
        ),
        providerName: providerNameOf(state.current.provider),
      })
    }
    if (chips.length === 0 && currentChoice !== undefined) {
      push({
        provider: currentChoice.provider,
        model: currentChoice.modelId,
        label: currentChoice.modelName,
        providerName: currentChoice.providerName,
      })
    }
    return chips
  }, [recent, state.current, labelOf, providerNameOf, currentChoice])

  const reload = useCallback((): void => {
    load()
  }, [load])

  const close = useCallback((restoreFocus = false): void => {
    setOpen(false)
    setShowBackTop(false)
    writePickerUiState({ query, providerFilter })
    if (restoreFocus) queueMicrotask(() => { rootRef.current?.querySelector('button')?.focus() })
  }, [providerFilter, query])

  const remember = useCallback((
    provider: string,
    model: string,
    label: string,
    providerName?: string,
  ): void => {
    setRecent(pushRecentModel({
      provider,
      model,
      label,
      ...(providerName === undefined ? {} : { providerName }),
    }, DEFAULT_MAX_RECENT))
  }, [])

  const settleSelection = useCallback((accepted: boolean, label: string, selection: ModelSelection): void => {
    if (accepted) {
      remember(
        selection.provider,
        selection.model,
        label,
        providerNameOf(selection.provider),
      )
      close(true)
      return
    }
    const message = directory.getSnapshot().error
    if (message !== null) setToast(t('error.action', { message }))
  }, [close, directory, providerNameOf, remember, t])

  const choose = useCallback((selection: ModelSelection, label: string): void => {
    if (
      state.current?.provider === selection.provider
      && state.current.model === selection.model
      && state.current.reasoningEffort === selection.reasoningEffort
    ) {
      close(true)
      return
    }
    const targetSupportsImage = capabilityCache.get(selection.provider, selection.model) === true
    if (!targetSupportsImage && draftImageCountRef.current > 0) {
      setToast(t('warn.modelNoImage'))
    }
    void select(selection).then(accepted => { settleSelection(accepted, label, selection) })
  }, [capabilityCache, close, select, settleSelection, state.current, t])

  const chooseEffort = useCallback((effort: string | undefined): void => {
    if (state.current === null) return
    const label = labelOf(state.current.provider, state.current.model, state.current.model)
    const selection: ModelSelection = {
      provider: state.current.provider,
      model: state.current.model,
      ...(effort === undefined ? {} : { reasoningEffort: effort }),
    }
    choose(selection, label)
  }, [choose, labelOf, state.current])

  const openPanel = useCallback((): void => {
    const saved = readPickerUiState()
    setQuery(saved.query)
    setProviderFilter(saved.providerFilter)
    setRecent(readRecentModels())
    setOpen(true)
    reload()
  }, [reload])

  const pickRecent = useCallback((entry: RecentModelEntry): void => {
    const row = choices.find(item =>
      item.provider === entry.provider && item.modelId === entry.model)
    if (row === undefined) return
    choose(row.selection, row.modelName)
  }, [choices, choose])

  useEffect(() => {
    writePickerUiState({ query, providerFilter })
  }, [providerFilter, query])

  useEffect(() => {
    if (!open) return
    if (providerFilter === null) return
    const stillExists = providerTabs.some(tab => tab.id === providerFilter)
    if (!stillExists) setProviderFilter(null)
  }, [open, providerFilter, providerTabs])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('mousedown', closeOutside) }
  }, [close, open])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => { searchRef.current?.focus() })
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = catalogRef.current
    if (el === null) return
    const onScroll = (): void => {
      setShowBackTop(el.scrollTop > BACK_TOP_THRESHOLD)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll) }
  }, [open, filteredGroups.length])

  const scrollCatalogTop = useCallback((): void => {
    const el = catalogRef.current
    if (el === null) return
    el.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const selectProviderTab = useCallback((providerId: string | null): void => {
    setProviderFilter(providerId)
    setShowBackTop(false)
    queueMicrotask(() => {
      const el = catalogRef.current
      if (el !== null) el.scrollTop = 0
    })
  }, [])

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      close(true)
    }
  }

  if (!available) return null

  const busy = state.status === 'selecting'
  const waiting = state.current === null && state.status === 'loading'

  return (
    <div
      ref={rootRef}
      className={css.root}
      data-snx-chat-enhance="ready"
      onKeyDown={onRootKeyDown}
    >
      <div className={css.recentRow}>
        <button
          type="button"
          className={`${css.chip} ${css.chipSelected}`}
          disabled={locked || waiting}
          title={currentChoice === undefined
            ? undefined
            : `${currentChoice.providerName} · ${currentChoice.modelName}`}
          onClick={() => {
            if (open) close(true)
            else openPanel()
          }}
        >
          {waiting
            ? t('status.loading')
            : (currentChoice?.modelName ?? t('empty.recent'))}
        </button>
      </div>

      <button
        type="button"
        className={css.expandButton}
        aria-label={t('expand.aria')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={locked}
        onClick={() => {
          if (open) close(true)
          else openPanel()
        }}
      >
        {t('expand.label')}
      </button>

      {open && (
        <div id={panelId} className={css.panel} role="dialog" aria-label={t('picker.aria')}>
          <input
            ref={searchRef}
            className={css.searchInput}
            type="search"
            value={query}
            placeholder={t('search.placeholder')}
            aria-label={t('search.aria')}
            disabled={busy}
            onChange={event => { setQuery(event.target.value) }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') event.stopPropagation()
            }}
          />

          {providerTabs.length > 0 && (
            <div className={css.filterBar}>
              <div className={css.providerTabs} role="tablist" aria-label={t('provider.tabs.aria')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={providerFilter === null}
                  className={`${css.providerTab}${providerFilter === null ? ` ${css.providerTabActive}` : ''}`}
                  onClick={() => { selectProviderTab(null) }}
                >
                  {t('provider.all')}
                  <span className={css.providerTabCount}>{allProviderCount}</span>
                </button>
                {providerTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={providerFilter === tab.id}
                    className={`${css.providerTab}${providerFilter === tab.id ? ` ${css.providerTabActive}` : ''}`}
                    title={`${tab.name} (${String(tab.count)})`}
                    onClick={() => { selectProviderTab(tab.id) }}
                  >
                    {tab.name}
                    <span className={css.providerTabCount}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <label
                className={css.imageOnlyCheck}
                title={t('filter.imageOnly.aria')}
              >
                <input
                  type="checkbox"
                  checked={imageOnly}
                  aria-label={t('filter.imageOnly.aria')}
                  onChange={event => { setImageOnly(event.target.checked) }}
                />
                <span>{t('filter.imageOnly')}</span>
              </label>
            </div>
          )}

          {state.status === 'loading' && (
            <div className={css.status}>{t('status.loading')}</div>
          )}

          {state.error !== null && (
            <div className={css.error}>
              <span>{t('error.action', { message: state.error })}</span>
              <button type="button" className={css.retry} onClick={reload}>{t('retry')}</button>
            </div>
          )}

          {state.failures.map(failure => (
            <div className={css.warning} key={failure.id}>
              <span>{t('warning.groupLoad', { name: failure.name, message: failure.message })}</span>
              <button type="button" className={css.retry} onClick={reload}>{t('retry')}</button>
            </div>
          ))}

          <div className={css.panelBody}>
            <div className={css.catalogPane}>
              <div ref={catalogRef} className={`${css.catalogColumn} scrollable`}>
                {filteredGroups.map(group => (
                  <section className={css.group} key={group.id}>
                    {providerFilter === null && (
                      <div className={css.groupTitle}>{group.name}</div>
                    )}
                    {group.rows.map(row => (
                      <button
                        key={routeKey(row.provider, row.modelId)}
                        type="button"
                        className={`${css.option}${row.selected ? ` ${css.optionSelected}` : ''}`}
                        disabled={busy}
                        onClick={() => { choose(row.selection, row.modelName) }}
                      >
                        <span className={css.optionCopy}>
                          <span className={css.modelTitle}>
                            <span className={css.modelName}>{row.modelName}</span>
                            {row.supportsImage === true ? (
                              <span className={css.capabilityTag}>{t('capability.image')}</span>
                            ) : null}
                          </span>
                          <span className={css.modelMeta}>{row.modelId}</span>
                        </span>
                      </button>
                    ))}
                  </section>
                ))}
                {state.status === 'ready' && filteredGroups.length === 0 && (
                  <div className={css.empty}>{t('empty.models')}</div>
                )}
              </div>
              {showBackTop && (
                <button
                  type="button"
                  className={css.backTop}
                  aria-label={t('backToTop.aria')}
                  title={t('backToTop.aria')}
                  onClick={scrollCatalogTop}
                >
                  <BackTopIcon />
                </button>
              )}
            </div>

            <aside className={css.recentColumn} aria-label={t('recent.title')}>
              <div className={css.recentTitle}>{t('recent.title')}</div>
              <div className={`${css.recentList} scrollable`}>
                {recentChips.length === 0 && (
                  <div className={css.empty}>{t('empty.recentList')}</div>
                )}
                {recentChips.map(entry => {
                  const selected = state.current?.provider === entry.provider
                    && state.current.model === entry.model
                  const row = choices.find(item =>
                    item.provider === entry.provider && item.modelId === entry.model)
                  const providerName = entry.providerName ?? entry.provider
                  return (
                    <button
                      key={routeKey(entry.provider, entry.model)}
                      type="button"
                      className={`${css.option}${selected ? ` ${css.optionSelected}` : ''}`}
                      disabled={busy || row === undefined}
                      title={`${providerName} · ${entry.label} (${routeKey(entry.provider, entry.model)})`}
                      onClick={() => { pickRecent(entry) }}
                    >
                      <span className={css.optionCopy}>
                        <span className={css.modelTitle}>
                          <span className={css.recentName}>{entry.label}</span>
                          {row?.supportsImage === true ? (
                            <span className={css.capabilityTag}>{t('capability.image')}</span>
                          ) : null}
                        </span>
                        <span className={css.modelMeta}>{providerName}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>
          </div>

          {effortChoices.length > 0 && (
            <div className={css.effortSection}>
              <div className={css.effortTitle}>{t('effort.label')}</div>
              <div className={css.effortRow}>
                {effortChoices.map(level => (
                  <button
                    key={level.key}
                    type="button"
                    className={`${css.effortChip}${effectiveEffort === level.effort ? ` ${css.effortChipSelected}` : ''}`}
                    disabled={busy || state.current === null}
                    onClick={() => { chooseEffort(level.effort) }}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {toast !== null && (
        <div className={css.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
