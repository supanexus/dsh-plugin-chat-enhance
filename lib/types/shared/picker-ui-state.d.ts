/** Persist chat-enhance picker UI (query + provider tab) across open/close. */
/** localStorage key for picker filter/search state. */
export declare const PICKER_UI_STORAGE_KEY = "supanexus-chat-enhance:picker-ui";
/** Last search box + provider tab selection. */
export interface PickerUiState {
    readonly query: string;
    /** `null` means “All” tab. */
    readonly providerFilter: string | null;
}
/**
 * Read last picker UI state from storage (migrates legacy keys once).
 * @param storage - storage backend.
 * @param key - storage key.
 */
export declare function readPickerUiState(storage?: Pick<Storage, 'getItem' | 'setItem'> | undefined, key?: string): PickerUiState;
/**
 * Persist picker UI state.
 * @param state - query + provider tab.
 * @param storage - storage backend.
 * @param key - storage key.
 */
export declare function writePickerUiState(state: PickerUiState, storage?: Pick<Storage, 'setItem'> | undefined, key?: string): void;
//# sourceMappingURL=picker-ui-state.d.ts.map