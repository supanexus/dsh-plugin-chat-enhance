/**
 * Chat enhance plugin, node half — capability routes + cordis config.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './host/config.ts';
export { Config, name, inject } from './host/config.ts';
/**
 * Register Host capability probe used by the client picker + upload gate.
 * @param ctx - Host plugin context.
 * @param _config - Cordis row configuration.
 */
export declare function apply(ctx: Context, _config: Config): void;
//# sourceMappingURL=index.d.ts.map