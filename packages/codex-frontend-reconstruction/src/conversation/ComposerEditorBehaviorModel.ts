/**
 * Source-confirmed keyboard routing from app-initial's rUu ProseMirror factory.
 *
 * This resolves only whether the source keymap submits or delegates to an
 * editor command. It does not emulate ProseMirror commands, suggestion plugins,
 * list transformations, or the private host shortcut registry.
 */
export type ComposerEnterBehavior = "enter" | "newline" | "cmdAlways" | "cmdIfMultiline";

export type ComposerEditorKey = "Enter" | "Shift-Enter" | "Alt-Enter" | "Mod-Enter";

export interface ComposerEditorKeyContext {
  key: ComposerEditorKey;
  isComposing: boolean;
  /** Legacy IME sentinel used by the original keymap (keyCode 229). */
  keyCode?: number;
  enterBehavior: ComposerEnterBehavior;
  suggestionActive: boolean;
  /**
   * The host's setSubmitShortcutOverride callback result for this key event.
   * true submits before the normal keymap; false suppresses submission.
   */
  submitShortcutOverride?: boolean;
  /** Source iUu() branch: non-Windows coarse-pointer devices. */
  isNonWindowsCoarsePointer: boolean;
  /** Source bwa(doc) result, injected because a plain model cannot inspect a PM doc. */
  documentRequiresMultilineEnter: boolean;
  isCodeBlock: boolean;
  /** Source oVu(view, dispatch) result for Mod-Enter with enterBehavior="enter". */
  modEnterHandledByEditor: boolean;
}

export type ComposerEditorKeyAction =
  | "submit"
  | "editor-command"
  | "suggestion-handled"
  | "platform-handled"
  | "composition-deferred";

/**
 * Ports rUu's observable submit-vs-editor-command decision in the same order:
 * composition guard -> host shortcut override -> key-specific source branches.
 */
export function resolveComposerEditorKeyAction(
  context: ComposerEditorKeyContext,
): ComposerEditorKeyAction {
  if (context.isComposing || context.keyCode === 229) {
    return "composition-deferred";
  }

  if (context.submitShortcutOverride === true) {
    return "submit";
  }

  if (context.key === "Shift-Enter" || context.key === "Alt-Enter") {
    return "editor-command";
  }

  if (context.key === "Enter") {
    if (context.suggestionActive) {
      return "suggestion-handled";
    }
    if (
      context.submitShortcutOverride === false ||
      context.isNonWindowsCoarsePointer
    ) {
      return "editor-command";
    }

    switch (context.enterBehavior) {
      case "newline":
      case "cmdAlways":
        return "editor-command";
      case "cmdIfMultiline":
        return context.documentRequiresMultilineEnter || context.isCodeBlock
          ? "editor-command"
          : "submit";
      case "enter":
      default:
        return "submit";
    }
  }

  if (context.submitShortcutOverride === false) {
    return "editor-command";
  }
  if (context.isNonWindowsCoarsePointer) {
    return "platform-handled";
  }
  if (context.enterBehavior === "enter" && context.modEnterHandledByEditor) {
    return "editor-command";
  }
  return "submit";
}
