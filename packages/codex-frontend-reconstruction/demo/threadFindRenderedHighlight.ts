import {
  SOURCE_USER_MESSAGE_FIND_REVEAL_EVENT,
  type SourceUserMessageFindRevealDetail,
} from "../src/components/CodexSourceCollapsibleUserMessage.js";

/**
 * Standalone visible-message adapter for source iFt/xFt conversation find.
 *
 * The compiled app uses its own private worker, offsets, and render highlights.
 * This module deliberately does not claim to reproduce them. It highlights a
 * matched, already-mounted Markdown message by CSS Highlight API without
 * changing React-owned DOM, virtualizer rows or host conversation events.
 *
 * A source match in a collapsed activity or otherwise non-rendered field must
 * NOT be silently marked as a different visible occurrence. We only highlight
 * when the visible Markdown occurrence count agrees with the source row count.
 */
export const DEMO_ACTIVE_THREAD_FIND_HIGHLIGHT = "demo-thread-find-active";

type HighlightRegistry = {set(name: string, highlight: unknown): unknown; delete(name: string): boolean};
type HighlightConstructor = new (...ranges: Range[]) => unknown;
type TextSlice = {node: Text; start: number; end: number};

function browserHighlights(): {registry: HighlightRegistry; Constructor: HighlightConstructor} | null {
  if (typeof CSS === "undefined" || typeof window === "undefined") return null;
  const registry = (CSS as unknown as {highlights?: HighlightRegistry}).highlights;
  const Constructor = (window as unknown as {Highlight?: HighlightConstructor}).Highlight;
  return registry != null && typeof Constructor === "function" ? {registry, Constructor} : null;
}

export function clearDemoThreadFindHighlight(): void {
  browserHighlights()?.registry.delete(DEMO_ACTIVE_THREAD_FIND_HIGHLIGHT);
}

function findRenderedMarkdownRanges(markdown: Element, query: string): Range[] {
  const parts: TextSlice[] = [];
  let visibleText = "";
  const walker = document.createTreeWalker(markdown, NodeFilter.SHOW_TEXT);
  for (let candidate = walker.nextNode(); candidate != null; candidate = walker.nextNode()) {
    if (!(candidate instanceof Text) || !candidate.data) continue;
    if (candidate.parentElement?.closest("[hidden], [aria-hidden='true'], button, input, textarea, [contenteditable='true']")) continue;
    const start = visibleText.length;
    visibleText += candidate.data;
    parts.push({node: candidate, start, end: visibleText.length});
  }
  const haystack = visibleText.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  const ranges: Range[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length && needle.length > 0) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    const end = at + needle.length;
    // Case-folded strings may change UTF-16 length (e.g. İ). Without
    // source-compatible offsets never highlight a different substring.
    const first = parts.find(part => part.start <= at && at < part.end);
    const last = parts.find(part => part.start < end && end <= part.end);
    if (first != null && last != null && visibleText.slice(at, end).toLocaleLowerCase() === needle) {
      const range = document.createRange();
      range.setStart(first.node, at - first.start);
      range.setEnd(last.node, end - last.start);
      if (range.getClientRects().length > 0) ranges.push(range);
    }
    from = end;
  }
  return ranges;
}

export interface DemoThreadFindVisibleTarget {
  viewport: HTMLElement;
  turnKey: string;
  query: string;
  ordinalWithinTurn: number;
  expectedRowMatches: number;
}

/** Source _u reveal registration is owned by the exact user-message
 * component, not the search provider. Dispatch to that component only
 * if the original source match's raw offset belongs to its full text.
 * React flushes the disclosure before the visible Markdown highlight runs.
 */
export function revealCollapsedDemoThreadFindMatch(
  target:Pick<DemoThreadFindVisibleTarget,"viewport"|"turnKey"|"query"> & {
    sourceOffset:number;
    sourceLength:number;
  },
):boolean {
  const row=Array.from(target.viewport.querySelectorAll<HTMLElement>("[data-turn-key]"))
    .find(element=>element.dataset.turnKey===target.turnKey);
  if(row==null)return false;
  // Source search may match tool output in the same turn; do not reveal
  // unrelated user messages, nor guess offsets in non-user blocks.
  const users=row.querySelectorAll<HTMLElement>(
    '[data-conversation-message="user"] [data-source-user-message-collapsible="true"]',
  );
  if(users.length!==1)return false;
  const payload:SourceUserMessageFindRevealDetail={
    query:target.query,sourceOffset:target.sourceOffset,
    sourceLength:target.sourceLength,
  };
  const event=new CustomEvent<SourceUserMessageFindRevealDetail>(
    SOURCE_USER_MESSAGE_FIND_REVEAL_EVENT,
    {detail:payload,cancelable:true},
  );
  users[0]!.dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * Returns false when the target is not mounted/visible or CSS Highlights are
 * unsupported. This is intentional: search/scroll still works without
 * decorating a different match or inventing a fake result.
 */
export function highlightRenderedDemoThreadFindMatch(target: DemoThreadFindVisibleTarget): boolean {
  clearDemoThreadFindHighlight();
  const api = browserHighlights();
  if (api == null || !target.query || target.expectedRowMatches < 1) return false;
  const virtualRow = Array.from(target.viewport.querySelectorAll<HTMLElement>("[data-turn-key]"))
    .find(element => element.getAttribute("data-turn-key") === target.turnKey);
  if (virtualRow == null) return false;
  const ranges = Array.from(virtualRow.querySelectorAll(".demo-markdown"))
    .flatMap(markdown => findRenderedMarkdownRanges(markdown, target.query));
  if (ranges.length !== target.expectedRowMatches) return false;
  const range = ranges[target.ordinalWithinTurn];
  if (range == null) return false;
  api.registry.set(DEMO_ACTIVE_THREAD_FIND_HIGHLIGHT, new api.Constructor(range));
  const rect = range.getBoundingClientRect();
  const viewportRect = target.viewport.getBoundingClientRect();
  if (rect.top < viewportRect.top + 24 || rect.bottom > viewportRect.bottom - 24) {
    target.viewport.scrollTop += rect.top - viewportRect.top - target.viewport.clientHeight / 2;
  }
  return true;
}
