/** Register searchable model picker + image upload on composer seats. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ModelSelection, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { ModelSelectInjected } from '../shared/model-picker.ts'
import { CapabilityCache } from './capabilities-wire.ts'
import { ModelSearchSelect } from './ModelSearchSelect.tsx'
import { AttachImageButton } from './AttachImageButton.tsx'
import { en, zh } from './locales.ts'

const NS = 'chatEnhance'

/** Shared across picker + upload so Vision tags and the paperclip stay in sync. */
export const capabilityCache = new CapabilityCache()

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    chatEnhance: keyof typeof zh
  }
}

/** Empty directory snapshot used when seat inject fails (keeps our entry from aborting). */
function fallbackInjected(message: string): ModelSelectInjected {
  const snapshot = {
    current: null as ModelSelection | null,
    groups: [] as const,
    failures: [] as const,
    status: 'error' as const,
    error: message,
  }
  return {
    available: true,
    directory: {
      subscribe: () => () => {},
      getSnapshot: () => snapshot,
      update: () => {},
      set: () => {},
    } as ModelSelectInjected['directory'],
    load: () => {},
    select: async () => false,
  }
}

/**
 * Mount locale dictionaries, model seat, and image upload control.
 */
export function registerChatEnhance(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'supanexus-chat-enhance: dictionaries')

  ctx.effect(() => ctx.slots.onEntryError((key, entry, error, info) => {
    if (key !== 'conversation.input.model' && key !== 'conversation.input.left') return
    if (entry.registrant !== '@supanexus/dsh-plugin-chat-enhance') return
    console.error('[supanexus-chat-enhance] slot entry error', { key, abdicated: info.abdicated, error })
  }), 'supanexus-chat-enhance: entry-error')

  ctx.inject(['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session', 'conversation'], (scope: ClientContext) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    console.info('[supanexus-chat-enhance] registering conversation.input.model + left upload')

    scope.slots.inject('conversation.input.model', function* () {
      yield scope.slots.register({
        name: 'conversation.input.model',
        locale: NS,
        priority: -1,
        registrant: '@supanexus/dsh-plugin-chat-enhance',
        inject: (sessionId: SessionId): ModelSelectInjected & { capabilityCache: CapabilityCache } => {
          try {
            const directory = models.directoryFor(sessionId)
            const available = sessions.subagentAddress(sessionId) === undefined
            return {
              available,
              directory: directory.store,
              capabilityCache,
              load: () => {
                if (available) directory.load().catch(() => { /* surfaced on the store */ })
              },
              select: (selection: ModelSelection) => available
                ? directory.select(selection).then(() => true, () => false)
                : Promise.resolve(false),
            }
          } catch (error) {
            console.error('[supanexus-chat-enhance] seat inject failed', error)
            return { ...fallbackInjected(error instanceof Error ? error.message : String(error)), capabilityCache }
          }
        },
      }, ModelSearchSelect)
    })

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
      }, AttachImageButton)
    })
  })
}
