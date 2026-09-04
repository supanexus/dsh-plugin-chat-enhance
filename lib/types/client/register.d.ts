/** Register searchable model picker + image upload on composer seats. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { CapabilityCache } from './capabilities-wire.ts';
import { zh } from './locales.ts';
/** Shared across picker + upload so Vision tags and the paperclip stay in sync. */
export declare const capabilityCache: CapabilityCache;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        chatEnhance: keyof typeof zh;
    }
}
/**
 * Mount locale dictionaries, model seat, and image upload control.
 */
export declare function registerChatEnhance(ctx: ClientContext): void;
//# sourceMappingURL=register.d.ts.map