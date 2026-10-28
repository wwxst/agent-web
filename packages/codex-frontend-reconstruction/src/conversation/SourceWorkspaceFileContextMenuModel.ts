import type {SourceUserFileRoute} from "./SourceUserFileQeRouteModel.js";

/**
 * Actual original xXo -> SXo source in app-initial-5851df3f6cb1.js.
 * The workspace-file-context-menu-trigger wrapper imports xXo as jTt.
 * Do not confuse that export alias with the unrelated local jTt symbol.
 *
 * Source order (conditional):
 *  workspace-file-view-file / workspace-file-view-browser,
 *  workspace-file-open-targets, workspace-file-open-in-github,
 *  workspace-file-open-target-separator,
 *  workspace-file-save-as, workspace-file-copy-path,
 *  workspace-file-copy-contents, workspace-file-reveal-path.
 *
 * The independently reconstructed Electron host only has read-only
 * user-consented access and clipboard APIs. Other original services
 * are not present. Never expose actions lacking an actual capability.
 */
export type SourceWorkspaceFileMenuActionId =
  |"workspace-file-view-file"
  |"workspace-file-copy-path"
  |"workspace-file-copy-contents";
export interface SourceWorkspaceFileContextMenuCapabilities {
  /** Authenticated file-preview host only, never inferred by suffix. */
  viewFile?:boolean;
  /** Actual clipboard writer must be provided. */
  copyPath?:boolean;
  /** Actual read authority + clipboard writer must both exist. */
  copyContents?:boolean;
  /** Original source SXo omits copy-contents in workspace openMode. */
  openMode?:"workspace"|string;
}
export interface SourceWorkspaceFileMenuItem {
  id:SourceWorkspaceFileMenuActionId;
  message:"Open file"|"Copy path"|"Copy file contents";
}
export function sourceWorkspaceFileContextMenuItems(
  route:SourceUserFileRoute,
  capabilities:SourceWorkspaceFileContextMenuCapabilities={},
):readonly SourceWorkspaceFileMenuItem[] {
  if(route.kind!=="workspace")return [];
  const items:SourceWorkspaceFileMenuItem[]=[];
  if(route.qe.openInSidePanel&&capabilities.viewFile===true)
    items.push({id:"workspace-file-view-file",message:"Open file"});
  if(capabilities.copyPath===true)
    items.push({id:"workspace-file-copy-path",message:"Copy path"});
  if(capabilities.copyContents===true&&capabilities.openMode!=="workspace")
    items.push({id:"workspace-file-copy-contents",message:"Copy file contents"});
  return items;
}
