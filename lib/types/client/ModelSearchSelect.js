import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Searchable model picker with recent-model quick chips for the composer seat.
 */
import { Component, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, } from 'react';
import { filterImageCapable, filterModelChoices, flattenModelChoices, } from "../shared/model-picker.js";
import { pushRecentModel, readRecentModels, } from "../shared/recent-models.js";
import { readPickerUiState, writePickerUiState, } from "../shared/picker-ui-state.js";
import css from './model-search-select.module.css';
const DEFAULT_MAX_RECENT = 8;
/** Show the back-to-top control after the catalog scrolls past this many pixels. */
const BACK_TOP_THRESHOLD = 80;
function routeKey(provider, model) {
    return `${provider}/${model}`;
}
function BackTopIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("path", { d: "M8 3.2 3.6 7.6l1.1 1.1L7.2 6.2V13h1.6V6.2l2.5 2.5 1.1-1.1L8 3.2Z", fill: "currentColor" }) }));
}
/**
 * Keep render crashes inside this occupant so the slot framework does not
 * abdicate back to the official ModelSelect.
 */
class ModelSearchBoundary extends Component {
    state = { message: null };
    static getDerivedStateFromError(error) {
        return { message: error instanceof Error ? error.message : String(error) };
    }
    componentDidCatch(error, info) {
        console.error('[supanexus-chat-enhance] render crash', error, info.componentStack);
    }
    render() {
        if (this.state.message !== null) {
            return (_jsx("div", { "data-snx-chat-enhance": "error", className: css.chip, title: this.state.message, children: "SupaNexus chat enhance" }));
        }
        return this.props.children;
    }
}
/**
 * Render the composer model seat with recent chips and a searchable picker panel.
 */
export function ModelSearchSelect(props) {
    return (_jsx(ModelSearchBoundary, { children: _jsx(ModelSearchSelectInner, { ...props }) }));
}
function ModelSearchSelectInner({ locked, available, directory, load, select, capabilityCache, t, }) {
    const state = useSyncExternalStore(fn => directory.subscribe(fn), () => directory.getSnapshot());
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(() => readPickerUiState().query);
    const [providerFilter, setProviderFilter] = useState(() => readPickerUiState().providerFilter);
    const [imageOnly, setImageOnly] = useState(false);
    const [capVersion, setCapVersion] = useState(0);
    const [recent, setRecent] = useState(() => readRecentModels());
    const [toast, setToast] = useState(null);
    const [showBackTop, setShowBackTop] = useState(false);
    const rootRef = useRef(null);
    const searchRef = useRef(null);
    const catalogRef = useRef(null);
    const panelId = useId();
    useEffect(() => {
        if (state.status !== 'ready' || state.groups.length === 0)
            return;
        const queries = state.groups.flatMap(group => group.models.map(model => ({ provider: group.id, model: model.id })));
        void capabilityCache.ensure(queries)
            .then(() => { setCapVersion(value => value + 1); })
            .catch(() => { });
    }, [capabilityCache, state.groups, state.status]);
    const choices = useMemo(() => flattenModelChoices(state.groups, state.current, capabilityCache.snapshot()), [capabilityCache, capVersion, state.groups, state.current]);
    const providerTabs = useMemo(() => state.groups.map(group => ({
        id: group.id,
        name: group.name,
        count: group.models.length,
    })), [state.groups]);
    const allProviderCount = useMemo(() => providerTabs.reduce((sum, tab) => sum + tab.count, 0), [providerTabs]);
    const filtered = useMemo(() => {
        return filterImageCapable(filterModelChoices(choices, query), imageOnly);
    }, [choices, imageOnly, query]);
    const filteredGroups = useMemo(() => {
        const map = new Map();
        for (const row of filtered) {
            if (providerFilter !== null && row.provider !== providerFilter)
                continue;
            const group = map.get(row.provider);
            if (group === undefined) {
                map.set(row.provider, { id: row.provider, name: row.providerName, rows: [row] });
            }
            else {
                group.rows = [...group.rows, row];
            }
        }
        return [...map.values()];
    }, [filtered, providerFilter]);
    const currentChoice = choices.find(row => row.selected);
    const reasoning = currentChoice === undefined
        ? undefined
        : state.groups
            .find(group => group.id === currentChoice.provider)
            ?.models.find(model => model.id === currentChoice.modelId)
            ?.reasoning;
    const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
    const effortChoices = useMemo(() => {
        if (reasoning === undefined)
            return [];
        return [
            ...(reasoning.defaultEffort === undefined
                ? [{ key: 'provider-default', effort: undefined, label: t('effort.providerDefault') }]
                : []),
            ...reasoning.efforts.map(effort => ({
                key: `effort:${effort.id}`,
                effort: effort.id,
                label: effort.name,
            })),
        ];
    }, [reasoning, t]);
    const labelOf = useCallback((provider, model, fallback) => {
        const row = choices.find(item => item.provider === provider && item.modelId === model);
        return row?.modelName ?? fallback;
    }, [choices]);
    const providerNameOf = useCallback((provider, fallback) => {
        const row = choices.find(item => item.provider === provider);
        return row?.providerName ?? fallback ?? provider;
    }, [choices]);
    const recentChips = useMemo(() => {
        const seen = new Set();
        const chips = [];
        const push = (entry) => {
            const key = routeKey(entry.provider, entry.model);
            if (seen.has(key))
                return;
            seen.add(key);
            chips.push({
                provider: entry.provider,
                model: entry.model,
                label: labelOf(entry.provider, entry.model, entry.label),
                providerName: providerNameOf(entry.provider, entry.providerName),
            });
        };
        for (const entry of recent.slice(0, DEFAULT_MAX_RECENT))
            push(entry);
        if (state.current !== null) {
            push({
                provider: state.current.provider,
                model: state.current.model,
                label: labelOf(state.current.provider, state.current.model, `${state.current.provider}/${state.current.model}`),
                providerName: providerNameOf(state.current.provider),
            });
        }
        if (chips.length === 0 && currentChoice !== undefined) {
            push({
                provider: currentChoice.provider,
                model: currentChoice.modelId,
                label: currentChoice.modelName,
                providerName: currentChoice.providerName,
            });
        }
        return chips;
    }, [recent, state.current, labelOf, providerNameOf, currentChoice]);
    const reload = useCallback(() => {
        load();
    }, [load]);
    const close = useCallback((restoreFocus = false) => {
        setOpen(false);
        setShowBackTop(false);
        writePickerUiState({ query, providerFilter });
        if (restoreFocus)
            queueMicrotask(() => { rootRef.current?.querySelector('button')?.focus(); });
    }, [providerFilter, query]);
    const remember = useCallback((provider, model, label, providerName) => {
        setRecent(pushRecentModel({
            provider,
            model,
            label,
            ...(providerName === undefined ? {} : { providerName }),
        }, DEFAULT_MAX_RECENT));
    }, []);
    const settleSelection = useCallback((accepted, label, selection) => {
        if (accepted) {
            remember(selection.provider, selection.model, label, providerNameOf(selection.provider));
            close(true);
            return;
        }
        const message = directory.getSnapshot().error;
        if (message !== null)
            setToast(t('error.action', { message }));
    }, [close, directory, providerNameOf, remember, t]);
    const choose = useCallback((selection, label) => {
        if (state.current?.provider === selection.provider
            && state.current.model === selection.model
            && state.current.reasoningEffort === selection.reasoningEffort) {
            close(true);
            return;
        }
        void select(selection).then(accepted => { settleSelection(accepted, label, selection); });
    }, [close, select, settleSelection, state.current]);
    const chooseEffort = useCallback((effort) => {
        if (state.current === null)
            return;
        const label = labelOf(state.current.provider, state.current.model, state.current.model);
        const selection = {
            provider: state.current.provider,
            model: state.current.model,
            ...(effort === undefined ? {} : { reasoningEffort: effort }),
        };
        choose(selection, label);
    }, [choose, labelOf, state.current]);
    const openPanel = useCallback(() => {
        const saved = readPickerUiState();
        setQuery(saved.query);
        setProviderFilter(saved.providerFilter);
        setRecent(readRecentModels());
        setOpen(true);
        reload();
    }, [reload]);
    const pickRecent = useCallback((entry) => {
        const row = choices.find(item => item.provider === entry.provider && item.modelId === entry.model);
        if (row === undefined)
            return;
        choose(row.selection, row.modelName);
    }, [choices, choose]);
    useEffect(() => {
        writePickerUiState({ query, providerFilter });
    }, [providerFilter, query]);
    useEffect(() => {
        if (!open)
            return;
        if (providerFilter === null)
            return;
        const stillExists = providerTabs.some(tab => tab.id === providerFilter);
        if (!stillExists)
            setProviderFilter(null);
    }, [open, providerFilter, providerTabs]);
    useEffect(() => {
        if (!open)
            return;
        const closeOutside = (event) => {
            if (!rootRef.current?.contains(event.target))
                close();
        };
        document.addEventListener('mousedown', closeOutside);
        return () => { document.removeEventListener('mousedown', closeOutside); };
    }, [close, open]);
    useEffect(() => {
        if (!open)
            return;
        queueMicrotask(() => { searchRef.current?.focus(); });
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const el = catalogRef.current;
        if (el === null)
            return;
        const onScroll = () => {
            setShowBackTop(el.scrollTop > BACK_TOP_THRESHOLD);
        };
        onScroll();
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => { el.removeEventListener('scroll', onScroll); };
    }, [open, filteredGroups.length]);
    const scrollCatalogTop = useCallback(() => {
        const el = catalogRef.current;
        if (el === null)
            return;
        el.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);
    const selectProviderTab = useCallback((providerId) => {
        setProviderFilter(providerId);
        setShowBackTop(false);
        queueMicrotask(() => {
            const el = catalogRef.current;
            if (el !== null)
                el.scrollTop = 0;
        });
    }, []);
    const onRootKeyDown = (event) => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
        }
    };
    if (!available)
        return null;
    const busy = state.status === 'selecting';
    const waiting = state.current === null && state.status === 'loading';
    return (_jsxs("div", { ref: rootRef, className: css.root, "data-snx-chat-enhance": "ready", onKeyDown: onRootKeyDown, children: [_jsx("div", { className: css.recentRow, children: _jsx("button", { type: "button", className: `${css.chip} ${css.chipSelected}`, disabled: locked || waiting, title: currentChoice === undefined
                        ? undefined
                        : `${currentChoice.providerName} · ${currentChoice.modelName}`, onClick: () => {
                        if (open)
                            close(true);
                        else
                            openPanel();
                    }, children: waiting
                        ? t('status.loading')
                        : (currentChoice?.modelName ?? t('empty.recent')) }) }), _jsx("button", { type: "button", className: css.expandButton, "aria-label": t('expand.aria'), "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": open ? panelId : undefined, disabled: locked, onClick: () => {
                    if (open)
                        close(true);
                    else
                        openPanel();
                }, children: t('expand.label') }), open && (_jsxs("div", { id: panelId, className: css.panel, role: "dialog", "aria-label": t('picker.aria'), children: [_jsx("input", { ref: searchRef, className: css.searchInput, type: "search", value: query, placeholder: t('search.placeholder'), "aria-label": t('search.aria'), disabled: busy, onChange: event => { setQuery(event.target.value); }, onKeyDown: event => {
                            if (event.key === 'ArrowDown' || event.key === 'ArrowUp')
                                event.stopPropagation();
                        } }), providerTabs.length > 0 && (_jsxs("div", { className: css.filterBar, children: [_jsxs("div", { className: css.providerTabs, role: "tablist", "aria-label": t('provider.tabs.aria'), children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": providerFilter === null, className: `${css.providerTab}${providerFilter === null ? ` ${css.providerTabActive}` : ''}`, onClick: () => { selectProviderTab(null); }, children: [t('provider.all'), _jsx("span", { className: css.providerTabCount, children: allProviderCount })] }), providerTabs.map(tab => (_jsxs("button", { type: "button", role: "tab", "aria-selected": providerFilter === tab.id, className: `${css.providerTab}${providerFilter === tab.id ? ` ${css.providerTabActive}` : ''}`, title: `${tab.name} (${String(tab.count)})`, onClick: () => { selectProviderTab(tab.id); }, children: [tab.name, _jsx("span", { className: css.providerTabCount, children: tab.count })] }, tab.id)))] }), _jsxs("label", { className: css.imageOnlyCheck, title: t('filter.imageOnly.aria'), children: [_jsx("input", { type: "checkbox", checked: imageOnly, "aria-label": t('filter.imageOnly.aria'), onChange: event => { setImageOnly(event.target.checked); } }), _jsx("span", { children: t('filter.imageOnly') })] })] })), state.status === 'loading' && (_jsx("div", { className: css.status, children: t('status.loading') })), state.error !== null && (_jsxs("div", { className: css.error, children: [_jsx("span", { children: t('error.action', { message: state.error }) }), _jsx("button", { type: "button", className: css.retry, onClick: reload, children: t('retry') })] })), state.failures.map(failure => (_jsxs("div", { className: css.warning, children: [_jsx("span", { children: t('warning.groupLoad', { name: failure.name, message: failure.message }) }), _jsx("button", { type: "button", className: css.retry, onClick: reload, children: t('retry') })] }, failure.id))), _jsxs("div", { className: css.panelBody, children: [_jsxs("div", { className: css.catalogPane, children: [_jsxs("div", { ref: catalogRef, className: `${css.catalogColumn} scrollable`, children: [filteredGroups.map(group => (_jsxs("section", { className: css.group, children: [providerFilter === null && (_jsx("div", { className: css.groupTitle, children: group.name })), group.rows.map(row => (_jsx("button", { type: "button", className: `${css.option}${row.selected ? ` ${css.optionSelected}` : ''}`, disabled: busy, onClick: () => { choose(row.selection, row.modelName); }, children: _jsxs("span", { className: css.optionCopy, children: [_jsxs("span", { className: css.modelTitle, children: [_jsx("span", { className: css.modelName, children: row.modelName }), row.supportsImage === true ? (_jsx("span", { className: css.capabilityTag, children: t('capability.image') })) : null] }), _jsx("span", { className: css.modelMeta, children: row.modelId })] }) }, routeKey(row.provider, row.modelId))))] }, group.id))), state.status === 'ready' && filteredGroups.length === 0 && (_jsx("div", { className: css.empty, children: t('empty.models') }))] }), showBackTop && (_jsx("button", { type: "button", className: css.backTop, "aria-label": t('backToTop.aria'), title: t('backToTop.aria'), onClick: scrollCatalogTop, children: _jsx(BackTopIcon, {}) }))] }), _jsxs("aside", { className: css.recentColumn, "aria-label": t('recent.title'), children: [_jsx("div", { className: css.recentTitle, children: t('recent.title') }), _jsxs("div", { className: `${css.recentList} scrollable`, children: [recentChips.length === 0 && (_jsx("div", { className: css.empty, children: t('empty.recentList') })), recentChips.map(entry => {
                                                const selected = state.current?.provider === entry.provider
                                                    && state.current.model === entry.model;
                                                const row = choices.find(item => item.provider === entry.provider && item.modelId === entry.model);
                                                const providerName = entry.providerName ?? entry.provider;
                                                return (_jsx("button", { type: "button", className: `${css.option}${selected ? ` ${css.optionSelected}` : ''}`, disabled: busy || row === undefined, title: `${providerName} · ${entry.label} (${routeKey(entry.provider, entry.model)})`, onClick: () => { pickRecent(entry); }, children: _jsxs("span", { className: css.optionCopy, children: [_jsxs("span", { className: css.modelTitle, children: [_jsx("span", { className: css.recentName, children: entry.label }), row?.supportsImage === true ? (_jsx("span", { className: css.capabilityTag, children: t('capability.image') })) : null] }), _jsx("span", { className: css.modelMeta, children: providerName })] }) }, routeKey(entry.provider, entry.model)));
                                            })] })] })] }), effortChoices.length > 0 && (_jsxs("div", { className: css.effortSection, children: [_jsx("div", { className: css.effortTitle, children: t('effort.label') }), _jsx("div", { className: css.effortRow, children: effortChoices.map(level => (_jsx("button", { type: "button", className: `${css.effortChip}${effectiveEffort === level.effort ? ` ${css.effortChipSelected}` : ''}`, disabled: busy || state.current === null, onClick: () => { chooseEffort(level.effort); }, children: level.label }, level.key))) })] }))] })), toast !== null && (_jsx("div", { className: css.toast, role: "status", children: toast }))] }));
}
//# sourceMappingURL=ModelSearchSelect.js.map