/**
 * Wrap the official composer bar so image intake respects model vision
 * capability without disabling generic-file attachments (dsh ≥ 0.1.3).
 */
import { type ComponentType } from 'react';
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { ComposerBarProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { CapabilityCache } from './capabilities-wire.ts';
type ModelRef = {
    readonly provider: string;
    readonly model: string;
};
/** Minimal face of ui-model-selection directories used by the vision gate. */
export interface ModelDirectoriesFace {
    directoryFor(sessionId: SessionId): {
        readonly store: {
            subscribe(fn: () => void): () => void;
            getSnapshot(): {
                readonly current: ModelRef | null;
            };
        };
    };
}
/**
 * Official InputBar with image-only intake gated on vision capability.
 * Paperclip / drop / paste stay enabled so generic files work on every model.
 * Unknown capability fails open (matches official “gate at submit” posture).
 */
export declare function createVisionGatedInputBar(OfficialInputBar: ComponentType<ComposerBarProps>, capabilityCache: CapabilityCache, modelDirectories: ModelDirectoriesFace): ComponentType<ComposerBarProps>;
export {};
//# sourceMappingURL=VisionGatedInputBar.d.ts.map