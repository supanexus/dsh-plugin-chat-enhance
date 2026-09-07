/** Host HTTP: resolve model input modalities via llm.resolveModelInfo. */
import { CAPABILITIES_PATH, } from "../shared/capabilities-contract.js";
function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
function routeKey(provider, model) {
    return `${provider}/${model}`;
}
function parseQueries(request) {
    const url = new URL(request.url);
    const seen = new Set();
    const unique = [];
    for (const raw of url.searchParams.getAll('m')) {
        const slash = raw.indexOf('/');
        if (slash <= 0 || slash >= raw.length - 1)
            continue;
        const provider = raw.slice(0, slash);
        const model = raw.slice(slash + 1);
        const key = routeKey(provider, model);
        if (seen.has(key))
            continue;
        seen.add(key);
        unique.push({ provider, model });
    }
    return unique;
}
/**
 * Register GET /api/chat-enhance.capabilities?m=provider/model for Vision tags + image intake gate.
 * (Host connection.fetch only allows GET/HEAD.)
 * @param ctx - Host context with `llm` + `connection`.
 */
export function registerCapabilityRoutes(ctx) {
    ctx.effect(() => ctx.connection.fetch.register({
        path: CAPABILITIES_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async (request) => {
            try {
                const llm = ctx.get('llm');
                const unique = parseQueries(request);
                const capabilities = await Promise.all(unique.map(async (query) => {
                    try {
                        const info = await llm.resolveModelInfo(query.provider, query.model);
                        const inputModalities = info.inputModalities === undefined
                            ? ['text']
                            : [...info.inputModalities];
                        return {
                            provider: query.provider,
                            model: query.model,
                            inputModalities,
                            supportsImage: inputModalities.includes('image'),
                        };
                    }
                    catch {
                        return {
                            provider: query.provider,
                            model: query.model,
                            inputModalities: ['text'],
                            supportsImage: false,
                        };
                    }
                }));
                const payload = { ok: true, capabilities };
                return jsonResponse(payload);
            }
            catch (error) {
                return jsonResponse({
                    ok: false,
                    message: error instanceof Error ? error.message : String(error),
                }, 500);
            }
        },
    }), 'supanexus-chat-enhance: capabilities');
}
//# sourceMappingURL=capabilities.js.map