import * as React from "react";
import type { ComposerControllerPort } from "../conversation/ComposerControllerContract.js";

export interface CodexSourceComposerEditorMountProps {
  controller: ComposerControllerPort | null;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  layout?: "multiline" | "single-line";
  isDictating?: boolean;
  submitReady: boolean;
  disableAutoFocus?: boolean;
  focusRequestNonce?: string | number;
  isFocusComposerTarget?: boolean;
  onSubmit: (timestamp?: number) => void;
  onUserInput?: (event: Event) => void;
  onCompositionStateChange?: (isComposing: boolean) => void;
  onSingleLineOverflowChange?: (isOverflowing: boolean) => void;
}

/**
 * Source-aligned mount/lifecycle boundary for controller-owned editor DOM.
 *
 * It ports the verified XWu responsibilities (placeholder/aria label,
 * controller input-active state, submit readiness, controller submit
 * registration, composition/input forwarding, overflow observation, focus
 * request handling, and DOM detach). It deliberately does not implement
 * ProseMirror, private link/mention click handlers, or the original keymap.
 */
export function CodexSourceComposerEditorMount(props: CodexSourceComposerEditorMountProps) {
  const {
    controller,
    ariaLabel,
    placeholder,
    className,
    layout = "multiline",
    isDictating = false,
    submitReady,
    disableAutoFocus = false,
    focusRequestNonce,
    isFocusComposerTarget = false,
  } = props;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const latest = React.useRef({
    onSubmit: props.onSubmit,
    onUserInput: props.onUserInput,
    onCompositionStateChange: props.onCompositionStateChange,
    onSingleLineOverflowChange: props.onSingleLineOverflowChange,
    layout,
  });
  latest.current = {
    onSubmit: props.onSubmit,
    onUserInput: props.onUserInput,
    onCompositionStateChange: props.onCompositionStateChange,
    onSingleLineOverflowChange: props.onSingleLineOverflowChange,
    layout,
  };
  const didCaptureInitialFocus = React.useRef(false);
  const initialInputFocused = React.useRef<boolean | undefined>(undefined);
  const previousFocusRequestNonce = React.useRef<string | number | undefined>(focusRequestNonce);

  React.useLayoutEffect(() => {
    if (controller == null || rootRef.current == null) return;
    const root = rootRef.current;
    const dom = controller.view.dom;
    if (!didCaptureInitialFocus.current) {
      initialInputFocused.current = controller.initialInputFocused;
      didCaptureInitialFocus.current = true;
    }
    if (dom.parentElement !== root) root.appendChild(dom);
    controller.setInputActive(true);
    controller.clearInitialInputFocus();
    dom.dataset.virtualkeyboard = "true";

    const updateOverflow = () => {
      root.toggleAttribute("data-overflowing", root.scrollHeight > root.clientHeight);
      if (latest.current.layout !== "single-line" || latest.current.onSingleLineOverflowChange == null) return;
      let overflowing = dom.scrollHeight > dom.clientHeight;
      if (!overflowing) {
        for (const child of dom.querySelectorAll<HTMLElement>("*")) {
          if (child.scrollWidth > child.clientWidth) {
            overflowing = true;
            break;
          }
        }
      }
      latest.current.onSingleLineOverflowChange(overflowing);
    };
    const onInput = (event: Event) => {
      latest.current.onUserInput?.(event);
      updateOverflow();
    };
    const onCompositionStart = () => {
      dom.dataset.composing = "true";
      latest.current.onCompositionStateChange?.(true);
    };
    const onCompositionEnd = () => {
      dom.dataset.composing = "false";
      latest.current.onCompositionStateChange?.(false);
      updateOverflow();
    };

    dom.addEventListener("input", onInput);
    dom.addEventListener("compositionstart", onCompositionStart);
    dom.addEventListener("compositionend", onCompositionEnd);
    dom.addEventListener("keyup", updateOverflow);
    dom.addEventListener("scroll", updateOverflow);

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateOverflow);
    resizeObserver?.observe(root);
    resizeObserver?.observe(dom);
    const fonts = dom.ownerDocument.fonts;
    fonts?.addEventListener("loadingdone", updateOverflow);
    updateOverflow();

    return () => {
      controller.setInputActive(false);
      resizeObserver?.disconnect();
      fonts?.removeEventListener("loadingdone", updateOverflow);
      dom.removeEventListener("input", onInput);
      dom.removeEventListener("compositionstart", onCompositionStart);
      dom.removeEventListener("compositionend", onCompositionEnd);
      dom.removeEventListener("keyup", updateOverflow);
      dom.removeEventListener("scroll", updateOverflow);
      if (dom.dataset.composing === "true") {
        dom.dataset.composing = "false";
        latest.current.onCompositionStateChange?.(false);
      }
      dom.blur();
      if (dom.parentElement === root) root.removeChild(dom);
    };
  }, [controller]);

  React.useLayoutEffect(() => {
    if (controller == null) return;
    const dom = controller.view.dom;
    if (ariaLabel != null) dom.setAttribute("aria-label", ariaLabel);
    else dom.removeAttribute("aria-label");
    controller.setPlaceholder(placeholder);
    if (isFocusComposerTarget) dom.dataset.codexComposer = "true";
    else delete dom.dataset.codexComposer;
  }, [controller, ariaLabel, placeholder, isFocusComposerTarget]);

  React.useLayoutEffect(() => {
    controller?.setSubmitReady(submitReady);
  }, [controller, submitReady]);

  React.useLayoutEffect(() => {
    if (controller == null) return;
    return controller.addSubmitHandler((timestamp) => {
      controller.cancelPendingSubmit();
      latest.current.onSubmit(timestamp);
    });
  }, [controller]);

  React.useLayoutEffect(() => {
    if (controller == null) return;
    const dom = controller.view.dom;
    const changed = focusRequestNonce != null && focusRequestNonce !== previousFocusRequestNonce.current;
    if ((disableAutoFocus || initialInputFocused.current != null) && !changed) return;
    const document = dom.ownerDocument;
    const previousActive = document.activeElement;
    const focus = () => {
      previousFocusRequestNonce.current = focusRequestNonce;
      if (changed || document.activeElement === previousActive ||
          document.activeElement?.getAttribute("role") !== "tab") {
        controller.focus();
      }
    };
    if (isFocusComposerTarget && !changed && previousActive === document.body) {
      focus();
      return;
    }
    if (typeof ResizeObserver !== "undefined") {
      let pending = true;
      const observer = new ResizeObserver(() => {
        if (!pending) return;
        pending = false;
        observer.disconnect();
        focus();
      });
      observer.observe(dom);
      return () => {
        pending = false;
        observer.disconnect();
      };
    }
    const frame = window.requestAnimationFrame(focus);
    return () => window.cancelAnimationFrame(frame);
  }, [controller, disableAutoFocus, focusRequestNonce, isFocusComposerTarget]);

  return (
    <div
      ref={rootRef}
      className={["codex-source-rich-text-input", className].filter(Boolean).join(" ")}
      role="presentation"
      data-rich-text-layout={layout === "single-line" && !isDictating ? "single-line" : "multiline"}
    />
  );
}
