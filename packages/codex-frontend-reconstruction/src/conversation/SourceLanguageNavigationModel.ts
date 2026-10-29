/**
 * Source: review-file-source-breadcrumb-987458adbcad.js and
 * .vite/build/main-C4DYk222.js in the supplied Codex frontend bundle.
 *
 * The original capability contract is {hover, locationKinds}; location
 * requests use LSP zero-based positions and the supported kinds are gated by
 * the language server's advertised capabilities. This model validates that
 * host result before it reaches the renderer.
 */
export const SOURCE_LANGUAGE_LOCATION_KINDS=[
  "definition","typeDefinition","implementation","references",
] as const;
export type SourceLanguageLocationKind=
  typeof SOURCE_LANGUAGE_LOCATION_KINDS[number];
export interface SourceLanguagePosition{
  line:number;
  character:number;
}
export interface SourceLanguageRange{
  start:SourceLanguagePosition;
  end?:SourceLanguagePosition;
}
export interface SourceLanguageLocation{
  path:string;
  range:SourceLanguageRange;
}
export interface SourceLanguageCapabilities{
  hover:boolean;
  locationKinds:readonly SourceLanguageLocationKind[];
}
export interface SourceLanguageCapabilitiesRequest{
  path:string;
  languageId:string;
}
export interface SourceLanguageLocationsRequest{
  path:string;
  languageId:string;
  kind:SourceLanguageLocationKind;
  position:SourceLanguagePosition;
}
const MAX_PATH_LENGTH=4096;
const MAX_POSITION=9_999_999;
const locationKindSet=new Set<string>(SOURCE_LANGUAGE_LOCATION_KINDS);
function isRecord(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function validPath(value:unknown):value is string{
  return typeof value==="string"&&value.length>0&&value.length<=MAX_PATH_LENGTH&&
    !/[\u0000-\u001f\u007f]/u.test(value);
}
function validPosition(value:unknown):value is SourceLanguagePosition{
  return isRecord(value)&&Number.isSafeInteger(value.line)&&
    (value.line as number)>=0&&(value.line as number)<=MAX_POSITION&&
    Number.isSafeInteger(value.character)&&
    (value.character as number)>=0&&(value.character as number)<=MAX_POSITION;
}
/** Maps only language IDs confirmed by the original TypeScript LSP provider. */
export function sourceLanguageIdForPath(path:string):string|null{
  const name=path.replace(/\\/g,"/").split("/").at(-1)??"";
  const extension=name.split(".").at(-1)?.toLowerCase();
  switch(extension){
    case "ts":return "typescript";
    case "tsx":return "typescriptreact";
    case "js":case "mjs":case "cjs":return "javascript";
    case "jsx":return "javascriptreact";
    default:return null;
  }
}
/** Fail closed: unknown capability names never create UI actions. */
export function sourceLanguageCapabilities(value:unknown):SourceLanguageCapabilities|null{
  if(!isRecord(value))return null;
  const locationKinds=Array.isArray(value.locationKinds)
    ?[...new Set(value.locationKinds.filter(
      (kind):kind is SourceLanguageLocationKind=>
        typeof kind==="string"&&locationKindSet.has(kind)))]
    :[];
  return {hover:value.hover===true,locationKinds};
}
/** Keep only structurally valid locations; host-side grant checks remain mandatory. */
export function sourceLanguageLocations(value:unknown):SourceLanguageLocation[]{
  if(!Array.isArray(value))return [];
  const locations:SourceLanguageLocation[]=[];
  for(const candidate of value){
    if(!isRecord(candidate)||!validPath(candidate.path)||
      hasTraversalSegment(candidate.path)||
      !(candidate.path.startsWith("/")||/^[A-Za-z]:[\\\\/]/u.test(candidate.path)||
        candidate.path.startsWith("\\\\"))||
      !isRecord(candidate.range)||!validPosition(candidate.range.start))continue;
    const range:SourceLanguageRange={start:{
      line:candidate.range.start.line,character:candidate.range.start.character,
    }};
    if(validPosition(candidate.range.end))range.end={
      line:candidate.range.end.line,character:candidate.range.end.character,
    };
    locations.push({path:candidate.path,range});
    if(locations.length>=10_000)break;
  }
  return locations;
}
function normalizePath(path:string):string{
  const slash=path.replace(/\\/g,"/");
  return slash.startsWith("//")
    ?"//"+slash.slice(2).replace(/\/{2,}/g,"/")
    :slash.replace(/\/{2,}/g,"/");
}
function hasTraversalSegment(path:string):boolean{
  return normalizePath(path).split("/").some(segment=>
    segment==="."||segment==="..");
}
function isWindowsPath(path:string):boolean{
  const normalized=normalizePath(path);
  return /^[A-Za-z]:\//u.test(normalized)||normalized.startsWith("//");
}
function comparable(path:string,windows:boolean):string{
  const normalized=normalizePath(path).replace(/\/$/u,"");
  return windows?normalized.toLowerCase():normalized;
}
/** Derives the display root from a native path and its already-returned relative path. */
export function sourceWorkspaceRootFromPath(
  path:string,relativePath:string,
):string|null{
  if(!validPath(path)||!validPath(relativePath))return null;
  const absolute=normalizePath(path);
  const relative=normalizePath(relativePath).replace(/^\//u,"");
  if(absolute===relative)return "";
  const suffix="/"+relative;
  if(!absolute.endsWith(suffix))return null;
  const root=absolute.slice(0,-suffix.length);
  return root||"/";
}
/** LSP targets must remain in the currently granted preview root. */
export function sourceLanguageLocationIsWithinRoot(
  path:string,root:string,
):boolean{
  if(!validPath(path)||hasTraversalSegment(path)||
    typeof root!=="string"||root.length===0||hasTraversalSegment(root))return false;
  const windows=isWindowsPath(root)||isWindowsPath(path);
  const target=comparable(path,windows);
  const base=comparable(root,windows);
  return target===base||target.startsWith(base+"/");
}
export function sourceRelativeLanguageLocationPath(
  path:string,root:string,
):string{
  if(!sourceLanguageLocationIsWithinRoot(path,root))return path;
  const normalized=normalizePath(path);
  const base=normalizePath(root).replace(/\/$/u,"");
  return normalized===base?normalized.slice(normalized.lastIndexOf("/")+1):
    normalized.slice(base.length+1);
}
