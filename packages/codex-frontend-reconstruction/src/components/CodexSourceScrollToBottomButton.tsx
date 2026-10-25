import * as React from "react";

export interface CodexSourceScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

/**
 * The original thread-scroll-layout Ae/UYl pair renders a 32px circular
 * bottom-navigation button in a zero-height footer anchor. Hidden buttons
 * remain mounted, but are excluded from pointer and keyboard interaction.
 *
 * The host is responsible for the original scroll-controller threshold:
 * >24px from bottom when there is no response spacer.
 */
export function CodexSourceScrollToBottomButton({
  visible, onClick,
}: CodexSourceScrollToBottomButtonProps) {
  return (
    <div className="codex-source-scroll-to-bottom-anchor"
      data-source-scroll-to-bottom-anchor="">
      <button
        type="button"
        className="codex-source-scroll-to-bottom-button"
        data-source-scroll-to-bottom-button=""
        data-visible={visible}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={visible ? onClick : undefined}
      >
        <svg aria-hidden="true" width="18" height="18"
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v13m-5-5 5 5 5-5" />
        </svg>
      </button>
    </div>
  );
}
