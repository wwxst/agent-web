/**
 * Keyboard focus movement for the source qbd/Mae scoped approval dropdown.
 *
 * The compiled qbd renders wa.Item menu items; in this independent host
 * the menu owns focus explicitly rather than relying on the private
 * dropdown system. This helper never invokes a permission action.
 */
export type SourceApprovalMenuMoveKey="ArrowDown"|"ArrowUp"|"Home"|"End";
export function nextSourceApprovalMenuIndex(
  key:SourceApprovalMenuMoveKey,currentIndex:number,itemCount:number,
):number|null{
  if(!Number.isInteger(itemCount)||itemCount<1)return null;
  if(key==="Home")return 0;
  if(key==="End")return itemCount-1;
  const index=Number.isInteger(currentIndex)&&currentIndex>=0&&currentIndex<itemCount
    ?currentIndex:-1;
  if(key==="ArrowDown")return index<0?0:(index+1)%itemCount;
  if(key==="ArrowUp")return index<0?itemCount-1:(index+itemCount-1)%itemCount;
  return null;
}
