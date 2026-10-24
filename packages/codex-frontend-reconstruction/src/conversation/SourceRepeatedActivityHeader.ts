/**
 * Original XO/V_ repeated activity disclosure header selection in
 * sites-end-resource-fa77a923096d.js.
 *
 * XO first requests the private _m recognized Codex action descriptor.
 * Recognized action => action message + independent call count; otherwise
 * resolve the regular MCP tool title through KO. V_ has a separate external
 * event summary. The host supplies both private data resolvers.
 */
import type { SourceRepeatedActivityRow, SourceRepeatedItem } from "./SourceRepeatedActivityGroups.js";

export interface SourceRecognizedMcpAction {
  /** Source _m returns an intl descriptor; the host owns interpolation. */
  message: { id: string; defaultMessage: string; values?: Record<string, unknown> };
  /** Renderer-specific icon identity; do not fabricate a private asset. */
  iconKey?: string;
}

export type SourceRepeatedHeader<T extends SourceRepeatedItem> =
  | { variant:"mcp-tool"; item:T; count:number }
  | { variant:"codex-action"; item:T; count:number; action:SourceRecognizedMcpAction }
  | { variant:"external-event"; item:T; count:number; sourceLabel:string };

export interface SourceRepeatedHeaderHost<T extends SourceRepeatedItem> {
  /** Source _m: private recognized action lookup with resolved Apps metadata. */
  getRecognizedAction?(item:T): SourceRecognizedMcpAction | null | undefined;
}

export function projectSourceRepeatedHeader<T extends SourceRepeatedItem>(
  row:SourceRepeatedActivityRow<T>,
  host:SourceRepeatedHeaderHost<T>={},
):SourceRepeatedHeader<T> | null {
  const item=row.items[0];
  if(item == null || row.items.length < 2 || row.kind === "single") return null;
  if(row.kind==="external-event")
    return {variant:"external-event",item,count:row.items.length,
      sourceLabel:typeof item.sourceLabel==="string" ? item.sourceLabel : ""};
  const action=host.getRecognizedAction?.(item);
  return action == null ? {variant:"mcp-tool",item,count:row.items.length}
    :{variant:"codex-action",item,count:row.items.length,action};
}
