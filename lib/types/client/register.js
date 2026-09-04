/** Register searchable model picker + image upload on composer seats. */
import { CapabilityCache } from "./capabilities-wire.js";
import { ModelSearchSelect } from "./ModelSearchSelect.js";
import { AttachImageButton } from "./AttachImageButton.js";
import { en, zh } from "./locales.js";
const NS = 'chatEnhance';
/** Shared across picker + upload so Vision tags and the paperclip stay in sync. */
export const capabilityCache = new CapabilityCache();
/** Empty directory snapshot used when seat inject fails (keeps our entry from aborting). */
function fallbackInjected(message) {
    const snapshot = {
        current: null,
        groups: [],
        failures: [],
        status: 'error',
        error: message,
    };
    return {
        available: true,
        directory: {
            subscribe: () => () => { },
            getSnapshot: () => snapshot,
            update: () => { },
            set: () => { },
        },
        load: () => { },
        select: async () => false,
    };
}
/**
 * Mount locale dictionaries, model seat, and image upload control.
 */
export function registerChatEnhance(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'supanexus-chat-enhance: dictionaries');
    ctx.effect(() => ctx.slots.onEntryError((key, entry, error, info) => {
        if (key !== 'conversation.input.model' && key !== 'conversation.input.left')
            return;
        if (entry.registrant !== '@supanexus/dsh-plugin-chat-enhance')
            return;
        console.error('[supanexus-chat-enhance] slot entry error', { key, abdicated: info.abdicated, error });
    }), 'supanexus-chat-enhance: entry-error');
    ctx.inject(['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session', 'conversation'], (scope) => {
        const models = scope.modelDirectories;
        const sessions = scope.sessions;
        console.info('[supanexus-chat-enhance] registering conversation.input.model + left upload');
        scope.slots.inject('conversation.input.model', function* () {
            yield scope.slots.register({
                name: 'conversation.input.model',
                locale: NS,
                priority: -1,
                registrant: '@supanexus/dsh-plugin-chat-enhance',
                inject: (sessionId) => {
                    try {
                        const directory = models.directoryFor(sessionId);
                        const available = sessions.subagentAddress(sessionId) === undefined;
                        return {
                            available,
                            directory: directory.store,
                            capabilityCache,
                            load: () => {
                                if (available)
                                    directory.load().catch(() => { });
                            },
                            select: (selection) => available
                                ? directory.select(selection).then(() => true, () => false)
                                : Promise.resolve(false),
                        };
                    }
                    catch (error) {
                        console.error('[supanexus-chat-enhance] seat inject failed', error);
                        return { ...fallbackInjected(error instanceof Error ? error.message : String(error)), capabilityCache };
                    }
                },
            }, ModelSearchSelect);
        });
        scope.slots.inject('conversation.input.left', function* () {
            yield scope.slots.register({
                name: 'conversation.input.left',
                id: 'chat-enhance-upload',
                order: 20,
                locale: NS,
                label: 'Upload',
                registrant: '@supanexus/dsh-plugin-chat-enhance',
                inject: () => ({
                    capabilityCache,
                    conversationCtx: scope,
                }),
            }, AttachImageButton);
        });
    });
}
//# sourceMappingURL=register.js.map