/** Host HTTP: resolve model input modalities via llm.resolveModelInfo. */
import type { Context } from '@deepseek-ai/cordis';
/**
 * Register GET /api/chat-enhance.capabilities?m=provider/model for Vision tags + image intake gate.
 * (Host connection.fetch only allows GET/HEAD.)
 * @param ctx - Host context with `llm` + `connection`.
 */
export declare function registerCapabilityRoutes(ctx: Context): void;
//# sourceMappingURL=capabilities.d.ts.map