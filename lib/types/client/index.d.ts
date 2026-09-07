/** SupaNexus chat enhance client plugin. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * Required client services.
 * `remote` / `remote.session` are required because `directory.load()` /
 * `directory.select()` run on this fiber and touch the session remotes
 * (same as official ui-model-selection). `modelDirectories` stays nested.
 * `conversation` ensures the official composer.bar is registered before we shadow it.
 */
export declare const inject: string[];
/**
 * Register searchable model picker and image-aware official composer.
 * @param ctx - Client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map