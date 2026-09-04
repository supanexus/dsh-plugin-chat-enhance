import { matchesQuery } from "./recent-models.js";
/**
 * Flatten provider groups into searchable rows.
 * @param groups - loaded catalog groups.
 * @param current - active session selection.
 * @param imageSupport - optional map keyed by `provider/model`.
 */
export function flattenModelChoices(groups, current, imageSupport) {
    const rows = [];
    for (const group of groups) {
        for (const model of group.models) {
            const selected = current?.provider === group.id && current.model === model.id;
            const supportKey = `${group.id}/${model.id}`;
            const supportsImage = imageSupport?.get(supportKey);
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
            });
        }
    }
    return rows;
}
/**
 * Filter model rows by a search query (provider, display name, model id).
 * @param rows - catalog rows.
 * @param query - user search string.
 */
export function filterModelChoices(rows, query) {
    if (query.trim() === '')
        return rows;
    return rows.filter(row => matchesQuery(`${row.providerName} ${row.modelName} ${row.modelId}`, query));
}
/**
 * Keep only rows known to support image input.
 * @param rows - catalog rows.
 * @param imageOnly - when true, drop non-image / unknown rows.
 */
export function filterImageCapable(rows, imageOnly) {
    if (!imageOnly)
        return rows;
    return rows.filter(row => row.supportsImage === true);
}
//# sourceMappingURL=model-picker.js.map