/** SupaNexus chat enhance client plugin. */
import { registerChatEnhance } from "./register.js";
/**
 * Required client services.
 * `remote` / `remote.session` are required because `directory.load()` /
 * `directory.select()` run on this fiber and touch the session remotes
 * (same as official ui-model-selection). `modelDirectories` stays nested.
 * `conversation` is required for draft image intake on the upload button.
 */
export const inject = ['locale', 'sessions', 'slots', 'remote', 'remote.session', 'conversation'];
/**
 * Register searchable model picker + image upload UI.
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    console.info('[supanexus-chat-enhance] client apply');
    registerChatEnhance(ctx);
}
//# sourceMappingURL=index.js.map