import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { type ModelSelectInjected } from '../shared/model-picker.ts';
import type { CapabilityCache } from './capabilities-wire.ts';
type ModelSearchSelectProps = ModelSelectInjected & {
    readonly locked: boolean;
    readonly capabilityCache: CapabilityCache;
} & PropsLocale<'chatEnhance'>;
/**
 * Render the composer model seat with recent chips and a searchable picker panel.
 */
export declare function ModelSearchSelect(props: ModelSearchSelectProps): JSX.Element;
export {};
//# sourceMappingURL=ModelSearchSelect.d.ts.map