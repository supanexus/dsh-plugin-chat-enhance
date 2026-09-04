/** Browser fetch for Host capability probe. */
import { type CapabilityEntry, type CapabilityQuery } from '../shared/capabilities-contract.ts';
/**
 * Resolve image support for a batch of model routes.
 * @param models - provider/model pairs from the catalog.
 */
export declare function fetchCapabilities(models: readonly CapabilityQuery[]): Promise<readonly CapabilityEntry[]>;
/** In-memory cache keyed by `provider/model`. */
export declare class CapabilityCache {
    private readonly map;
    get(provider: string, model: string): boolean | undefined;
    snapshot(): ReadonlyMap<string, boolean>;
    ensure(queries: readonly CapabilityQuery[]): Promise<void>;
}
//# sourceMappingURL=capabilities-wire.d.ts.map