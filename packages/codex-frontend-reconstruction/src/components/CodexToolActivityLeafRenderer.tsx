import * as React from "react";
import type { ToolItem, ToolProjection } from "../conversation/ToolActivityDetailModel.js";

type VisibleToolProjection = Exclude<ToolProjection, {kind:"hidden"}>;
type Component<P> = React.ComponentType<P>;

export interface ToolActivityOpenFileRequest {
  path: string;
  line?: number;
  cwd?: string | null | undefined;
  hostId: string;
}

export interface ToolActivityLeafContext {
  conversationId: string;
  hostId: string;
  cwd?: string | null | undefined;
  isReadOnly: boolean;
  isTurnInProgress: boolean;
  isTurnCancelled: boolean;
  threadDetailLevel?: string | undefined;
  summaryTone?: string | undefined;
  showSummaryIcon: boolean;
  summaryIcon?: React.ReactNode | undefined;
  hideRawCommand: boolean;
  toolActivityTurnKey?: string | undefined;
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
}
export interface ExecReadLeafProps {
  summary: Record<string,unknown>;
  cwd?: string | null | undefined;
  hostId: string;
  threadDetailLevel?: string | undefined;
  automaticApprovalReviews?: unknown;
  summaryIcon?: React.ReactNode;
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
}
export interface ExecSearchLeafProps {
  summary: Record<string,unknown>;
  automaticApprovalReviews?: unknown;
  summaryIcon?: React.ReactNode;
}
export interface ExecListFilesLeafProps extends ExecSearchLeafProps {}
export interface ExecCommandLeafProps {
  conversationId:string; hostId:string; isReadOnly:boolean; item:ToolItem;
  summary:Record<string,unknown>; isInProgress:boolean;
  isBackgroundTerminalRunning:boolean; isBackgroundTerminalFinished:boolean;
  wasInterrupted:boolean; wasDeclinedByAutoReview:boolean;
  summaryTone?:string | undefined; showSummaryIcon:boolean;
  summaryIcon?:React.ReactNode | undefined; hideRawCommand:boolean; toolActivityTurnKey?:string | undefined;
}
export interface PatchLeafProps {
  item:ToolItem; isTurnCancelled:boolean; cwd?:string|null|undefined; grantRoot?:string|null|undefined;
  hostId:string; showDiffDetails:boolean; summaryIcon?:React.ReactNode;
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
}
/** xC/PT prop contracts: actual Codex visual leaves are host-supplied. */
export interface ToolActivityLeafAdapters {
  Read?:Component<ExecReadLeafProps>;
  Search?:Component<ExecSearchLeafProps>;
  ListFiles?:Component<ExecListFilesLeafProps>;
  Command?:Component<ExecCommandLeafProps>;
  Patch?:Component<PatchLeafProps>;
}
export function renderCodexToolActivityLeaf(
  item:ToolItem, projection:VisibleToolProjection,
  adapters:ToolActivityLeafAdapters, context:ToolActivityLeafContext,
):React.ReactNode|undefined {
  if(projection.kind==="exec"){
    switch(projection.leaf){
      case "read": {
        const Read = adapters.Read;
        return Read == null ? undefined : <Read summary={projection.summary}
          cwd={item.cwd as string|null|undefined} hostId={context.hostId}
          threadDetailLevel={context.threadDetailLevel}
          automaticApprovalReviews={item.automaticApprovalReviews} summaryIcon={context.summaryIcon}
          onOpenFile={context.onOpenFile}/>;
      }
      case "search": {
        const Search = adapters.Search;
        return Search == null ? undefined : <Search summary={projection.summary}
          automaticApprovalReviews={item.automaticApprovalReviews} summaryIcon={context.summaryIcon}/>;
      }
      case "list_files": {
        const ListFiles = adapters.ListFiles;
        return ListFiles == null ? undefined : <ListFiles summary={projection.summary}
          automaticApprovalReviews={item.automaticApprovalReviews} summaryIcon={context.summaryIcon}/>;
      }
      case "command": {
        const Command = adapters.Command;
        return Command == null ? undefined : <Command conversationId={context.conversationId}
          hostId={context.hostId} isReadOnly={context.isReadOnly} item={item} summary={projection.summary}
          isInProgress={projection.isInProgress}
          isBackgroundTerminalRunning={projection.isBackgroundTerminalRunning}
          isBackgroundTerminalFinished={projection.isBackgroundTerminalFinished}
          wasInterrupted={projection.wasInterrupted}
          wasDeclinedByAutoReview={projection.wasDeclinedByAutoReview}
          summaryTone={context.summaryTone} showSummaryIcon={context.showSummaryIcon}
          summaryIcon={context.summaryIcon} hideRawCommand={projection.hideRawCommand}
          toolActivityTurnKey={context.toolActivityTurnKey}/>;
      }
    }
  }
  const Patch = adapters.Patch;
  if(projection.kind==="patch"&&Patch!=null){
    return <Patch item={item} isTurnCancelled={context.isTurnCancelled}
      cwd={context.cwd} grantRoot={typeof item.grantRoot === "string" ? item.grantRoot : undefined}
      hostId={context.hostId} showDiffDetails={projection.showDiffDetails}
      summaryIcon={context.summaryIcon} onOpenFile={context.onOpenFile}/>;
  }
  return undefined;
}
