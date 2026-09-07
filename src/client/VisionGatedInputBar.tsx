/**
 * Wrap the official composer bar so image intake respects model vision
 * capability without disabling generic-file attachments (dsh ≥ 0.1.3).
 */

import {
  createElement,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from 'react'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { ComposerBarProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CapabilityCache } from './capabilities-wire.ts'

type ModelRef = { readonly provider: string; readonly model: string }

/** Minimal face of ui-model-selection directories used by the vision gate. */
export interface ModelDirectoriesFace {
  directoryFor(sessionId: SessionId): {
    readonly store: {
      subscribe(fn: () => void): () => void
      getSnapshot(): { readonly current: ModelRef | null }
    }
  }
}

type ModelSelectionProjection = {
  readonly next: ModelRef | null
  readonly lastUsed: ModelRef | null
} | undefined

type ImageLimitsProjection = {
  readonly mediaTypes: readonly string[]
} | undefined

/** Raster types used when the deployment has not projected imageLimits yet. */
const FALLBACK_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const

/**
 * Official InputBar with image-only intake gated on vision capability.
 * Paperclip / drop / paste stay enabled so generic files work on every model.
 * Unknown capability fails open (matches official “gate at submit” posture).
 */
export function createVisionGatedInputBar(
  OfficialInputBar: ComponentType<ComposerBarProps>,
  capabilityCache: CapabilityCache,
  modelDirectories: ModelDirectoriesFace,
): ComponentType<ComposerBarProps> {
  return function VisionGatedInputBar(props: ComposerBarProps): JSX.Element {
    const sessionId = props.sessionId
    const directoryCurrent = useSyncExternalStore(
      (onStoreChange) => {
        if (sessionId === undefined) return () => {}
        try {
          return modelDirectories.directoryFor(sessionId).store.subscribe(onStoreChange)
        } catch {
          return () => {}
        }
      },
      (): ModelRef | null => {
        if (sessionId === undefined) return null
        try {
          return modelDirectories.directoryFor(sessionId).store.getSnapshot().current
        } catch {
          return null
        }
      },
      (): ModelRef | null => null,
    )

    const modelSelection = props.useProjection?.('modelSelection') as ModelSelectionProjection
    const current = directoryCurrent
      ?? modelSelection?.next
      ?? modelSelection?.lastUsed
      ?? null
    const [, setTick] = useState(0)

    useEffect(() => {
      if (current === null) return
      void capabilityCache.ensure([current])
        .then(() => { setTick(value => value + 1) })
        .catch(() => { /* fail open until known */ })
    }, [capabilityCache, current?.provider, current?.model])

    const supportsImage = current === null
      ? undefined
      : capabilityCache.get(current.provider, current.model)

    const imageLimits = props.useProjection?.('imageLimits') as ImageLimitsProjection
    const mediaTypes = imageLimits?.mediaTypes ?? FALLBACK_IMAGE_TYPES

    const upstreamAddFiles = props.addFiles
    const translate = props.t

    const addFiles = useCallback((files: readonly File[]): string | null => {
      if (upstreamAddFiles === undefined) return null
      // Known non-vision: admit non-images, refuse image-only / leftover images.
      if (supportsImage === false) {
        const images = files.filter(file => mediaTypes.includes(file.type))
        const others = files.filter(file => !mediaTypes.includes(file.type))
        if (others.length > 0) {
          const rejected = upstreamAddFiles(others)
          if (rejected !== null) return rejected
          if (images.length > 0) return translate('image.modelUnsupported')
          return null
        }
        if (images.length > 0) return translate('image.modelUnsupported')
        return null
      }
      return upstreamAddFiles(files)
    }, [mediaTypes, supportsImage, translate, upstreamAddFiles])

    return createElement(OfficialInputBar, {
      ...props,
      addFiles: upstreamAddFiles === undefined ? undefined : addFiles,
    })
  }
}
