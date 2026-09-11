import z from "@deepseek-ai/schemastery";
//#region lib/types/shared/capabilities-contract.js
/** Shared HTTP path + DTO for model capability lookups. */
/** Batch capability probe (GET `?m=provider/model`). */
const CAPABILITIES_PATH = "/api/chat-enhance.capabilities";
//#endregion
//#region lib/types/host/capabilities.js
/** Host HTTP: resolve model input modalities via llm.resolveModelInfo. */
function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}
function routeKey(provider, model) {
	return `${provider}/${model}`;
}
function parseQueries(request) {
	const url = new URL(request.url);
	const seen = /* @__PURE__ */ new Set();
	const unique = [];
	for (const raw of url.searchParams.getAll("m")) {
		const slash = raw.indexOf("/");
		if (slash <= 0 || slash >= raw.length - 1) continue;
		const provider = raw.slice(0, slash);
		const model = raw.slice(slash + 1);
		const key = routeKey(provider, model);
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push({
			provider,
			model
		});
	}
	return unique;
}
/**
* Register GET /api/chat-enhance.capabilities?m=provider/model for Vision tags + image intake gate.
* (Host connection.fetch only allows GET/HEAD.)
* @param ctx - Host context with `llm` + `connection`.
*/
function registerCapabilityRoutes(ctx) {
	ctx.effect(() => ctx.connection.fetch.register({
		path: CAPABILITIES_PATH,
		methods: ["GET"],
		requestBody: "buffered",
		fetch: async (request) => {
			try {
				const llm = ctx.get("llm");
				const unique = parseQueries(request);
				return jsonResponse({
					ok: true,
					capabilities: await Promise.all(unique.map(async (query) => {
						try {
							const info = await llm.resolveModelInfo(query.provider, query.model);
							const inputModalities = info.inputModalities === void 0 ? ["text"] : [...info.inputModalities];
							return {
								provider: query.provider,
								model: query.model,
								inputModalities,
								supportsImage: inputModalities.includes("image")
							};
						} catch {
							return {
								provider: query.provider,
								model: query.model,
								inputModalities: ["text"],
								supportsImage: false
							};
						}
					}))
				});
			} catch (error) {
				return jsonResponse({
					ok: false,
					message: error instanceof Error ? error.message : String(error)
				}, 500);
			}
		}
	}), "supanexus-chat-enhance: capabilities");
}
//#endregion
//#region lib/types/host/config.js
/** Plugin cordis config schema. */
const Config = z.object({ maxRecent: z.number().step(1).min(1).max(8).default(4) });
/** Cordis function-plugin name. */
const name = "supanexus-chat-enhance";
/** Host needs connection + llm for capability routes. */
const inject = ["connection", "llm"];
//#endregion
//#region lib/types/index.js
/**
* Chat enhance plugin, node half — capability routes + cordis config.
*/
/**
* Register Host capability probe used by the client picker + image intake gate.
* @param ctx - Host plugin context.
* @param _config - Cordis row configuration.
*/
function apply(ctx, _config) {
	registerCapabilityRoutes(ctx);
}
//#endregion
export { Config, apply, inject, name };
