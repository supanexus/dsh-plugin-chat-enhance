import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Composer left-slot: pick images into the official draft attachment rail.
 */
import { useCallback, useEffect, useId, useRef, useState, } from 'react';
import css from './attach-image.module.css';
function PaperclipIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("path", { d: "M10.2 3.4 4.6 9c-1.3 1.3-1.3 3.4 0 4.7s3.4 1.3 4.7 0l4.8-4.8a2.5 2.5 0 0 0-3.5-3.5L5.3 10.7a.9.9 0 1 0 1.3 1.3l5.3-5.3.9.9-5.3 5.3a2.2 2.2 0 1 1-3.1-3.1l5.3-5.3a3.8 3.8 0 0 1 5.4 5.4L9.3 15.4c-2 2-5.3 2-7.3 0s-2-5.3 0-7.3l5.6-5.6.9.9Z", fill: "currentColor" }) }));
}
/**
 * Upload control for vision-capable models (official createDraftImages path).
 */
export function AttachImageButton({ useInput, inputActions, useProjection, capabilityCache, conversationCtx, t, }) {
    const input = useInput(state => state);
    const imageLimits = useProjection('imageLimits');
    const modelSelection = useProjection('modelSelection');
    const current = modelSelection?.next ?? modelSelection?.lastUsed ?? null;
    const [, setTick] = useState(0);
    const fileRef = useRef(null);
    const inputId = useId();
    useEffect(() => {
        if (current === null)
            return;
        void capabilityCache.ensure([current]).then(() => { setTick(value => value + 1); }).catch(() => { });
    }, [capabilityCache, current]);
    const supportsImage = current === null
        ? false
        : capabilityCache.get(current.provider, current.model) === true;
    const busy = input.phase === 'adjudicating' || input.phase === 'submitting';
    const canUpload = !busy && imageLimits !== undefined && supportsImage && inputActions !== undefined;
    const title = imageLimits === undefined
        ? t('upload.unavailable')
        : supportsImage
            ? t('upload.aria')
            : t('upload.disabled');
    const intake = useCallback((files) => {
        if (inputActions === undefined || files.length === 0)
            return;
        const conversation = conversationCtx.get('conversation');
        try {
            const images = conversation.createDraftImages(files);
            if (!inputActions.addImages(images.map(image => image.id))) {
                conversation.releaseDraftImages(images);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn('[supanexus-chat-enhance] upload failed', message);
        }
    }, [conversationCtx, inputActions]);
    const onChange = (event) => {
        const list = event.target.files;
        if (list === null || list.length === 0)
            return;
        intake([...list]);
        event.target.value = '';
    };
    return (_jsxs("span", { className: css.wrap, children: [_jsx("input", { id: inputId, ref: fileRef, className: css.hidden, type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", multiple: true, disabled: !canUpload, onChange: onChange }), _jsx("button", { type: "button", className: css.button, disabled: !canUpload, title: title, "aria-label": title, onClick: () => { fileRef.current?.click(); }, children: _jsx(PaperclipIcon, {}) })] }));
}
//# sourceMappingURL=AttachImageButton.js.map