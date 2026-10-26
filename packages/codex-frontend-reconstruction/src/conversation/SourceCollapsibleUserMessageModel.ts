/** Source: collapsible-user-message-content-53649d62c3a8.js.
 * O=20 default line count; k=512 characters per collapsed line. The
 * original DE hook also measures rendered overflow to handle Markdown.
 */
export const SOURCE_USER_MESSAGE_COLLAPSED_LINES = 20;
export const SOURCE_USER_MESSAGE_CHARS_PER_LINE = 512;

export function sourceUserMessagePrefixLimit(
  lines = SOURCE_USER_MESSAGE_COLLAPSED_LINES,
): number {
  return Math.max(1,Math.floor(lines))*SOURCE_USER_MESSAGE_CHARS_PER_LINE;
}

/** The private DE measurement hook is represented by the actual rendered
 * inner content height supplied by the view's DOM measurement observer. */
export function shouldCollapseSourceUserMessage(input:{
  textLength: number;
  renderedContentHeightPx: number;
  lineHeightPx: number;
  collapsedLines?: number;
}): boolean {
  const lines=Math.max(1,Math.floor(input.collapsedLines??
    SOURCE_USER_MESSAGE_COLLAPSED_LINES));
  if(input.textLength > sourceUserMessagePrefixLimit(lines))return true;
  if(!Number.isFinite(input.renderedContentHeightPx) ||
     !Number.isFinite(input.lineHeightPx) ||
      input.lineHeightPx<=0)return false;
  return input.renderedContentHeightPx > lines*input.lineHeightPx + 1;
}

export function sourceUserMessageVisibleText(
  text: string,
  collapsed: boolean,
  lines = SOURCE_USER_MESSAGE_COLLAPSED_LINES,
): string {
  return collapsed && text.length>sourceUserMessagePrefixLimit(lines)
    ? text.slice(0,sourceUserMessagePrefixLimit(lines)) : text;
}
