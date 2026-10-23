import { Schema, type Node as PMNode } from "prosemirror-model";
import { EditorState, Plugin, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { splitBlock } from "prosemirror-commands";
import { sourceComposerCodeFenceInputRule, sourceComposerLinkMarkSpec, sourceComposerSafeHref } from "./SourceComposerRichExtensions.js";
import { resolveComposerEditorKeyAction, type ComposerEnterBehavior, type ComposerEditorKey } from "../conversation/ComposerEditorBehaviorModel.js";
import type { ComposerControllerPort, ComposerPastedTextPayload, ComposerPastedLinkPayload } from "../conversation/ComposerControllerContract.js";

/**
 * Recovered PLAIN-mode subset of compiled kja schema in app-initial.
 * Dja mention atoms, KCa link provenance, and the jja Markdown schema are
 * private extensions and are NOT reproduced by this adapter.
 */
export const sourcePlainComposerSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block", parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", { dir: "auto" }, 0] as const },
    code_block: {
      attrs: { autoDetectLanguage: { default: true }, language: { default: null } },
      code: true, content: "text*", defining: true, group: "block", marks: "",
      parseDOM: [{ tag: "pre", preserveWhitespace: "full", getAttrs: (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const code = element.querySelector(":scope > code");
        if (code == null) return false;
        const language = code.getAttribute("data-language");
        return { autoDetectLanguage: language == null, language };
      } }],
      toDOM: (node) => ["pre", { "data-composer-code-block": "", dir: "ltr" },
        ["code", { class: "hljs", spellcheck: "false",
          ...(node.attrs.language != null ? { "data-language": node.attrs.language } : {}) }, 0]] as const,
    },
    text: { group: "inline" },
  },
  marks: { link: sourceComposerLinkMarkSpec },
});

function documentFromText(text: string): PMNode {
  const nodes = text.replace(/\r\n?/g, "\n").split("\n")
    .map((line) => sourcePlainComposerSchema.nodes.paragraph!.create(
      null, line ? sourcePlainComposerSchema.text(line) : undefined));
  return sourcePlainComposerSchema.nodes.doc!.create(null, nodes);
}

export interface SourcePlainComposerOptions {
  initialText?: string;
  enterBehavior?: ComposerEnterBehavior;
  /** Source Yja fence input rule only, not the full jja plugin suite. */
  enableSourceCodeFenceRule?: boolean;
  /** Source rUu selected-text URL paste branch. */
  enableSelectedTextLinks?: boolean;
  onDocumentChange?: (text: string) => void;
}

/**
 * Real EditorState + EditorView following the rUu -> SUu -> EUu mount
 * contract. This is not the rich Markdown/mention editor.
 */
export class SourcePlainProseMirrorController implements ComposerControllerPort {
  readonly view: EditorView;
  initialInputFocused: boolean | undefined = false;
  private active = false;
  private ready = false;
  private composing = false;
  private disposed = false;
  private readonly onChange: ((text: string) => void) | undefined;
  private readonly enterBehavior: ComposerEnterBehavior;
  private readonly enableSourceCodeFenceRule: boolean;
  private readonly enableSelectedTextLinks: boolean;
  private submits = new Set<(timestamp?: number) => void>();
  private images = new Set<(files: readonly File[]) => void>();
  private files = new Set<(files: readonly File[], dataTransfer?: DataTransfer | null) => void>();
  private texts = new Set<(payload: ComposerPastedTextPayload) => boolean | void>();
  private links = new Set<(payload: ComposerPastedLinkPayload) => boolean | void>();

  constructor(options: SourcePlainComposerOptions = {}) {
    this.onChange = options.onDocumentChange;
    this.enterBehavior = options.enterBehavior ?? "enter";
    this.enableSourceCodeFenceRule = options.enableSourceCodeFenceRule ?? false;
    this.enableSelectedTextLinks = options.enableSelectedTextLinks ?? false;
    const owner = this;
    const events = new Plugin({
      props: {
        handleKeyDown(view, event) {
          if (event.key !== "Enter") return false;
          let key: ComposerEditorKey = "Enter";
          if (event.shiftKey) key = "Shift-Enter";
          else if (event.altKey) key = "Alt-Enter";
          else if (event.ctrlKey || event.metaKey) key = "Mod-Enter";
          const action = resolveComposerEditorKeyAction({
            key, keyCode: event.keyCode,
            isComposing: owner.composing || view.composing || event.isComposing,
            enterBehavior: owner.enterBehavior, suggestionActive: false,
            isNonWindowsCoarsePointer: false,
            documentRequiresMultilineEnter: view.state.doc.childCount > 1,
            isCodeBlock: view.state.selection.$from.parent.type.spec.code === true,
            modEnterHandledByEditor: false,
          });
          if (action === "composition-deferred") return false;
          if (action === "submit") {
            owner.requestSubmit(event.timeStamp);
            return true;
          }
          if (action === "editor-command") return splitBlock(view.state, view.dispatch, view);
          return false;
        },
        handlePaste(view, event) {
          const data = event.clipboardData;
          if (data == null) return false;
          const pasted = Array.from(data.files);
          if (pasted.length > 0) {
            const other = pasted.filter((file) => !file.type.startsWith("image/"));
            if (other.length > 0 && owner.files.size > 0) {
              for (const handler of owner.files) handler(pasted, data);
              return true;
            }
            if (other.length === 0 && owner.images.size > 0) {
              for (const handler of owner.images) handler(pasted);
              return true;
            }
            return false;
          }
          const plain = data.getData("text/plain");
          if (plain.length >= 5_000) {
            const payload: ComposerPastedTextPayload = { text: plain };
            for (const handler of owner.texts) if (handler(payload) === true) return true;
          }
          // Original rUu enableSelectedTextLinks branch: preserve selected
          // text as a link instead of replacing it with a pasted URL.
          const href = sourceComposerSafeHref(plain);
          const selection = view.state.selection;
          if (owner.enableSelectedTextLinks && href != null && !selection.empty) {
            let hasText = false;
            let hasInlineAtom = false;
            selection.content().content.descendants((node) => {
              if (node.isText && node.textContent.trim() !== "") hasText = true;
              else if (node.isInline) hasInlineAtom = true;
            });
            if (hasText && !hasInlineAtom) {
              const tr = view.state.tr.addMark(
                selection.from, selection.to,
                view.state.schema.marks.link!.create({ href }),
              );
              tr.setSelection(TextSelection.near(tr.doc.resolve(selection.to), -1));
              view.dispatch(tr);
              return true;
            }
          }
          if (/^https?:\/\/\S+$/u.test(plain) && view.state.selection.empty) {
            const payload = { text: plain, html: data.getData("text/html") };
            for (const handler of owner.links) if (handler(payload) === true) return true;
          }
          return false;
        },
        handleDrop(_view, event) {
          const transfer = event.dataTransfer;
          const dropped = transfer == null ? [] : Array.from(transfer.files);
          if (dropped.length === 0 || owner.files.size === 0) return false;
          for (const handler of owner.files) handler(dropped, transfer);
          return true;
        },
        handleDOMEvents: {
          compositionstart: () => { owner.composing = true; return false; },
          compositionend: () => { owner.composing = false; return false; },
        },
      },
    });
    this.view = new EditorView(null, {
      attributes: { role: "textbox", "aria-multiline": "true", dir: "auto",
        spellcheck: "true", tabindex: "0", "data-testid": "composer",
        "data-composing": "false", "data-source-editor": "prosemirror-plain" },
      state: EditorState.create({
        schema: sourcePlainComposerSchema,
        doc: documentFromText(options.initialText ?? ""),
        plugins: [events, ...(this.enableSourceCodeFenceRule ? [sourceComposerCodeFenceInputRule] : []), keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }), history()],
      }),
      dispatchTransaction(transaction) {
        owner.view.updateState(owner.view.state.apply(transaction));
        owner.updateEmpty();
        if (transaction.docChanged) owner.onChange?.(owner.getText());
      },
    });
    this.updateEmpty();
  }

  private updateEmpty() {
    this.view.dom.dataset.empty = this.view.state.doc.textContent.length === 0 ? "true" : "false";
  }
  private requestSubmit(timestamp?: number) {
    if (!this.ready || !this.active || this.disposed) return;
    for (const handler of this.submits) handler(timestamp);
  }
  getText() {
    const doc = this.view.state.doc;
    return doc.textBetween(0, doc.content.size, "\n");
  }
  setText(value: string) {
    if (this.disposed || this.getText() === value) return;
    const doc = documentFromText(value);
    this.view.dispatch(this.view.state.tr
      .replaceWith(0, this.view.state.doc.content.size, doc.content)
      .setMeta("addToHistory", false));
  }
  setPlaceholder(value: string | undefined) {
    if (value == null) delete this.view.dom.dataset.placeholder;
    else this.view.dom.dataset.placeholder = value;
  }
  setInputActive(active: boolean) { this.active = active; }
  clearInitialInputFocus() { this.initialInputFocused = undefined; }
  focus(position?: "end") {
    if (this.disposed) return;
    if (position === "end") this.view.dispatch(
      this.view.state.tr.setSelection(TextSelection.atEnd(this.view.state.doc)));
    this.view.focus();
  }
  addSubmitHandler(handler: (timestamp?: number) => void): () => void {
    this.submits.add(handler);
    return () => { this.submits.delete(handler); this.ready = false; this.cancelPendingSubmit(); };
  }
  cancelPendingSubmit() { /* rUu deferred-submit state not yet activated by this subset */ }
  setSubmitReady(ready: boolean) { this.ready = ready; }
  addPastedImagesHandler(handler: (files: readonly File[]) => void) { this.images.add(handler); }
  removePastedImagesHandler(handler: (files: readonly File[]) => void) { this.images.delete(handler); }
  addPastedFilesHandler(handler: (files: readonly File[], dataTransfer?: DataTransfer | null) => void) { this.files.add(handler); }
  removePastedFilesHandler(handler: (files: readonly File[], dataTransfer?: DataTransfer | null) => void) { this.files.delete(handler); }
  addPastedTextHandler(handler: (payload: ComposerPastedTextPayload) => boolean | void) { this.texts.add(handler); }
  removePastedTextHandler(handler: (payload: ComposerPastedTextPayload) => boolean | void) { this.texts.delete(handler); }
  subscribePastedLink(handler: (payload: ComposerPastedLinkPayload) => boolean | void): () => void {
    this.links.add(handler);
    return () => { this.links.delete(handler); };
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.submits.clear(); this.images.clear(); this.files.clear();
    this.texts.clear(); this.links.clear();
    this.view.destroy();
  }
}
