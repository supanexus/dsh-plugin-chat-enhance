/**
 * Wrap the official composer bar so image intake respects model vision
 * capability without disabling generic-file attachments (dsh ≥ 0.1.3).
 */
import { createElement, useCallback, useEffect, useState, useSyncExternalStore, } from 'react';
/** Raster types used when the deployment has not projected imageLimits yet. */
const FALLBACK_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
];
/**
 * Official InputBar with image-only intake gated on vision capability.
 * Paperclip / drop / paste stay enabled so generic files work on every model.
 * Unknown capability fails open (matches official “gate at submit” posture).
 */
export function createVisionGatedInputBar(OfficialInputBar, capabilityCache, modelDirectories) {
    return function VisionGatedInputBar(props) {
        const sessionId = props.sessionId;
        const directoryCurrent = useSyncExternalStore((onStoreChange) => {
            if (sessionId === undefined)
                return () => { };
            try {
                return modelDirectories.directoryFor(sessionId).store.subscribe(onStoreChange);
            }
            catch {
                return () => { };
            }
        }, () => {
            if (sessionId === undefined)
                return null;
            try {
                return modelDirectories.directoryFor(sessionId).store.getSnapshot().current;
            }
            catch {
                return null;
            }
        }, () => null);
        const modelSelection = props.useProjection?.('modelSelection');
        const current = directoryCurrent
            ?? modelSelection?.next
            ?? modelSelection?.lastUsed
            ?? null;
        const [, setTick] = useState(0);
        useEffect(() => {
            if (current === null)
                return;
            void capabilityCache.ensure([current])
                .then(() => { setTick(value => value + 1); })
                .catch(() => { });
        }, [capabilityCache, current?.provider, current?.model]);
        const supportsImage = current === null
            ? undefined
            : capabilityCache.get(current.provider, current.model);
        const imageLimits = props.useProjection?.('imageLimits');
        const mediaTypes = imageLimits?.mediaTypes ?? FALLBACK_IMAGE_TYPES;
        const upstreamAddFiles = props.addFiles;
        const translate = props.t;
        const addFiles = useCallback((files) => {
            if (upstreamAddFiles === undefined)
                return null;
            // Known non-vision: admit non-images, refuse image-only / leftover images.
            if (supportsImage === false) {
                const images = files.filter(file => mediaTypes.includes(file.type));
                const others = files.filter(file => !mediaTypes.includes(file.type));
                if (others.length > 0) {
                    const rejected = upstreamAddFiles(others);
                    if (rejected !== null)
                        return rejected;
                    if (images.length > 0)
                        return translate('image.modelUnsupported');
                    return null;
                }
                if (images.length > 0)
                    return translate('image.modelUnsupported');
                return null;
            }
            return upstreamAddFiles(files);
        }, [mediaTypes, supportsImage, translate, upstreamAddFiles]);
        return createElement(OfficialInputBar, {
            ...props,
            addFiles: upstreamAddFiles === undefined ? undefined : addFiles,
        });
    };
}
//# sourceMappingURL=VisionGatedInputBar.js.map