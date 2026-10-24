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
