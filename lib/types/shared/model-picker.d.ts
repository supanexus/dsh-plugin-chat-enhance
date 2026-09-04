import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
/** Minimal directory snapshot shape used by the picker UI. */
export interface ModelGroupSnapshot {
    readonly id: string;
    readonly name: string;
    readonly models: readonly {
        readonly id: string;
        readonly name: string;
        readonly description?: string;
        readonly reasoning?: {
            readonly defaultEffort?: string;
            readonly efforts: readonly {
                readonly id: string;
                readonly name: string;
            }[];
        };
    }[];
}
/** One flattened selectable row in the picker. */
export interface ModelChoiceRow {
    readonly provider: string;
    readonly providerName: string;
    readonly modelId: string;
    readonly modelName: string;
    readonly description?: string;
    readonly selection: ModelSelection;
    readonly selected: boolean;
    /** True when Host reported image input; undefined while unknown. */
    readonly supportsImage?: boolean;
}
/**
 * Flatten provider groups into searchable rows.
 * @param groups - loaded catalog groups.
 * @param current - active session selection.
 * @param imageSupport - optional map keyed by `provider/model`.
 */
export declare function flattenModelChoices(groups: readonly ModelGroupSnapshot[], current: ModelSelection | null, imageSupport?: ReadonlyMap<string, boolean>): readonly ModelChoiceRow[];
/**
 * Filter model rows by a search query (provider, display name, model id).
 * @param rows - catalog rows.
 * @param query - user search string.
 */
export declare function filterModelChoices(rows: readonly ModelChoiceRow[], query: string): readonly ModelChoiceRow[];
/**
 * Keep only rows known to support image input.
 * @param rows - catalog rows.
 * @param imageOnly - when true, drop non-image / unknown rows.
 */
export declare function filterImageCapable(rows: readonly ModelChoiceRow[], imageOnly: boolean): readonly ModelChoiceRow[];
/** Injected business face of the composer model seat (mirrors ui-model-selection). */
export interface ModelSelectInjected {
    readonly available: boolean;
    readonly directory: SnapshotStore<{
        readonly current: ModelSelection | null;
        readonly groups: readonly ModelGroupSnapshot[];
        readonly failures: readonly {
            readonly id: string;
            readonly name: string;
            readonly message: string;
        }[];
        readonly status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error';
        readonly error: string | null;
    }>;
    readonly load: () => void;
    readonly select: (selection: ModelSelection) => Promise<boolean>;
}
//# sourceMappingURL=model-picker.d.ts.map