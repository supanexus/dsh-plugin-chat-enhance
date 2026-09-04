/**
 * Package-owned invariant companion for `@supanexus/dsh-plugin-chat-enhance`.
 * @module @supanexus/dsh-plugin-chat-enhance/invariant
 */
const PACKAGE_NAME = '@supanexus/dsh-plugin-chat-enhance';
/** Cordis companion plugin name. */
export const name = 'supanexus-chat-enhance-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** No runtime invariant — slot registration is transactional. */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map