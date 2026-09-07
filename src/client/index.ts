/** SupaNexus chat enhance client plugin. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { registerChatEnhance } from './register.ts'

/**
 * Required client services.
 * `remote` / `remote.session` are required because `directory.load()` /
 * `directory.select()` run on this fiber and touch the session remotes
 * (same as official ui-model-selection). `modelDirectories` stays nested.
 * `conversation` ensures the official composer.bar is registered before we shadow it.
 */
export const inject = ['locale', 'sessions', 'slots', 'remote', 'remote.session', 'conversation']

/**
 * Register searchable model picker and image-aware official composer.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  console.info('[supanexus-chat-enhance] client apply')
  registerChatEnhance(ctx)
}
