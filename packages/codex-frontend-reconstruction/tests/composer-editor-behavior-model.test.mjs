import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveComposerEditorKeyAction } from "../build/ComposerEditorBehaviorModel.js";

const base = {
  key: "Enter",
  isComposing: false,
  enterBehavior: "enter",
  suggestionActive: false,
  isNonWindowsCoarsePointer: false,
  documentRequiresMultilineEnter: false,
  isCodeBlock: false,
  modEnterHandledByEditor: false,
};

test("the source composition guard runs before host shortcut overrides", () => {
  assert.equal(resolveComposerEditorKeyAction({ ...base, isComposing: true, submitShortcutOverride: true }), "composition-deferred");
  assert.equal(resolveComposerEditorKeyAction({ ...base, keyCode: 229 }), "composition-deferred");
});

test("default Enter submits unless the suggestion UI owns the key", () => {
  assert.equal(resolveComposerEditorKeyAction(base), "submit");
  assert.equal(resolveComposerEditorKeyAction({ ...base, suggestionActive: true }), "suggestion-handled");
});

test("newline and cmdAlways Enter modes delegate to the editor", () => {
  assert.equal(resolveComposerEditorKeyAction({ ...base, enterBehavior: "newline" }), "editor-command");
  assert.equal(resolveComposerEditorKeyAction({ ...base, enterBehavior: "cmdAlways" }), "editor-command");
});

test("cmdIfMultiline delegates only when the source document needs multiline Enter", () => {
  assert.equal(resolveComposerEditorKeyAction({ ...base, enterBehavior: "cmdIfMultiline" }), "submit");
  assert.equal(resolveComposerEditorKeyAction({
    ...base, enterBehavior: "cmdIfMultiline", documentRequiresMultilineEnter: true,
  }), "editor-command");
  assert.equal(resolveComposerEditorKeyAction({
    ...base, enterBehavior: "cmdIfMultiline", isCodeBlock: true,
  }), "editor-command");
});

test("host submit shortcut override is applied before key-specific behavior", () => {
  assert.equal(resolveComposerEditorKeyAction({
    ...base, submitShortcutOverride: true, suggestionActive: true,
  }), "submit");
  assert.equal(resolveComposerEditorKeyAction({
    ...base, submitShortcutOverride: false,
  }), "editor-command");
});

test("Shift-Enter and Alt-Enter delegate to editor commands", () => {
  assert.equal(resolveComposerEditorKeyAction({ ...base, key: "Shift-Enter" }), "editor-command");
  assert.equal(resolveComposerEditorKeyAction({ ...base, key: "Alt-Enter" }), "editor-command");
});

test("Mod-Enter submits unless a source-confirmed exception consumes it", () => {
  assert.equal(resolveComposerEditorKeyAction({ ...base, key: "Mod-Enter" }), "submit");
  assert.equal(resolveComposerEditorKeyAction({
    ...base, key: "Mod-Enter", modEnterHandledByEditor: true,
  }), "editor-command");
  assert.equal(resolveComposerEditorKeyAction({
    ...base, key: "Mod-Enter", isNonWindowsCoarsePointer: true,
  }), "platform-handled");
  assert.equal(resolveComposerEditorKeyAction({
    ...base, key: "Mod-Enter", submitShortcutOverride: false,
  }), "editor-command");
});
