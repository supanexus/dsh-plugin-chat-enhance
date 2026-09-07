/** Register searchable model picker on the composer model seat. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ModelSelection, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { ComposerBarInjected, ComposerBarProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { ComponentType } from 'react'
import type { ModelSelectInjected } from '../shared/model-picker.ts'
import { CapabilityCache } from './capabilities-wire.ts'
import { ModelSearchSelect } from './ModelSearchSelect.tsx'
import { createVisionGatedInputBar } from './VisionGatedInputBar.tsx'
import { en, zh } from './locales.ts'

const NS = 'chatEnhance'
const REGISTRANT = '@supanexus/dsh-plugin-chat-enhance'

/** Shared by the picker so Vision capability tags stay warm. */
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
 * Mount locale dictionaries, searchable model seat, and image-aware official composer.
 * Attachment upload stays on the official InputBar paperclip (dsh ≥ 0.1.3);
 * non-vision models still accept generic files, only image intake is refused.
 */
export function registerChatEnhance(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'supanexus-chat-enhance: dictionaries')

  ctx.effect(() => ctx.slots.onEntryError((key, entry, error, info) => {
    if (key !== 'conversation.input.model' && key !== 'conversation.composer.bar') return
    if (entry.registrant !== REGISTRANT) return
    console.error('[supanexus-chat-enhance] slot entry error', { key, abdicated: info.abdicated, error })
  }), 'supanexus-chat-enhance: entry-error')

  // `conversation` ensures ui-conversation finished registering the official composer.bar.
  ctx.inject(['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session', 'conversation'], (scope: ClientContext) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    console.info('[supanexus-chat-enhance] registering conversation.input.model + image-aware composer.bar')

    scope.slots.inject('conversation.input.model', function* () {
      yield scope.slots.register({
        name: 'conversation.input.model',
        locale: NS,
        priority: -1,
        registrant: REGISTRANT,
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

    let disposeGate: (() => void) | undefined
    const armVisionGate = (): boolean => {
      if (disposeGate !== undefined) return true
      const official = scope.slots.entries('conversation.composer.bar')
        .find(entry =>
          entry.registrant !== REGISTRANT
          && entry.component !== undefined
          && typeof entry.inject === 'function')
      if (official === undefined || official.inject === undefined) return false

      const OfficialInputBar = official.component as ComponentType<ComposerBarProps>
      const officialInject = official.inject as unknown as (
        sessionId: SessionId | undefined,
      ) => ComposerBarInjected
      const VisionGatedInputBar = createVisionGatedInputBar(
        OfficialInputBar,
        capabilityCache,
        scope.modelDirectories as never,
      )
      disposeGate = scope.slots.register({
        name: 'conversation.composer.bar',
        priority: -1,
        locale: 'conversation',
        registrant: REGISTRANT,
        inject: (sessionId: SessionId | undefined): ComposerBarInjected => officialInject(sessionId),
      }, VisionGatedInputBar)
      console.info('[supanexus-chat-enhance] image-aware composer.bar armed', {
        officialEntries: scope.slots.entries('conversation.composer.bar').length,
      })
      return true
    }

    scope.effect(() => {
      const timers: ReturnType<typeof setTimeout>[] = []
      if (!armVisionGate()) {
        console.warn('[supanexus-chat-enhance] official composer.bar not ready; retrying')
        for (const ms of [0, 50, 200, 1000, 3000]) {
          timers.push(setTimeout(() => {
            if (armVisionGate()) {
              for (const timer of timers) clearTimeout(timer)
            } else if (ms === 3000) {
              console.error('[supanexus-chat-enhance] official conversation.composer.bar entry missing; skip image gate')
            }
          }, ms))
        }
      }
      return () => {
        for (const timer of timers) clearTimeout(timer)
        disposeGate?.()
        disposeGate = undefined
      }
    }, 'supanexus-chat-enhance: image-gate')
  })
}
