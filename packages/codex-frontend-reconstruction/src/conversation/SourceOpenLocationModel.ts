/**
 * Original app-initial-5851df3f6cb1.js file-preview onOpenLocation adapter.
 *
 * The language service reports a zero-based LSP Range. The original file-tab
 * route converts range.start.line/character to one-based line/column and
 * forces resetTabState so a new navigation beats a stale scroll snapshot.
 * Only the local renderer's already-granted, read-only preview consumes this
 * request; column and resetTabState are never native filesystem arguments.
 */
export interface SourceOpenLocation {
  path:string;
  range:{
    start:{line:number;character:number};
    end?:{line:number;character:number};
  };
}
export interface SourceOpenLocationRequest {
  path:string;
  line:number;
  column:number;
  resetTabState:true;
}
const MAX_ZERO_BASED_POSITION=9_999_999;
function isRecord(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function isZeroBasedPosition(value:unknown):value is {line:number;character:number}{
  if(!isRecord(value))return false;
  return Number.isSafeInteger(value.line)&&
    (value.line as number)>=0&&(value.line as number)<=MAX_ZERO_BASED_POSITION&&
    Number.isSafeInteger(value.character)&&
    (value.character as number)>=0&&(value.character as number)<=MAX_ZERO_BASED_POSITION;
}
/**
 * Projects only the source-confirmed fields needed by the local preview.
 * The range end is intentionally not forwarded: the original callback opens
 * at range.start and does not pass endLine to IX.
 */
export function sourceOpenLocationRequest(
  location:unknown,
):SourceOpenLocationRequest|null{
  if(!isRecord(location)||typeof location.path!=="string"||
    location.path.length===0||location.path.length>4096||
    /[\u0000-\u001f\u007f]/u.test(location.path)||
    !isRecord(location.range)||!isZeroBasedPosition(location.range.start))
    return null;
  return {
    path:location.path,
    line:location.range.start.line+1,
    column:location.range.start.character+1,
    resetTabState:true,
  };
}
