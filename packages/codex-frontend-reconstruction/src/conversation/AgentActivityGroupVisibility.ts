/**
 * mk/rk and the resulting expandable condition in original
 * sites-end-resource-fa77a923096d.js nk:
 * visible=items.filter(item=>mk(item,isTurnCancelled));
 * expandable=visible.length>0&&!visible.every(rk).
 *
 * Private mh (meaningful skill read), cc (visualization), and Og (hidden
 * dynamic tool) are explicitly injected. No host permission is granted.
 */
import type { GroupActivityItem } from "./AgentActivityGroupPresentation.js";

export interface SourceGroupVisibilityHost<T extends GroupActivityItem> {
  isTurnCancelled?: boolean;
  isMeaningfulRead?: (item:T) => boolean;
  hasRenderableVisualization?: (item:T) => boolean;
  isHiddenDynamicTool?: (item:T) => boolean;
}

export function isSourceGroupRowVisible<T extends GroupActivityItem>(
  item:T,host:SourceGroupVisibilityHost<T>={},
):boolean {
  if (item.type === "patch" && item.changes != null &&
      typeof item.changes === "object" && !Array.isArray(item.changes) &&
      Object.keys(item.changes).length === 0) {
    const visualization=host.hasRenderableVisualization?.(item) === true;
    return visualization && item.success !== false &&
      (item.success === true || item.approvalRequestId != null || host.isTurnCancelled !== true);
  }
  if (item.type !== "exec" || item.parsedCmd?.isFinished === true) return true;
  if (item.parsedCmd?.type === "read") return host.isMeaningfulRead?.(item) === true;
  return item.parsedCmd?.type !== "search" && item.parsedCmd?.type !== "list_files";
}
export function getSourceExpandableGroupRows<T extends GroupActivityItem>(
  items:readonly T[],host:SourceGroupVisibilityHost<T>={},
):T[] {
  const rows=items.filter(item=>isSourceGroupRowVisible(item,host));
  return rows.length > 0 && !rows.every(item=>item.type==="dynamic-tool-call" &&
    host.isHiddenDynamicTool?.(item)===true) ? rows : [];
}
