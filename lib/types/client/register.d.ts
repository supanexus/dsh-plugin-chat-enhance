/** Register searchable model picker on the composer model seat. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { CapabilityCache } from './capabilities-wire.ts';
import { zh } from './locales.ts';
/** Shared by the picker so Vision capability tags stay warm. */
export declare const capabilityCache: CapabilityCache;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        chatEnhance: keyof typeof zh;
    }
}
/**
 * Mount locale dictionaries, searchable model seat, and image-aware official composer.
 * Attachment upload stays on the official InputBar paperclip (dsh ≥ 0.1.3);
 * non-vision models still accept generic files, only image intake is refused.
 */
export declare function registerChatEnhance(ctx: ClientContext): void;
//# sourceMappingURL=register.d.ts.map