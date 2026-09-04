/** Plugin cordis config schema. */
import z from '@deepseek-ai/schemastery';
/** Resolved plugin configuration from cordis.patch.yml. */
export interface Config {
    /** Maximum recent model chips shown in the composer row. */
    maxRecent: number;
}
export declare const Config: z<Config>;
/** Cordis function-plugin name. */
export declare const name = "supanexus-chat-enhance";
/** Host needs connection + llm for capability routes. */
export declare const inject: readonly ["connection", "llm"];
//# sourceMappingURL=config.d.ts.map