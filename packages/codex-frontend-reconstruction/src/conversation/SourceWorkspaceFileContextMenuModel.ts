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
  /** Narrow independent Electron host cannot copy a path without a root. */
  requiresAbsoluteCopyPath?:boolean;
  /** Independent native read requires a real absolute local resource path;
   * a source-relative path may still be copied using its cwd, but cannot be
   * read until an authenticated host resolves it. */
  requiresAbsoluteReadPath?:boolean;
}
export interface SourceWorkspaceFileMenuItem {
  id:SourceWorkspaceFileMenuActionId;
  message:"Open file"|"Copy path"|"Copy file contents";
}
/**
 * Original SXo computes: C = cwd == null ? path : Va(cwd, path).
 * app-initial Va imports app-shared's VR = q2:
 *   q2(cwd,path) = J2(K2(path)) || K2(cwd)===""
 *     ? Z6e(K2(path)) : Z6e($6e(K2(cwd), K2(path)))
 * K2 replaces Windows backslashes (after extended-prefix cleanup); $6e
 * joins without resolving .., and Z6e prefixes / to Windows drive paths.
 * This is the text passed to Oi.clipboard.writeText, NOT a filesystem
 * canonicalization or security grant.
 */
function sourceFilePathForJoin(input:string):string {
  const unc=input.match(/^\\\\\?\\UNC\\(.*)$/i);
  if(unc!=null)return ("\\\\"+unc[1]).replace(/\\/g,"/");
  const drive=input.match(/^\\\\\?\\([A-Za-z]:[\\/].*)$/);
  return (drive?.[1]??input).replace(/\\/g,"/");
}
function sourceFileAbsolute(input:string):boolean {
  return (input.startsWith("/")&&!input.startsWith("//"))||
    /^[A-Za-z]:\//.test(input)||/^\/\/[^/]+\/[^/]+/.test(input);
}
export function sourceWorkspaceFileCopyPath(route:SourceUserFileRoute):string|null {
  if(route.kind!=="workspace")return null;
  const {cwd,path}=route.qe;
  if(cwd==null)return path; // SXo does not invoke Va if cwd is absent.
  const normalizedCwd=sourceFilePathForJoin(cwd);
  const normalizedPath=sourceFilePathForJoin(path);
  const joined=sourceFileAbsolute(normalizedPath)||normalizedCwd===""
    ?normalizedPath
    :normalizedCwd.replace(/\/+$/,"")+"/"+normalizedPath.replace(/^\/+/,"");
  // Source Z6e: Windows drives become /C:/... even if cwd had backslashes.
  return /^[A-Za-z]:\//.test(joined)?"/"+joined:joined;
}
/** An independent native host requires an absolute path to copy. SXo's
 * private clipboard service can also copy relative paths; do not pretend
 * that the independent Electron host supports that broader operation. */
export function isSourceWorkspaceAbsoluteCopyPath(path:string):boolean {
  const normalized=sourceFilePathForJoin(path);
  return sourceFileAbsolute(normalized);
}

export function sourceWorkspaceFileContextMenuItems(
  route:SourceUserFileRoute,
  capabilities:SourceWorkspaceFileContextMenuCapabilities={},
):readonly SourceWorkspaceFileMenuItem[] {
  if(route.kind!=="workspace")return [];
  const items:SourceWorkspaceFileMenuItem[]=[];
  if(route.qe.openInSidePanel&&capabilities.viewFile===true)
    items.push({id:"workspace-file-view-file",message:"Open file"});
  if(capabilities.copyPath===true&&
    (!capabilities.requiresAbsoluteCopyPath||
      isSourceWorkspaceAbsoluteCopyPath(sourceWorkspaceFileCopyPath(route)??"")))
    items.push({id:"workspace-file-copy-path",message:"Copy path"});
  if(capabilities.copyContents===true&&capabilities.openMode!=="workspace"&&
    (!capabilities.requiresAbsoluteReadPath||
      isSourceWorkspaceAbsoluteCopyPath(route.qe.path)))
    items.push({id:"workspace-file-copy-contents",message:"Copy file contents"});
  return items;
}
