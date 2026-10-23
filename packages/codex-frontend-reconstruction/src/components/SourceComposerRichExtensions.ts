import type { MarkSpec } from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";

/**
 * A deliberately narrow restored KCa link-mark subset from app-initial.
 * The original uses a custom VCa DOM renderer and ICa/xa URL helpers; this
 * uses a safe upstream-ProseMirror representation, not those private helpers.
 */
export function sourceComposerSafeHref(value: string): string | null {
  const candidate = value.trim();
  if (candidate.length === 0 || /\s/u.test(candidate)) return null;
  try {
    const protocol = new URL(candidate).protocol.toLowerCase();
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:"
      ? candidate : null;
  } catch {
    return null;
  }
}

export const sourceComposerLinkMarkSpec: MarkSpec = {
  attrs: {
    href: { default: null },
    title: { default: null },
    isAutolink: { default: false },
    literalMarkdownOccurrenceId: { default: null },
    literalMarkdownSource: { default: null },
    sourceAppId: { default: null },
    isGeneratedAutolink: { default: false },
  },
  inclusive: false,
  parseDOM: [
    {
      tag: "a[href]",
      getAttrs(element) {
        if (!(element instanceof HTMLElement)) return false;
        const href = sourceComposerSafeHref(element.getAttribute("href") ?? "");
        if (href == null) return false;
        return { href, title: element.getAttribute("title") };
      },
    },
    {
      tag: "span[text-link-href]",
      getAttrs(element) {
        if (!(element instanceof HTMLElement)) return false;
        const href = sourceComposerSafeHref(element.getAttribute("text-link-href") ?? "");
        if (href == null) return false;
        return {
          href,
          title: element.getAttribute("text-link-title"),
          isAutolink: element.hasAttribute("data-breakable-url"),
          isGeneratedAutolink: element.hasAttribute("data-rich-text-generated-autolink"),
        };
      },
    },
  ],
  toDOM(mark) {
    // The source's VCa adds private link decorations/icons; do not invent them.
    const href = sourceComposerSafeHref(mark.attrs.href ?? "");
    return ["a", {
      ...(href == null ? {} : { href }),
      ...(mark.attrs.title == null ? {} : { title: mark.attrs.title }),
      rel: "noopener noreferrer",
    }, 0];
  },
};

/**
 * The exact extra Yja input-rule condition: /\x60\x60\x60$/ at the end of
 * a depth-one paragraph inserts an empty code block after that paragraph.
 * This upstream plugin is isolated from the private jja rich extension set.
 */
export const sourceComposerCodeFenceInputRule = new Plugin({
  props: {
    handleTextInput(view, from, to, text) {
      if (text !== "`" || from !== to || view.composing) return false;
      const { state } = view;
      const { $from, empty } = state.selection;
      if (!empty || $from.depth !== 1 ||
          $from.parent.type !== state.schema.nodes.paragraph ||
          $from.parentOffset !== $from.parent.content.size ||
          !$from.parent.textContent.endsWith("``") ||
          from < 2) return false;
      const tr = state.tr.delete(from - 2, to);
      const after = tr.mapping.map($from.after());
      tr.insert(after, state.schema.nodes.code_block!.create());
      tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
      view.dispatch(tr);
      return true;
    },
  },
});
