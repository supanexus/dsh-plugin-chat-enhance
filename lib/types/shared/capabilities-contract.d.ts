/** Shared HTTP path + DTO for model capability lookups. */
/** Batch capability probe (GET `?m=provider/model`). */
export declare const CAPABILITIES_PATH: "/api/chat-enhance.capabilities";
/** One model route to resolve. */
export interface CapabilityQuery {
    readonly provider: string;
    readonly model: string;
}
/** Resolved modalities for one route. */
export interface CapabilityEntry {
    readonly provider: string;
    readonly model: string;
    readonly inputModalities: readonly string[];
    readonly supportsImage: boolean;
}
/** Successful batch response. */
export interface CapabilitiesResponse {
    readonly ok: true;
    readonly capabilities: readonly CapabilityEntry[];
}
/** Error body. */
export interface CapabilitiesError {
    readonly ok: false;
    readonly message: string;
}
//# sourceMappingURL=capabilities-contract.d.ts.map