window.__ModuleLoader__.load({
	id: "@supanexus/dsh-plugin-chat-enhance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/shared/capabilities-contract.js
		/** Shared HTTP path + DTO for model capability lookups. */
		/** Batch capability probe (GET `?m=provider/model`). */
		const CAPABILITIES_PATH = "/api/chat-enhance.capabilities";
		//#endregion
		//#region lib/types/client/capabilities-wire.js
		/** Browser fetch for Host capability probe. */
		/**
		* Resolve image support for a batch of model routes.
		* @param models - provider/model pairs from the catalog.
		*/
		async function fetchCapabilities(models) {
			if (models.length === 0) return [];
			const params = new URLSearchParams();
			for (const item of models) params.append("m", `${item.provider}/${item.model}`);
			const response = await fetch(`${CAPABILITIES_PATH}?${params.toString()}`);
			const body = await response.json();
			if (!response.ok || body.ok !== true) throw new Error("ok" in body && body.ok === false && typeof body.message === "string" ? body.message : `capabilities HTTP ${response.status}`);
			return body.capabilities;
		}
		/** In-memory cache keyed by `provider/model`. */
		var CapabilityCache = class {
			map = /* @__PURE__ */ new Map();
			get(provider, model) {
				return this.map.get(`${provider}/${model}`);
			}
			snapshot() {
				return this.map;
			}
			async ensure(queries) {
				const missing = queries.filter((q) => !this.map.has(`${q.provider}/${q.model}`));
				if (missing.length === 0) return;
				const entries = await fetchCapabilities(missing);
				for (const entry of entries) this.map.set(`${entry.provider}/${entry.model}`, entry.supportsImage);
			}
		};
		//#endregion
		//#region lib/types/shared/recent-models.js
		/** localStorage key for cross-session recent model picks. */
		const RECENT_MODELS_STORAGE_KEY = "supanexus-chat-enhance:recent";
		const LEGACY_RECENT_KEYS = ["whale:chat-enhance:recent", "whale:model-search:recent"];
		/**
		* Escape user input for use inside a RegExp.
		* @param value - raw search fragment.
		*/
		function escapeRegExp(value) {
			return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		/**
		* Case-insensitive multi-term match; whitespace-separated terms act as wildcards.
		* @param value - haystack.
		* @param query - user search string.
		*/
		function matchesQuery(value, query) {
			const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
			if (terms.length === 0) return true;
			return new RegExp(terms.map(escapeRegExp).join(".*")).test(value.toLocaleLowerCase());
		}
		function parseRecentList(raw) {
			try {
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return [];
				return parsed.flatMap((item) => {
					if (item === null || typeof item !== "object") return [];
					const row = item;
					if (typeof row.provider !== "string" || typeof row.model !== "string") return [];
					const label = typeof row.label === "string" ? row.label : row.model;
					const providerName = typeof row.providerName === "string" ? row.providerName : void 0;
					return [{
						provider: row.provider,
						model: row.model,
						label,
						...providerName === void 0 ? {} : { providerName }
					}];
				});
			} catch {
				return [];
			}
		}
		/**
		* Read recent models from storage (migrates legacy keys once).
		* @param storage - storage backend (localStorage in browser).
		* @param key - storage key.
		*/
		function readRecentModels(storage = typeof localStorage === "undefined" ? void 0 : localStorage, key = RECENT_MODELS_STORAGE_KEY) {
			if (storage === void 0) return [];
			const current = storage.getItem(key);
			if (current !== null && current !== "") return parseRecentList(current);
			for (const legacyKey of LEGACY_RECENT_KEYS) {
				const legacy = storage.getItem(legacyKey);
				if (legacy === null || legacy === "") continue;
				const migrated = parseRecentList(legacy);
				try {
					storage.setItem(key, JSON.stringify(migrated));
				} catch {}
				return migrated;
			}
			return [];
		}
		/**
		* Push one selection to the front of the recent list and persist.
		* @param entry - model route to remember.
		* @param maxRecent - cap on stored entries.
		* @param storage - storage backend.
		* @param key - storage key.
		*/
		function pushRecentModel(entry, maxRecent, storage = typeof localStorage === "undefined" ? void 0 : localStorage, key = RECENT_MODELS_STORAGE_KEY) {
			if (storage === void 0) return [entry];
			const dedupeKey = `${entry.provider}/${entry.model}`;
			const next = [entry, ...readRecentModels(storage, key).filter((item) => `${item.provider}/${item.model}` !== dedupeKey)].slice(0, maxRecent);
			storage.setItem(key, JSON.stringify(next));
			return next;
		}
		//#endregion
		//#region lib/types/shared/model-picker.js
		/**
		* Flatten provider groups into searchable rows.
		* @param groups - loaded catalog groups.
		* @param current - active session selection.
		* @param imageSupport - optional map keyed by `provider/model`.
		*/
		function flattenModelChoices(groups, current, imageSupport) {
			const rows = [];
			for (const group of groups) for (const model of group.models) {
				const selected = current?.provider === group.id && current.model === model.id;
				const supportKey = `${group.id}/${model.id}`;
				const supportsImage = imageSupport?.get(supportKey);
				rows.push({
					provider: group.id,
					providerName: group.name,
					modelId: model.id,
					modelName: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					selection: {
						provider: group.id,
						model: model.id,
						...model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }
					},
					selected,
					...supportsImage === void 0 ? {} : { supportsImage }
				});
			}
			return rows;
		}
		/**
		* Filter model rows by a search query (provider, display name, model id).
		* @param rows - catalog rows.
		* @param query - user search string.
		*/
		function filterModelChoices(rows, query) {
			if (query.trim() === "") return rows;
			return rows.filter((row) => matchesQuery(`${row.providerName} ${row.modelName} ${row.modelId}`, query));
		}
		/**
		* Keep only rows known to support image input.
		* @param rows - catalog rows.
		* @param imageOnly - when true, drop non-image / unknown rows.
		*/
		function filterImageCapable(rows, imageOnly) {
			if (!imageOnly) return rows;
			return rows.filter((row) => row.supportsImage === true);
		}
		//#endregion
		//#region lib/types/shared/picker-ui-state.js
		/** Persist chat-enhance picker UI (query + provider tab) across open/close. */
		/** localStorage key for picker filter/search state. */
		const PICKER_UI_STORAGE_KEY = "supanexus-chat-enhance:picker-ui";
		const LEGACY_PICKER_KEYS = ["whale:chat-enhance:picker-ui", "whale:model-search:picker-ui"];
		const EMPTY = {
			query: "",
			providerFilter: null
		};
		function parseState(raw) {
			try {
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return EMPTY;
				const row = parsed;
				return {
					query: typeof row.query === "string" ? row.query : "",
					providerFilter: typeof row.providerFilter === "string" ? row.providerFilter : null
				};
			} catch {
				return EMPTY;
			}
		}
		/**
		* Read last picker UI state from storage (migrates legacy keys once).
		* @param storage - storage backend.
		* @param key - storage key.
		*/
		function readPickerUiState(storage = typeof localStorage === "undefined" ? void 0 : localStorage, key = PICKER_UI_STORAGE_KEY) {
			if (storage === void 0) return EMPTY;
			const current = storage.getItem(key);
			if (current !== null && current !== "") return parseState(current);
			for (const legacyKey of LEGACY_PICKER_KEYS) {
				const legacy = storage.getItem(legacyKey);
				if (legacy === null || legacy === "") continue;
				const migrated = parseState(legacy);
				try {
					storage.setItem(key, JSON.stringify(migrated));
				} catch {}
				return migrated;
			}
			return EMPTY;
		}
		/**
		* Persist picker UI state.
		* @param state - query + provider tab.
		* @param storage - storage backend.
		* @param key - storage key.
		*/
		function writePickerUiState(state, storage = typeof localStorage === "undefined" ? void 0 : localStorage, key = PICKER_UI_STORAGE_KEY) {
			if (storage === void 0) return;
			try {
				storage.setItem(key, JSON.stringify({
					query: state.query,
					providerFilter: state.providerFilter
				}));
			} catch {}
		}
		//#endregion
		//#region \0dsh-css:/Users/hivanpan/Hivan/project/ykl/project/Whale/whale-harness-free/plugins/packages/ui/dsh-plugin-chat-enhance/src/client/model-search-select.module.css.mjs
		const css$1 = ".FfBlaG_root{align-items:center;gap:4px;min-width:0;max-width:min(640px,72cqw);display:flex;position:relative}.FfBlaG_recentRow{flex:auto;align-items:center;gap:4px;min-width:0;display:flex;overflow:hidden}.FfBlaG_chip{min-width:0;max-width:100%;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;text-overflow:ellipsis;background:0 0;border:none;border-radius:24px;align-items:center;padding:0 10px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;overflow:hidden}.FfBlaG_chip:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.FfBlaG_chip:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.FfBlaG_chip:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}.FfBlaG_chipSelected{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.FfBlaG_expandButton{height:28px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:24px;flex:none;justify-content:center;align-items:center;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.FfBlaG_expandButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.FfBlaG_expandButton:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.FfBlaG_expandButton:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}.FfBlaG_panel{z-index:30;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:min(680px,100vw - 32px);max-height:min(420px,100vh - 96px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;padding:8px;display:flex;position:absolute;bottom:calc(100% + 8px);right:0;overflow:hidden}.FfBlaG_searchInput{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);border-radius:8px;outline:none;margin-bottom:8px;padding:8px 10px;font-size:13px;line-height:20px}.FfBlaG_searchInput:focus{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.FfBlaG_filterBar{flex:none;align-items:center;gap:12px;min-width:0;margin-bottom:8px;display:flex}.FfBlaG_providerTabs{flex:auto;align-items:center;gap:4px;min-width:0;padding-bottom:2px;display:flex;overflow-x:auto}.FfBlaG_providerTab{height:28px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:16px;flex:none;padding:0 10px;font-size:12px;font-weight:500;line-height:18px}.FfBlaG_providerTab:hover{background:var(--dsw-alias-interactive-bg-hover)}.FfBlaG_providerTab:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.FfBlaG_providerTabActive{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.FfBlaG_providerTabCount{font-variant-numeric:tabular-nums;opacity:.72;margin-left:4px}.FfBlaG_imageOnlyCheck{height:28px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;user-select:none;background:0 0;border:1px solid #0000;border-radius:16px;flex:none;align-items:center;gap:6px;margin-left:auto;padding:0 10px;font-size:12px;font-weight:500;line-height:18px;display:inline-flex}.FfBlaG_imageOnlyCheck:hover{background:var(--dsw-alias-interactive-bg-hover)}.FfBlaG_imageOnlyCheck:has(input:checked){border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.FfBlaG_imageOnlyCheck:has(input:focus-visible){box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.FfBlaG_imageOnlyCheck input{width:14px;height:14px;accent-color:var(--dsw-alias-label-primary);cursor:pointer;margin:0}.FfBlaG_panelBody{flex:auto;gap:0;min-height:0;display:flex}.FfBlaG_catalogPane{flex-direction:column;flex:1 1 0;min-width:0;min-height:0;display:flex;position:relative}.FfBlaG_catalogColumn{flex:auto;min-width:0;min-height:0;padding-right:4px;overflow-y:auto}.FfBlaG_backTop{z-index:2;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-menu);width:36px;height:36px;color:var(--dsw-alias-label-secondary);box-shadow:var(--dsw-shadow-lv2,0 4px 12px #0000001f);cursor:pointer;border-radius:50%;justify-content:center;align-items:center;padding:0;display:inline-flex;position:absolute;bottom:12px;right:12px}.FfBlaG_backTop:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.FfBlaG_backTop:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.FfBlaG_recentColumn{border-left:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:0 0 240px;min-width:0;min-height:0;margin-left:4px;padding-left:8px;display:flex}.FfBlaG_recentTitle{color:var(--dsw-alias-label-tertiary);flex:none;padding:5px 8px 6px;font-size:12px;font-weight:500;line-height:18px}.FfBlaG_recentList{flex:auto;min-height:0;overflow-y:auto}.FfBlaG_group+.FfBlaG_group{margin-top:4px}.FfBlaG_groupTitle{z-index:1;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-tertiary);padding:5px 8px 3px;font-size:12px;font-weight:500;line-height:18px;position:sticky;top:0}.FfBlaG_option{box-sizing:border-box;width:100%;min-height:38px;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:10px;align-items:center;gap:8px;padding:6px 8px;display:flex}.FfBlaG_option:hover:not(:disabled),.FfBlaG_option:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.FfBlaG_option:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}.FfBlaG_optionSelected{background:var(--dsw-alias-interactive-bg-hover)}.FfBlaG_optionCopy{flex-direction:column;flex:1;min-width:0;display:flex}.FfBlaG_modelName{text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;overflow:hidden}.FfBlaG_modelTitle{align-items:center;gap:6px;min-width:0;display:flex}.FfBlaG_capabilityTag{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:6px;flex:none;align-items:center;padding:0 6px;font-size:11px;font-weight:500;line-height:16px;display:inline-flex}.FfBlaG_recentName{overflow-wrap:anywhere;white-space:normal;word-break:break-word;font-size:14px;font-weight:500;line-height:20px}.FfBlaG_modelMeta{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}.FfBlaG_effortSection{border-top:1px solid var(--dsw-alias-border-l2);flex:none;margin-top:8px;padding-top:8px}.FfBlaG_effortTitle{color:var(--dsw-alias-label-tertiary);padding:0 8px 6px;font-size:12px;font-weight:500;line-height:18px}.FfBlaG_effortRow{flex-wrap:wrap;gap:6px;padding:0 4px 4px;display:flex}.FfBlaG_effortChip{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:16px;padding:0 10px;font-size:12px;line-height:18px}.FfBlaG_effortChip:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.FfBlaG_effortChipSelected{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.FfBlaG_status,.FfBlaG_empty{color:var(--dsw-alias-label-tertiary);padding:10px 8px;font-size:13px;line-height:20px}.FfBlaG_error,.FfBlaG_warning{border-radius:8px;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;padding:7px 8px;font-size:12px;line-height:18px;display:flex}.FfBlaG_error{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.FfBlaG_warning{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-state-warn-label)}.FfBlaG_retry{color:inherit;font:inherit;cursor:pointer;background:0 0;border:none;flex:none;padding:0;font-weight:600}.FfBlaG_toast{z-index:40;background:var(--dsw-alias-interactive-bg-hover-danger);max-width:min(320px,100vw - 32px);color:var(--dsw-alias-state-error-primary);border-radius:8px;padding:8px 10px;font-size:12px;line-height:18px;position:absolute;bottom:calc(100% + 8px);right:0}";
		const tagId$1 = "@supanexus/dsh-plugin-chat-enhance/model-search-select.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@supanexus/dsh-plugin-chat-enhance";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var model_search_select_module_css_default = {
			"backTop": "FfBlaG_backTop",
			"capabilityTag": "FfBlaG_capabilityTag",
			"catalogColumn": "FfBlaG_catalogColumn",
			"catalogPane": "FfBlaG_catalogPane",
			"chip": "FfBlaG_chip",
			"chipSelected": "FfBlaG_chipSelected",
			"effortChip": "FfBlaG_effortChip",
			"effortChipSelected": "FfBlaG_effortChipSelected",
			"effortRow": "FfBlaG_effortRow",
			"effortSection": "FfBlaG_effortSection",
			"effortTitle": "FfBlaG_effortTitle",
			"empty": "FfBlaG_empty",
			"error": "FfBlaG_error",
			"expandButton": "FfBlaG_expandButton",
			"filterBar": "FfBlaG_filterBar",
			"group": "FfBlaG_group",
			"groupTitle": "FfBlaG_groupTitle",
			"imageOnlyCheck": "FfBlaG_imageOnlyCheck",
			"modelMeta": "FfBlaG_modelMeta",
			"modelName": "FfBlaG_modelName",
			"modelTitle": "FfBlaG_modelTitle",
			"option": "FfBlaG_option",
			"optionCopy": "FfBlaG_optionCopy",
			"optionSelected": "FfBlaG_optionSelected",
			"panel": "FfBlaG_panel",
			"panelBody": "FfBlaG_panelBody",
			"providerTab": "FfBlaG_providerTab",
			"providerTabActive": "FfBlaG_providerTabActive",
			"providerTabCount": "FfBlaG_providerTabCount",
			"providerTabs": "FfBlaG_providerTabs",
			"recentColumn": "FfBlaG_recentColumn",
			"recentList": "FfBlaG_recentList",
			"recentName": "FfBlaG_recentName",
			"recentRow": "FfBlaG_recentRow",
			"recentTitle": "FfBlaG_recentTitle",
			"retry": "FfBlaG_retry",
			"root": "FfBlaG_root",
			"searchInput": "FfBlaG_searchInput",
			"status": "FfBlaG_status",
			"toast": "FfBlaG_toast",
			"warning": "FfBlaG_warning"
		};
		//#endregion
		//#region lib/types/client/ModelSearchSelect.js
		/**
		* Searchable model picker with recent-model quick chips for the composer seat.
		*/
		const DEFAULT_MAX_RECENT = 8;
		/** Show the back-to-top control after the catalog scrolls past this many pixels. */
		const BACK_TOP_THRESHOLD = 80;
		function routeKey(provider, model) {
			return `${provider}/${model}`;
		}
		function BackTopIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				"aria-hidden": "true",
				children: (0, react_jsx_runtime.jsx)("path", {
					d: "M8 3.2 3.6 7.6l1.1 1.1L7.2 6.2V13h1.6V6.2l2.5 2.5 1.1-1.1L8 3.2Z",
					fill: "currentColor"
				})
			});
		}
		/**
		* Keep render crashes inside this occupant so the slot framework does not
		* abdicate back to the official ModelSelect.
		*/
		var ModelSearchBoundary = class extends react.Component {
			state = { message: null };
			static getDerivedStateFromError(error) {
				return { message: error instanceof Error ? error.message : String(error) };
			}
			componentDidCatch(error, info) {
				console.error("[supanexus-chat-enhance] render crash", error, info.componentStack);
			}
			render() {
				if (this.state.message !== null) return (0, react_jsx_runtime.jsx)("div", {
					"data-snx-chat-enhance": "error",
					className: model_search_select_module_css_default.chip,
					title: this.state.message,
					children: "SupaNexus chat enhance"
				});
				return this.props.children;
			}
		};
		/**
		* Render the composer model seat with recent chips and a searchable picker panel.
		*/
		function ModelSearchSelect(props) {
			return (0, react_jsx_runtime.jsx)(ModelSearchBoundary, { children: (0, react_jsx_runtime.jsx)(ModelSearchSelectInner, { ...props }) });
		}
		function ModelSearchSelectInner({ locked, available, directory, load, select, capabilityCache, useInput, t }) {
			const state = (0, react.useSyncExternalStore)((fn) => directory.subscribe(fn), () => directory.getSnapshot());
			const [open, setOpen] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)(() => readPickerUiState().query);
			const [providerFilter, setProviderFilter] = (0, react.useState)(() => readPickerUiState().providerFilter);
			const [imageOnly, setImageOnly] = (0, react.useState)(false);
			const [capVersion, setCapVersion] = (0, react.useState)(0);
			const [recent, setRecent] = (0, react.useState)(() => readRecentModels());
			const [toast, setToast] = (0, react.useState)(null);
			const [showBackTop, setShowBackTop] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const searchRef = (0, react.useRef)(null);
			const catalogRef = (0, react.useRef)(null);
			const panelId = (0, react.useId)();
			const draftImageCount = useInput?.((s) => s.imageIds.length) ?? 0;
			const draftImageCountRef = (0, react.useRef)(draftImageCount);
			draftImageCountRef.current = draftImageCount;
			(0, react.useEffect)(() => {
				if (state.status !== "ready" || state.groups.length === 0) return;
				const queries = state.groups.flatMap((group) => group.models.map((model) => ({
					provider: group.id,
					model: model.id
				})));
				capabilityCache.ensure(queries).then(() => {
					setCapVersion((value) => value + 1);
				}).catch(() => {});
			}, [
				capabilityCache,
				state.groups,
				state.status
			]);
			const choices = (0, react.useMemo)(() => flattenModelChoices(state.groups, state.current, capabilityCache.snapshot()), [
				capabilityCache,
				capVersion,
				state.groups,
				state.current
			]);
			const providerTabs = (0, react.useMemo)(() => state.groups.map((group) => ({
				id: group.id,
				name: group.name,
				count: group.models.length
			})), [state.groups]);
			const allProviderCount = (0, react.useMemo)(() => providerTabs.reduce((sum, tab) => sum + tab.count, 0), [providerTabs]);
			const filtered = (0, react.useMemo)(() => {
				return filterImageCapable(filterModelChoices(choices, query), imageOnly);
			}, [
				choices,
				imageOnly,
				query
			]);
			const filteredGroups = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				for (const row of filtered) {
					if (providerFilter !== null && row.provider !== providerFilter) continue;
					const group = map.get(row.provider);
					if (group === void 0) map.set(row.provider, {
						id: row.provider,
						name: row.providerName,
						rows: [row]
					});
					else group.rows = [...group.rows, row];
				}
				return [...map.values()];
			}, [filtered, providerFilter]);
			const currentChoice = choices.find((row) => row.selected);
			const reasoning = currentChoice === void 0 ? void 0 : state.groups.find((group) => group.id === currentChoice.provider)?.models.find((model) => model.id === currentChoice.modelId)?.reasoning;
			const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
			const effortChoices = (0, react.useMemo)(() => {
				if (reasoning === void 0) return [];
				return [...reasoning.defaultEffort === void 0 ? [{
					key: "provider-default",
					effort: void 0,
					label: t("effort.providerDefault")
				}] : [], ...reasoning.efforts.map((effort) => ({
					key: `effort:${effort.id}`,
					effort: effort.id,
					label: effort.name
				}))];
			}, [reasoning, t]);
			const labelOf = (0, react.useCallback)((provider, model, fallback) => {
				return choices.find((item) => item.provider === provider && item.modelId === model)?.modelName ?? fallback;
			}, [choices]);
			const providerNameOf = (0, react.useCallback)((provider, fallback) => {
				return choices.find((item) => item.provider === provider)?.providerName ?? fallback ?? provider;
			}, [choices]);
			const recentChips = (0, react.useMemo)(() => {
				const seen = /* @__PURE__ */ new Set();
				const chips = [];
				const push = (entry) => {
					const key = routeKey(entry.provider, entry.model);
					if (seen.has(key)) return;
					seen.add(key);
					chips.push({
						provider: entry.provider,
						model: entry.model,
						label: labelOf(entry.provider, entry.model, entry.label),
						providerName: providerNameOf(entry.provider, entry.providerName)
					});
				};
				for (const entry of recent.slice(0, DEFAULT_MAX_RECENT)) push(entry);
				if (state.current !== null) push({
					provider: state.current.provider,
					model: state.current.model,
					label: labelOf(state.current.provider, state.current.model, `${state.current.provider}/${state.current.model}`),
					providerName: providerNameOf(state.current.provider)
				});
				if (chips.length === 0 && currentChoice !== void 0) push({
					provider: currentChoice.provider,
					model: currentChoice.modelId,
					label: currentChoice.modelName,
					providerName: currentChoice.providerName
				});
				return chips;
			}, [
				recent,
				state.current,
				labelOf,
				providerNameOf,
				currentChoice
			]);
			const reload = (0, react.useCallback)(() => {
				load();
			}, [load]);
			const close = (0, react.useCallback)((restoreFocus = false) => {
				setOpen(false);
				setShowBackTop(false);
				writePickerUiState({
					query,
					providerFilter
				});
				if (restoreFocus) queueMicrotask(() => {
					rootRef.current?.querySelector("button")?.focus();
				});
			}, [providerFilter, query]);
			const remember = (0, react.useCallback)((provider, model, label, providerName) => {
				setRecent(pushRecentModel({
					provider,
					model,
					label,
					...providerName === void 0 ? {} : { providerName }
				}, DEFAULT_MAX_RECENT));
			}, []);
			const settleSelection = (0, react.useCallback)((accepted, label, selection) => {
				if (accepted) {
					remember(selection.provider, selection.model, label, providerNameOf(selection.provider));
					close(true);
					return;
				}
				const message = directory.getSnapshot().error;
				if (message !== null) setToast(t("error.action", { message }));
			}, [
				close,
				directory,
				providerNameOf,
				remember,
				t
			]);
			const choose = (0, react.useCallback)((selection, label) => {
				if (state.current?.provider === selection.provider && state.current.model === selection.model && state.current.reasoningEffort === selection.reasoningEffort) {
					close(true);
					return;
				}
				if (!(capabilityCache.get(selection.provider, selection.model) === true) && draftImageCountRef.current > 0) setToast(t("warn.modelNoImage"));
				select(selection).then((accepted) => {
					settleSelection(accepted, label, selection);
				});
			}, [
				capabilityCache,
				close,
				select,
				settleSelection,
				state.current,
				t
			]);
			const chooseEffort = (0, react.useCallback)((effort) => {
				if (state.current === null) return;
				const label = labelOf(state.current.provider, state.current.model, state.current.model);
				const selection = {
					provider: state.current.provider,
					model: state.current.model,
					...effort === void 0 ? {} : { reasoningEffort: effort }
				};
				choose(selection, label);
			}, [
				choose,
				labelOf,
				state.current
			]);
			const openPanel = (0, react.useCallback)(() => {
				const saved = readPickerUiState();
				setQuery(saved.query);
				setProviderFilter(saved.providerFilter);
				setRecent(readRecentModels());
				setOpen(true);
				reload();
			}, [reload]);
			const pickRecent = (0, react.useCallback)((entry) => {
				const row = choices.find((item) => item.provider === entry.provider && item.modelId === entry.model);
				if (row === void 0) return;
				choose(row.selection, row.modelName);
			}, [choices, choose]);
			(0, react.useEffect)(() => {
				writePickerUiState({
					query,
					providerFilter
				});
			}, [providerFilter, query]);
			(0, react.useEffect)(() => {
				if (!open) return;
				if (providerFilter === null) return;
				if (!providerTabs.some((tab) => tab.id === providerFilter)) setProviderFilter(null);
			}, [
				open,
				providerFilter,
				providerTabs
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (!rootRef.current?.contains(event.target)) close();
				};
				document.addEventListener("mousedown", closeOutside);
				return () => {
					document.removeEventListener("mousedown", closeOutside);
				};
			}, [close, open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				queueMicrotask(() => {
					searchRef.current?.focus();
				});
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const el = catalogRef.current;
				if (el === null) return;
				const onScroll = () => {
					setShowBackTop(el.scrollTop > BACK_TOP_THRESHOLD);
				};
				onScroll();
				el.addEventListener("scroll", onScroll, { passive: true });
				return () => {
					el.removeEventListener("scroll", onScroll);
				};
			}, [open, filteredGroups.length]);
			const scrollCatalogTop = (0, react.useCallback)(() => {
				const el = catalogRef.current;
				if (el === null) return;
				el.scrollTo({
					top: 0,
					behavior: "smooth"
				});
			}, []);
			const selectProviderTab = (0, react.useCallback)((providerId) => {
				setProviderFilter(providerId);
				setShowBackTop(false);
				queueMicrotask(() => {
					const el = catalogRef.current;
					if (el !== null) el.scrollTop = 0;
				});
			}, []);
			const onRootKeyDown = (event) => {
				if (event.key === "Escape" && open) {
					event.preventDefault();
					close(true);
				}
			};
			if (!available) return null;
			const busy = state.status === "selecting";
			const waiting = state.current === null && state.status === "loading";
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: model_search_select_module_css_default.root,
				"data-snx-chat-enhance": "ready",
				onKeyDown: onRootKeyDown,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: model_search_select_module_css_default.recentRow,
						children: (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${model_search_select_module_css_default.chip} ${model_search_select_module_css_default.chipSelected}`,
							disabled: locked || waiting,
							title: currentChoice === void 0 ? void 0 : `${currentChoice.providerName} · ${currentChoice.modelName}`,
							onClick: () => {
								if (open) close(true);
								else openPanel();
							},
							children: waiting ? t("status.loading") : currentChoice?.modelName ?? t("empty.recent")
						})
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: model_search_select_module_css_default.expandButton,
						"aria-label": t("expand.aria"),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						"aria-controls": open ? panelId : void 0,
						disabled: locked,
						onClick: () => {
							if (open) close(true);
							else openPanel();
						},
						children: t("expand.label")
					}),
					open && (0, react_jsx_runtime.jsxs)("div", {
						id: panelId,
						className: model_search_select_module_css_default.panel,
						role: "dialog",
						"aria-label": t("picker.aria"),
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								ref: searchRef,
								className: model_search_select_module_css_default.searchInput,
								type: "search",
								value: query,
								placeholder: t("search.placeholder"),
								"aria-label": t("search.aria"),
								disabled: busy,
								onChange: (event) => {
									setQuery(event.target.value);
								},
								onKeyDown: (event) => {
									if (event.key === "ArrowDown" || event.key === "ArrowUp") event.stopPropagation();
								}
							}),
							providerTabs.length > 0 && (0, react_jsx_runtime.jsxs)("div", {
								className: model_search_select_module_css_default.filterBar,
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: model_search_select_module_css_default.providerTabs,
									role: "tablist",
									"aria-label": t("provider.tabs.aria"),
									children: [(0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "tab",
										"aria-selected": providerFilter === null,
										className: `${model_search_select_module_css_default.providerTab}${providerFilter === null ? ` ${model_search_select_module_css_default.providerTabActive}` : ""}`,
										onClick: () => {
											selectProviderTab(null);
										},
										children: [t("provider.all"), (0, react_jsx_runtime.jsx)("span", {
											className: model_search_select_module_css_default.providerTabCount,
											children: allProviderCount
										})]
									}), providerTabs.map((tab) => (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "tab",
										"aria-selected": providerFilter === tab.id,
										className: `${model_search_select_module_css_default.providerTab}${providerFilter === tab.id ? ` ${model_search_select_module_css_default.providerTabActive}` : ""}`,
										title: `${tab.name} (${String(tab.count)})`,
										onClick: () => {
											selectProviderTab(tab.id);
										},
										children: [tab.name, (0, react_jsx_runtime.jsx)("span", {
											className: model_search_select_module_css_default.providerTabCount,
											children: tab.count
										})]
									}, tab.id))]
								}), (0, react_jsx_runtime.jsxs)("label", {
									className: model_search_select_module_css_default.imageOnlyCheck,
									title: t("filter.imageOnly.aria"),
									children: [(0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: imageOnly,
										"aria-label": t("filter.imageOnly.aria"),
										onChange: (event) => {
											setImageOnly(event.target.checked);
										}
									}), (0, react_jsx_runtime.jsx)("span", { children: t("filter.imageOnly") })]
								})]
							}),
							state.status === "loading" && (0, react_jsx_runtime.jsx)("div", {
								className: model_search_select_module_css_default.status,
								children: t("status.loading")
							}),
							state.error !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: model_search_select_module_css_default.error,
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("error.action", { message: state.error }) }), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: model_search_select_module_css_default.retry,
									onClick: reload,
									children: t("retry")
								})]
							}),
							state.failures.map((failure) => (0, react_jsx_runtime.jsxs)("div", {
								className: model_search_select_module_css_default.warning,
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("warning.groupLoad", {
									name: failure.name,
									message: failure.message
								}) }), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: model_search_select_module_css_default.retry,
									onClick: reload,
									children: t("retry")
								})]
							}, failure.id)),
							(0, react_jsx_runtime.jsxs)("div", {
								className: model_search_select_module_css_default.panelBody,
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: model_search_select_module_css_default.catalogPane,
									children: [(0, react_jsx_runtime.jsxs)("div", {
										ref: catalogRef,
										className: `${model_search_select_module_css_default.catalogColumn} scrollable`,
										children: [filteredGroups.map((group) => (0, react_jsx_runtime.jsxs)("section", {
											className: model_search_select_module_css_default.group,
											children: [providerFilter === null && (0, react_jsx_runtime.jsx)("div", {
												className: model_search_select_module_css_default.groupTitle,
												children: group.name
											}), group.rows.map((row) => (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: `${model_search_select_module_css_default.option}${row.selected ? ` ${model_search_select_module_css_default.optionSelected}` : ""}`,
												disabled: busy,
												onClick: () => {
													choose(row.selection, row.modelName);
												},
												children: (0, react_jsx_runtime.jsxs)("span", {
													className: model_search_select_module_css_default.optionCopy,
													children: [(0, react_jsx_runtime.jsxs)("span", {
														className: model_search_select_module_css_default.modelTitle,
														children: [(0, react_jsx_runtime.jsx)("span", {
															className: model_search_select_module_css_default.modelName,
															children: row.modelName
														}), row.supportsImage === true ? (0, react_jsx_runtime.jsx)("span", {
															className: model_search_select_module_css_default.capabilityTag,
															children: t("capability.image")
														}) : null]
													}), (0, react_jsx_runtime.jsx)("span", {
														className: model_search_select_module_css_default.modelMeta,
														children: row.modelId
													})]
												})
											}, routeKey(row.provider, row.modelId)))]
										}, group.id)), state.status === "ready" && filteredGroups.length === 0 && (0, react_jsx_runtime.jsx)("div", {
											className: model_search_select_module_css_default.empty,
											children: t("empty.models")
										})]
									}), showBackTop && (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: model_search_select_module_css_default.backTop,
										"aria-label": t("backToTop.aria"),
										title: t("backToTop.aria"),
										onClick: scrollCatalogTop,
										children: (0, react_jsx_runtime.jsx)(BackTopIcon, {})
									})]
								}), (0, react_jsx_runtime.jsxs)("aside", {
									className: model_search_select_module_css_default.recentColumn,
									"aria-label": t("recent.title"),
									children: [(0, react_jsx_runtime.jsx)("div", {
										className: model_search_select_module_css_default.recentTitle,
										children: t("recent.title")
									}), (0, react_jsx_runtime.jsxs)("div", {
										className: `${model_search_select_module_css_default.recentList} scrollable`,
										children: [recentChips.length === 0 && (0, react_jsx_runtime.jsx)("div", {
											className: model_search_select_module_css_default.empty,
											children: t("empty.recentList")
										}), recentChips.map((entry) => {
											const selected = state.current?.provider === entry.provider && state.current.model === entry.model;
											const row = choices.find((item) => item.provider === entry.provider && item.modelId === entry.model);
											const providerName = entry.providerName ?? entry.provider;
											return (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: `${model_search_select_module_css_default.option}${selected ? ` ${model_search_select_module_css_default.optionSelected}` : ""}`,
												disabled: busy || row === void 0,
												title: `${providerName} · ${entry.label} (${routeKey(entry.provider, entry.model)})`,
												onClick: () => {
													pickRecent(entry);
												},
												children: (0, react_jsx_runtime.jsxs)("span", {
													className: model_search_select_module_css_default.optionCopy,
													children: [(0, react_jsx_runtime.jsxs)("span", {
														className: model_search_select_module_css_default.modelTitle,
														children: [(0, react_jsx_runtime.jsx)("span", {
															className: model_search_select_module_css_default.recentName,
															children: entry.label
														}), row?.supportsImage === true ? (0, react_jsx_runtime.jsx)("span", {
															className: model_search_select_module_css_default.capabilityTag,
															children: t("capability.image")
														}) : null]
													}), (0, react_jsx_runtime.jsx)("span", {
														className: model_search_select_module_css_default.modelMeta,
														children: providerName
													})]
												})
											}, routeKey(entry.provider, entry.model));
										})]
									})]
								})]
							}),
							effortChoices.length > 0 && (0, react_jsx_runtime.jsxs)("div", {
								className: model_search_select_module_css_default.effortSection,
								children: [(0, react_jsx_runtime.jsx)("div", {
									className: model_search_select_module_css_default.effortTitle,
									children: t("effort.label")
								}), (0, react_jsx_runtime.jsx)("div", {
									className: model_search_select_module_css_default.effortRow,
									children: effortChoices.map((level) => (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${model_search_select_module_css_default.effortChip}${effectiveEffort === level.effort ? ` ${model_search_select_module_css_default.effortChipSelected}` : ""}`,
										disabled: busy || state.current === null,
										onClick: () => {
											chooseEffort(level.effort);
										},
										children: level.label
									}, level.key))
								})]
							})
						]
					}),
					toast !== null && (0, react_jsx_runtime.jsx)("div", {
						className: model_search_select_module_css_default.toast,
						role: "status",
						children: toast
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/hivanpan/Hivan/project/ykl/project/Whale/whale-harness-free/plugins/packages/ui/dsh-plugin-chat-enhance/src/client/attach-image.module.css.mjs
		const css = ".kqCGmG_wrap{flex:none;align-items:center;display:inline-flex}.kqCGmG_hidden{clip:rect(0, 0, 0, 0);border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.kqCGmG_button{box-sizing:border-box;width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;justify-content:center;align-items:center;padding:0;display:inline-flex}.kqCGmG_button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.kqCGmG_button:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.kqCGmG_button:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}";
		const tagId = "@supanexus/dsh-plugin-chat-enhance/attach-image.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@supanexus/dsh-plugin-chat-enhance";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var attach_image_module_css_default = {
			"button": "kqCGmG_button",
			"hidden": "kqCGmG_hidden",
			"wrap": "kqCGmG_wrap"
		};
		//#endregion
		//#region lib/types/client/AttachImageButton.js
		/**
		* Composer left-slot: pick images into the official draft attachment rail.
		*/
		function PaperclipIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				"aria-hidden": "true",
				children: (0, react_jsx_runtime.jsx)("path", {
					d: "M10.2 3.4 4.6 9c-1.3 1.3-1.3 3.4 0 4.7s3.4 1.3 4.7 0l4.8-4.8a2.5 2.5 0 0 0-3.5-3.5L5.3 10.7a.9.9 0 1 0 1.3 1.3l5.3-5.3.9.9-5.3 5.3a2.2 2.2 0 1 1-3.1-3.1l5.3-5.3a3.8 3.8 0 0 1 5.4 5.4L9.3 15.4c-2 2-5.3 2-7.3 0s-2-5.3 0-7.3l5.6-5.6.9.9Z",
					fill: "currentColor"
				})
			});
		}
		/**
		* Upload control for vision-capable models (official createDraftImages path).
		*/
		function AttachImageButton({ useInput, inputActions, useProjection, capabilityCache, conversationCtx, t }) {
			const input = useInput((state) => state);
			const imageLimits = useProjection("imageLimits");
			const modelSelection = useProjection("modelSelection");
			const current = modelSelection?.next ?? modelSelection?.lastUsed ?? null;
			const [, setTick] = (0, react.useState)(0);
			const fileRef = (0, react.useRef)(null);
			const inputId = (0, react.useId)();
			(0, react.useEffect)(() => {
				if (current === null) return;
				capabilityCache.ensure([current]).then(() => {
					setTick((value) => value + 1);
				}).catch(() => {});
			}, [capabilityCache, current]);
			const supportsImage = current === null ? false : capabilityCache.get(current.provider, current.model) === true;
			const canUpload = !(input.phase === "adjudicating" || input.phase === "submitting") && imageLimits !== void 0 && supportsImage && inputActions !== void 0;
			const title = imageLimits === void 0 ? t("upload.unavailable") : supportsImage ? t("upload.aria") : t("upload.disabled");
			const intake = (0, react.useCallback)((files) => {
				if (inputActions === void 0 || files.length === 0) return;
				const conversation = conversationCtx.get("conversation");
				try {
					const images = conversation.createDraftImages(files);
					if (!inputActions.addImages(images.map((image) => image.id))) conversation.releaseDraftImages(images);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					console.warn("[supanexus-chat-enhance] upload failed", message);
				}
			}, [conversationCtx, inputActions]);
			const onChange = (event) => {
				const list = event.target.files;
				if (list === null || list.length === 0) return;
				intake([...list]);
				event.target.value = "";
			};
			return (0, react_jsx_runtime.jsxs)("span", {
				className: attach_image_module_css_default.wrap,
				children: [(0, react_jsx_runtime.jsx)("input", {
					id: inputId,
					ref: fileRef,
					className: attach_image_module_css_default.hidden,
					type: "file",
					accept: "image/png,image/jpeg,image/webp,image/gif",
					multiple: true,
					disabled: !canUpload,
					onChange
				}), (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: attach_image_module_css_default.button,
					disabled: !canUpload,
					title,
					"aria-label": title,
					onClick: () => {
						fileRef.current?.click();
					},
					children: (0, react_jsx_runtime.jsx)(PaperclipIcon, {})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `chatEnhance` namespace dictionaries. */
		const zh = {
			"search.placeholder": "搜索模型或提供方…",
			"search.aria": "搜索模型",
			"picker.aria": "模型选择",
			"expand.aria": "更换模型",
			"expand.label": "更换",
			"recent.aria": "最近使用的模型：{model}",
			"recent.title": "最近使用",
			"backToTop.aria": "回到顶部",
			"provider.all": "全部",
			"provider.tabs.aria": "按提供方筛选",
			"filter.imageOnly": "仅图片",
			"filter.imageOnly.aria": "只显示支持图片的模型",
			"capability.image": "图片",
			"warn.modelNoImage": "当前模型不支持图片，请切换支持图片的模型",
			"upload.aria": "上传图片",
			"upload.disabled": "当前模型不支持图片",
			"upload.unavailable": "附件服务不可用",
			"upload.failed": "图片添加失败：{message}",
			"empty.models": "没有匹配的模型。",
			"empty.recent": "选择模型",
			"empty.recentList": "暂无最近使用",
			"status.loading": "正在加载模型…",
			"error.action": "模型操作失败：{message}",
			"retry": "重试",
			"warning.groupLoad": "{name} 加载失败：{message}",
			"effort.label": "推理等级",
			"effort.providerDefault": "Default"
		};
		const en = {
			"search.placeholder": "Search models or providers…",
			"search.aria": "Search models",
			"picker.aria": "Model picker",
			"expand.aria": "Change model",
			"expand.label": "Change",
			"recent.aria": "Recent model: {model}",
			"recent.title": "Recent",
			"backToTop.aria": "Back to top",
			"provider.all": "All",
			"provider.tabs.aria": "Filter by provider",
			"filter.imageOnly": "Images only",
			"filter.imageOnly.aria": "Show only models that accept images",
			"capability.image": "Image",
			"warn.modelNoImage": "This model does not support images. Switch to a vision model.",
			"upload.aria": "Upload image",
			"upload.disabled": "Current model does not support images",
			"upload.unavailable": "Attachment service unavailable",
			"upload.failed": "Could not add image: {message}",
			"empty.models": "No matching models.",
			"empty.recent": "Select model",
			"empty.recentList": "No recent models",
			"status.loading": "Loading models…",
			"error.action": "Model operation failed: {message}",
			"retry": "Retry",
			"warning.groupLoad": "{name} failed to load: {message}",
			"effort.label": "Reasoning effort",
			"effort.providerDefault": "Default"
		};
		//#endregion
		//#region lib/types/client/register.js
		/** Register searchable model picker + image upload on composer seats. */
		const NS = "chatEnhance";
		/** Shared across picker + upload so Vision tags and the paperclip stay in sync. */
		const capabilityCache = new CapabilityCache();
		/** Empty directory snapshot used when seat inject fails (keeps our entry from aborting). */
		function fallbackInjected(message) {
			const snapshot = {
				current: null,
				groups: [],
				failures: [],
				status: "error",
				error: message
			};
			return {
				available: true,
				directory: {
					subscribe: () => () => {},
					getSnapshot: () => snapshot,
					update: () => {},
					set: () => {}
				},
				load: () => {},
				select: async () => false
			};
		}
		/**
		* Mount locale dictionaries, model seat, and image upload control.
		*/
		function registerChatEnhance(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "supanexus-chat-enhance: dictionaries");
			ctx.effect(() => ctx.slots.onEntryError((key, entry, error, info) => {
				if (key !== "conversation.input.model" && key !== "conversation.input.left") return;
				if (entry.registrant !== "@supanexus/dsh-plugin-chat-enhance") return;
				console.error("[supanexus-chat-enhance] slot entry error", {
					key,
					abdicated: info.abdicated,
					error
				});
			}), "supanexus-chat-enhance: entry-error");
			ctx.inject([
				"slots",
				"modelDirectories",
				"sessions",
				"remote",
				"remote.session",
				"conversation"
			], (scope) => {
				const models = scope.modelDirectories;
				const sessions = scope.sessions;
				console.info("[supanexus-chat-enhance] registering conversation.input.model + left upload");
				scope.slots.inject("conversation.input.model", function* () {
					yield scope.slots.register({
						name: "conversation.input.model",
						locale: NS,
						priority: -1,
						registrant: "@supanexus/dsh-plugin-chat-enhance",
						inject: (sessionId) => {
							try {
								const directory = models.directoryFor(sessionId);
								const available = sessions.subagentAddress(sessionId) === void 0;
								return {
									available,
									directory: directory.store,
									capabilityCache,
									load: () => {
										if (available) directory.load().catch(() => {});
									},
									select: (selection) => available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false)
								};
							} catch (error) {
								console.error("[supanexus-chat-enhance] seat inject failed", error);
								return {
									...fallbackInjected(error instanceof Error ? error.message : String(error)),
									capabilityCache
								};
							}
						}
					}, ModelSearchSelect);
				});
				scope.slots.inject("conversation.input.left", function* () {
					yield scope.slots.register({
						name: "conversation.input.left",
						id: "chat-enhance-upload",
						order: 20,
						locale: NS,
						label: "Upload",
						registrant: "@supanexus/dsh-plugin-chat-enhance",
						inject: () => ({
							capabilityCache,
							conversationCtx: scope
						})
					}, AttachImageButton);
				});
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		/** SupaNexus chat enhance client plugin. */
		/**
		* Required client services.
		* `remote` / `remote.session` are required because `directory.load()` /
		* `directory.select()` run on this fiber and touch the session remotes
		* (same as official ui-model-selection). `modelDirectories` stays nested.
		* `conversation` is required for draft image intake on the upload button.
		*/
		const inject = [
			"locale",
			"sessions",
			"slots",
			"remote",
			"remote.session",
			"conversation"
		];
		/**
		* Register searchable model picker + image upload UI.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			console.info("[supanexus-chat-enhance] client apply");
			registerChatEnhance(ctx);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map