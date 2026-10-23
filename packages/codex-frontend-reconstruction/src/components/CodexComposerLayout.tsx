import * as React from "react";
import type { ReactNode } from "react";

/**
 * Semantic reconstruction of the *layout* contract found in the original
 * Windows Codex frontend's app-initial JS and CSS bundles.
 *
 * This is NOT the original editor implementation. The caller supplies the
 * actual input/control nodes and retains responsibility for submission,
 * attachments, permission requests and host integration.
 *
 * Verified source: app-initial-5851df3f6cb1.js
 *   kcr: ComposerLayoutRoot/Body/Input/Footer/Attachments symbols
 *   Pcr: multiline => stacked footer, single-line => inline (responsive)
 *   Hcr: data-composer-layout / data-composer-rows / data-composer-spacing
 *   root JSX: density, radius, surface, utility bar, layout attributes
 * Verified CSS: app-initial-e7c27dd40beb.css
 */
export type ComposerLayoutKind = "multiline" | "single-line";
export type ComposerDensity = "comfortable" | "compact";
export type ComposerRadiusVariant = "default" | "large";
export type ComposerSurfaceVariant = "default" | "opaque";
export type ComposerFooterRows = "stacked" | "inline" | "responsive";
export type ComposerUtilityBarVariant = "home"; // other values unverified

export interface CodexComposerLayoutProps {
  input: ReactNode;
  leadingControls?: ReactNode;
  trailingControls?: ReactNode;
  attachments?: ReactNode;
  replyContext?: ReactNode;
  layout?: ComposerLayoutKind;
  density?: ComposerDensity;
  radiusVariant?: ComposerRadiusVariant;
  surfaceVariant?: ComposerSurfaceVariant;
  utilityBarVariant?: ComposerUtilityBarVariant;
  /** Explicit when the host knows actual dictation/responsive conditions. */
  footerRows?: ComposerFooterRows;
  className?: string;
}

/** Pcr in app-initial selects 'stacked' for multiline and 'inline' otherwise. */
export function getComposerFooterRows(
  layout: ComposerLayoutKind,
  override?: ComposerFooterRows,
): ComposerFooterRows {
  return override ?? (layout === "multiline" ? "stacked" : "inline");
}

export function CodexComposerLayout({
  input,
  leadingControls,
  trailingControls,
  attachments,
  replyContext,
  layout = "multiline",
  density = "comfortable",
  radiusVariant = "default",
  surfaceVariant = "default",
  utilityBarVariant,
  footerRows,
  className,
}: CodexComposerLayoutProps) {
  const rows = getComposerFooterRows(layout, footerRows);

  return (
    <div
      className={["codex-composer-layout", className].filter(Boolean).join(" ")}
      role="presentation"
      data-composer-layout={layout}
      data-composer-density={density}
      data-composer-radius-variant={radiusVariant}
      data-composer-surface-variant={surfaceVariant}
      data-composer-utility-bar-variant={utilityBarVariant}
      data-composer-surface-overflow="visible"
    >
      <div className="codex-composer-layout__body" data-composer-layout={layout}>
        {replyContext != null && (
          <div className="codex-composer-layout__reply-context">{replyContext}</div>
        )}
        {attachments != null && (
          <div className="codex-composer-layout__attachments" data-visible-attachments="">
            {attachments}
          </div>
        )}
        <div className="codex-composer-layout__input" data-composer-input="" data-composer-layout={layout}>
          {input}
        </div>
        <div
          className="codex-composer-layout__footer"
          data-composer-layout={layout}
          data-composer-rows={rows}
          data-composer-spacing="default"
        >
          <div className="codex-composer-layout__leading">{leadingControls}</div>
          <div className="codex-composer-layout__trailing">{trailingControls}</div>
        </div>
      </div>
    </div>
  );
}
