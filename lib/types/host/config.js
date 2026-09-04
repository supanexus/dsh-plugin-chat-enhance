/** Plugin cordis config schema. */
import z from '@deepseek-ai/schemastery';
export const Config = z.object({
    maxRecent: z.number().step(1).min(1).max(8).default(4),
});
/** Cordis function-plugin name. */
export const name = 'supanexus-chat-enhance';
/** Host needs connection + llm for capability routes. */
export const inject = ['connection', 'llm'];
//# sourceMappingURL=config.js.map