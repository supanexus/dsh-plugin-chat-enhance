/** localStorage key for cross-session recent model picks. */
export declare const RECENT_MODELS_STORAGE_KEY = "supanexus-chat-enhance:recent";
/** One persisted recent model entry. */
export interface RecentModelEntry {
    readonly provider: string;
    readonly model: string;
    /** Display label captured at selection time. */
    readonly label: string;
    /** Provider display name captured at selection time (disambiguates same model labels). */
    readonly providerName?: string;
}
/**
 * Escape user input for use inside a RegExp.
 * @param value - raw search fragment.
 */
export declare function escapeRegExp(value: string): string;
/**
 * Case-insensitive multi-term match; whitespace-separated terms act as wildcards.
 * @param value - haystack.
 * @param query - user search string.
 */
export declare function matchesQuery(value: string, query: string): boolean;
/**
 * Read recent models from storage (migrates legacy keys once).
 * @param storage - storage backend (localStorage in browser).
 * @param key - storage key.
 */
export declare function readRecentModels(storage?: Pick<Storage, 'getItem' | 'setItem'> | undefined, key?: string): readonly RecentModelEntry[];
/**
 * Push one selection to the front of the recent list and persist.
 * @param entry - model route to remember.
 * @param maxRecent - cap on stored entries.
 * @param storage - storage backend.
 * @param key - storage key.
 */
export declare function pushRecentModel(entry: RecentModelEntry, maxRecent: number, storage?: Pick<Storage, 'getItem' | 'setItem'> | undefined, key?: string): readonly RecentModelEntry[];
//# sourceMappingURL=recent-models.d.ts.map