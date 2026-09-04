/** Browser fetch for Host capability probe. */
import { CAPABILITIES_PATH, } from "../shared/capabilities-contract.js";
/**
 * Resolve image support for a batch of model routes.
 * @param models - provider/model pairs from the catalog.
 */
export async function fetchCapabilities(models) {
    if (models.length === 0)
        return [];
    const params = new URLSearchParams();
    for (const item of models) {
        params.append('m', `${item.provider}/${item.model}`);
    }
    const response = await fetch(`${CAPABILITIES_PATH}?${params.toString()}`);
    const body = await response.json();
    if (!response.ok || body.ok !== true) {
        throw new Error('ok' in body && body.ok === false && typeof body.message === 'string'
            ? body.message
            : `capabilities HTTP ${response.status}`);
    }
    return body.capabilities;
}
/** In-memory cache keyed by `provider/model`. */
export class CapabilityCache {
    map = new Map();
    get(provider, model) {
        return this.map.get(`${provider}/${model}`);
    }
    snapshot() {
        return this.map;
    }
    async ensure(queries) {
        const missing = queries.filter(q => !this.map.has(`${q.provider}/${q.model}`));
        if (missing.length === 0)
            return;
        const entries = await fetchCapabilities(missing);
        for (const entry of entries) {
            this.map.set(`${entry.provider}/${entry.model}`, entry.supportsImage);
        }
    }
}
//# sourceMappingURL=capabilities-wire.js.map