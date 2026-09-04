/** SupaNexus chat enhance client plugin. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * Required client services.
 * `remote` / `remote.session` are required because `directory.load()` /
 * `directory.select()` run on this fiber and touch the session remotes
 * (same as official ui-model-selection). `modelDirectories` stays nested.
 * `conversation` is required for draft image intake on the upload button.
 */
export declare const inject: string[];
/**
 * Register searchable model picker + image upload UI.
 * @param ctx - Client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map