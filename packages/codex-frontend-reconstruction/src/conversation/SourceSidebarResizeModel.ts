/**
 * Original app-initial sidebar: tb width clamp, sbi/lbi keyboard values,
 * BYt/sidebar-width persistence boundary. Do not implement private BYt here.
 */
export const SOURCE_SIDEBAR_MIN_WIDTH=240;
export const SOURCE_SIDEBAR_MAX_WIDTH=520;
export const SOURCE_SIDEBAR_DEFAULT_WIDTH=340;
export const SOURCE_SIDEBAR_KEYBOARD_STEP=10;
export function sourceSidebarMaxWidth(mainContentWidth:number):number {
  const available=Number.isFinite(mainContentWidth)?mainContentWidth:Infinity;
  return Math.max(SOURCE_SIDEBAR_MIN_WIDTH,
    Math.min(SOURCE_SIDEBAR_MAX_WIDTH,available-SOURCE_SIDEBAR_MIN_WIDTH));
}
export function clampSourceSidebarWidth(width:number,mainContentWidth=Infinity):number {
  if(!Number.isFinite(width))return SOURCE_SIDEBAR_DEFAULT_WIDTH;
  return Math.max(SOURCE_SIDEBAR_MIN_WIDTH,
    Math.min(width,sourceSidebarMaxWidth(mainContentWidth)));
}
export function sourceSidebarWidthFromKey(
  width:number,key:string,mainContentWidth=Infinity,
):number|null {
  const max=sourceSidebarMaxWidth(mainContentWidth);
  switch(key){
    case "Home":return SOURCE_SIDEBAR_MIN_WIDTH;
    case "End":return max;
    case "ArrowLeft":return clampSourceSidebarWidth(width-SOURCE_SIDEBAR_KEYBOARD_STEP,mainContentWidth);
    case "ArrowRight":return clampSourceSidebarWidth(width+SOURCE_SIDEBAR_KEYBOARD_STEP,mainContentWidth);
    default:return null;
  }
}


/** Original app-initial persisted left-panel width key. */
export const SOURCE_SIDEBAR_WIDTH_STORAGE_KEY="sidebar-width";

/** Decode the source local-storage preference, accepting its numeric JSON form. */
export function sourceSidebarWidthFromPreference(
  storedValue:string|null,mainContentWidth=Infinity,
):number {
  if(storedValue==null||storedValue.trim().length===0)
    return clampSourceSidebarWidth(SOURCE_SIDEBAR_DEFAULT_WIDTH,mainContentWidth);
  let parsed:unknown;
  try{parsed=JSON.parse(storedValue);}catch{parsed=Number(storedValue);}
  const width=typeof parsed==="number"?parsed:
    typeof parsed==="string"&&parsed.trim().length>0?Number(parsed):NaN;
  return clampSourceSidebarWidth(width,mainContentWidth);
}
