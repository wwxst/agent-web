import * as React from "react";
import {ConnectedLiveConversationTranscript} from "../src/components/ConnectedLiveConversationTranscript.js";
import {createLiveConversationSource} from "../src/conversation/LiveConversationSource.js";
import type {VirtualizedTurnRowProps} from "../src/components/VirtualizedTurnList.js";
import type {LiveConversationVirtualEntry} from "../src/components/LiveConversationTranscript.js";
import {SOURCE_CONVERSATION_ITEM_GAP_PX} from "../src/conversation/SourceConversationLayoutTokens.js";
import {demoMessageEntry} from "./mockConversation.js";
import {demoProjectionDependencies} from "./adapters.js";
import {BrowserScrollController} from "./browserScrollController.js";

/** The tab host reuses the actual virtual transcript, not a separate message mock. */
export function DemoSubagentTranscript({
  conversationId,RowComponent,
}:{
  conversationId:string;
  RowComponent:React.ComponentType<VirtualizedTurnRowProps<LiveConversationVirtualEntry>>;
}){
  const viewport=React.useRef<HTMLDivElement|null>(null);
  const controller=React.useMemo(()=>new BrowserScrollController(()=>viewport.current),[]);
  const source=React.useMemo(()=>{
    const entries=[
      {...demoMessageEntry("user",`${conversationId}-ask`,
        "Synthetic subagent task, for source UI verification only."),
        isLatestTurn:false},
      {...demoMessageEntry("assistant",`${conversationId}-answer`,
        "Synthetic subagent transcript. No background Agent is connected."),
        isLatestTurn:true},
    ];
    return createLiveConversationSource({
      conversationId,entries,connectionState:"connected",loadingHistory:false,
      projection:{conversationId,hostId:"demo-host",cwd:"/projects/agent-web",
        showFullTranscript:true},
    });
  },[conversationId]);
  React.useEffect(()=>()=>source.dispose(),[source]);
  return <div className="demo-source-subagent-thread" data-demo-subagent-transcript={conversationId}>
    <p className="demo-source-subagent-disclaimer">
      Synthetic demo transcript · no actual subagent backend
    </p>
    <div role="region" aria-label="Subagent transcript"
      className="demo-source-subagent-viewport" ref={viewport}
      onScroll={()=>controller.notifyScroll()}>
      <div className="demo-transcript-column">
        <ConnectedLiveConversationTranscript
          source={source} RowComponent={RowComponent}
          projectionDependencies={demoProjectionDependencies}
          scrollController={controller} gapPx={SOURCE_CONVERSATION_ITEM_GAP_PX}
          overscanCount={4}/>
      </div>
    </div>
  </div>;
}
