/**
 * Chat enhance plugin, node half — capability routes + cordis config.
 */
import { registerCapabilityRoutes } from "./host/capabilities.js";
export { Config, name, inject } from "./host/config.js";
/**
 * Register Host capability probe used by the client picker + upload gate.
 * @param ctx - Host plugin context.
 * @param _config - Cordis row configuration.
 */
export function apply(ctx, _config) {
    registerCapabilityRoutes(ctx);
}
//# sourceMappingURL=index.js.map