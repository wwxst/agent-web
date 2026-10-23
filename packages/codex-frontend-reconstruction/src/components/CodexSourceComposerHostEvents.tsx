import * as React from "react";
import type { ComposerControllerPort } from "../conversation/ComposerControllerContract.js";
import {
  connectComposerControllerClipboardEvents,
  type ComposerControllerClipboardCallbacks,
} from "../conversation/ComposerControllerClipboardEvents.js";

export interface CodexSourceComposerHostEventsProps extends ComposerControllerClipboardCallbacks {
  controller: ComposerControllerPort | null;
}

/**
 * Main-Composer host event bridge for the source controller's paste events.
 * It deliberately does not implement upload policy or perform file I/O.
 */
export function CodexSourceComposerHostEvents(props: CodexSourceComposerHostEventsProps) {
  const latest = React.useRef(props);
  latest.current = props;
  const {
    controller,
    onPastedImages,
    onPastedFiles,
    onPastedText,
    onPastedLink,
  } = props;

  React.useEffect(() => {
    if (controller == null) return;
    return connectComposerControllerClipboardEvents(controller, {
      ...(onPastedImages == null ? {} : {
        onPastedImages: (images) => latest.current.onPastedImages?.(images),
      }),
      ...(onPastedFiles == null ? {} : {
        onPastedFiles: (files, dataTransfer) =>
          latest.current.onPastedFiles?.(files, dataTransfer),
      }),
      ...(onPastedText == null ? {} : {
        onPastedText: (payload) => {
          const callback = latest.current.onPastedText;
          return callback == null ? false : callback(payload);
        },
      }),
      ...(onPastedLink == null ? {} : {
        onPastedLink: (payload) => {
          const callback = latest.current.onPastedLink;
          return callback == null ? false : callback(payload);
        },
      }),
    });
  }, [
    controller,
    onPastedImages != null,
    onPastedFiles != null,
    onPastedText != null,
    onPastedLink != null,
  ]);

  return null;
}
