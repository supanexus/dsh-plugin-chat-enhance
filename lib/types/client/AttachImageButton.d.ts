/**
 * Composer left-slot: pick images into the official draft attachment rail.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { CapabilityCache } from './capabilities-wire.ts';
type AttachProps = PropsRuntime<'conversation.input.left'> & PropsLocale<'chatEnhance'> & {
    readonly capabilityCache: CapabilityCache;
    readonly conversationCtx: ClientContext;
};
/**
 * Upload control for vision-capable models (official createDraftImages path).
 */
export declare function AttachImageButton({ useInput, inputActions, useProjection, capabilityCache, conversationCtx, t, }: AttachProps): JSX.Element;
export {};
//# sourceMappingURL=AttachImageButton.d.ts.map