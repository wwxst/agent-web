import * as React from "react";
import {
  projectSourceWorkStatus,
  type SourceWorkStatusInput,
} from "../conversation/SourceWorkStatusModel.js";

/** Original SG status label, mounted inside historical Rk activity content.
 * The demo renders English only, with source's 1s live-working update cadence.
 */
export function CodexSourceWorkStatus({
  item, className,
}: {item: SourceWorkStatusInput; className?: string}) {
  const [now,setNow]=React.useState(()=>Date.now());
  React.useEffect(()=>{
    if(item.status!=="working" || typeof item.completedAtMs==="number")return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[item.status,item.completedAtMs]);
  const presentation=projectSourceWorkStatus(item,now);
  if(presentation==null)return null;
  return <span className={className??"codex-source-work-status"}
    data-source-work-status={presentation.status}
    data-source-work-elapsed-ms={presentation.elapsedMs??undefined}
    role={presentation.status==="loading"?"status":undefined}>
    {presentation.label}
  </span>;
}
