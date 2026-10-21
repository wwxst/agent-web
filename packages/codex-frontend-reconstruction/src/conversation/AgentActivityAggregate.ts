/**
 * Source-derived aggregation of already-classified agent activity units.
 * inline-followup-markdown-4751fe20f26d.js: Le -> Re -> ze -> Be -> Ve,
 * with automatic-review failure deduplication in Z/He.
 *
 * Deliberately NOT the private xe/we classifier. Callers provide normalized
 * units from their host; this module never guesses tool metadata or commands.
 */
export type ReviewFailure = { id: string; status: string };
export type VisualizationKind = "create" | "update";
export interface SourceDescriptor { key: string; count?: number; runningCount?: number; [key: string]: unknown }
export type AggregateUnit = {
  type: string;
  automaticApprovalReviewFailures?: readonly ReviewFailure[];
  readPaths?: readonly string[]; runningReadPaths?: readonly string[];
  loadedToolPaths?: readonly string[]; runningLoadedToolPaths?: readonly string[];
  searchCount?: number; runningSearchCount?: number; listCount?: number; runningListCount?: number;
  createdPaths?: readonly string[]; runningCreatedPaths?: readonly string[]; stoppedCreatedPaths?: readonly string[];
  editedPaths?: readonly string[]; runningEditedPaths?: readonly string[];
  deletedPaths?: readonly string[]; runningDeletedPaths?: readonly string[];
  runningCreatedLineCount?: number; changedLineCount?: number;
  visualizationActivity?: { isInProgress?: boolean; activities: readonly { path: string; kind: VisualizationKind }[] } | null;
  visualizationActivityKind?: VisualizationKind | null;
  isInProgress?: boolean; createsFolder?: boolean; searchesWeb?: boolean;
  source?: SourceDescriptor | null;
  count?: number; runningCount?: number;
  id?: string; status?: string;
};
export interface ActivityAggregate {
  createdFileCount: number; runningCreatedFileCount: number; stoppedCreatedFileCount: number;
  runningCreatedLineCount: number; changedLineCount: number;
  editedFileCount: number; runningEditedFileCount: number;
  deletedFileCount: number; runningDeletedFileCount: number;
  exploredFileCount: number; runningExploredFileCount: number;
  loadedToolCount: number; runningLoadedToolCount: number;
  searchCount: number; runningSearchCount: number; listCount: number; runningListCount: number;
  deniedRequestCount: number; timedOutRequestCount: number;
  commandCount: number; runningCommandCount: number; completedWebSearchCommandCount: number;
  runningFolderCreationCommandCount: number;
  visualizationActivity: {kind: VisualizationKind; isInProgress: boolean} | undefined;
  completedVisualizationCommandCount: number; runningVisualizationCommandCount: number;
  runningWebSearchCommandCount: number;
  mcpToolCallCount: number; mcpToolCallSources: (SourceDescriptor & {count: number; runningCount: number})[];
  webSearchCount: number; runningWebSearchCount: number;
}
const validNumber = (x: number | undefined): number => x ?? 0;
const append = (set: Set<string>, values: readonly string[] | undefined) => {for (const p of values ?? []) set.add(p);};
const eligible = (u: AggregateUnit) => u.type === "exploration" || u.type === "patch" || u.type === "exec" ||
  u.type === "mcp-tool-call" || u.type === "automatic-approval-review" || u.type === "web-search";
/** Re excludes `other`; opaque private S predicate is resolved by caller. */
export function aggregateAgentActivityUnits(units: readonly AggregateUnit[], options: {
  isPrivateAggregateUnit?: (unit: AggregateUnit) => boolean;
  onPrivateAggregateUnit?: (unit: AggregateUnit) => void;
} = {}): ActivityAggregate {
  const sets = {
    created: new Set<string>(), runningCreated: new Set<string>(), stoppedCreated: new Set<string>(),
    edited: new Set<string>(), runningEdited: new Set<string>(), deleted: new Set<string>(), runningDeleted: new Set<string>(),
    explored: new Set<string>(), runningExplored: new Set<string>(), loaded: new Set<string>(), runningLoaded: new Set<string>(),
  };
  const visual = new Map<string,{kind:VisualizationKind;isInProgress:boolean}>();
  const sources = new Map<string, SourceDescriptor & {count:number;runningCount:number}>();
  const failures = new Set<string>();
  let visualCommandKind:VisualizationKind | undefined;
  let runningCreatedLineCount=0,changedLineCount=0,searchCount=0,runningSearchCount=0,listCount=0,runningListCount=0;
  let deniedRequestCount=0,timedOutRequestCount=0,commandCount=0,runningCommandCount=0;
  let completedWebSearchCommandCount=0,runningFolderCreationCommandCount=0;
  let completedVisualizationCommandCount=0,runningVisualizationCommandCount=0,runningWebSearchCommandCount=0;
  let mcpToolCallCount=0,webSearchCount=0,runningWebSearchCount=0;
  const applyReview = (review: ReviewFailure) => {
    if (failures.has(review.id)) return;
    failures.add(review.id);
    if (review.status === "denied") ++deniedRequestCount;
    if (review.status === "timedOut") ++timedOutRequestCount;
  };
  for (const u of units) {
    if (!eligible(u)) {
      if (u.type !== "other" && options.isPrivateAggregateUnit?.(u)) options.onPrivateAggregateUnit?.(u);
      continue;
    }
    for (const failure of u.automaticApprovalReviewFailures ?? []) applyReview(failure);
    switch (u.type) {
      case "exploration":
        append(sets.explored,u.readPaths); append(sets.runningExplored,u.runningReadPaths);
        append(sets.loaded,u.loadedToolPaths); append(sets.runningLoaded,u.runningLoadedToolPaths);
        searchCount+=validNumber(u.searchCount);runningSearchCount+=validNumber(u.runningSearchCount);
        listCount+=validNumber(u.listCount);runningListCount+=validNumber(u.runningListCount);break;
      case "patch":
        append(sets.created,u.createdPaths);append(sets.runningCreated,u.runningCreatedPaths);append(sets.stoppedCreated,u.stoppedCreatedPaths);
        append(sets.edited,u.editedPaths);append(sets.runningEdited,u.runningEditedPaths);
        append(sets.deleted,u.deletedPaths);append(sets.runningDeleted,u.runningDeletedPaths);
        runningCreatedLineCount+=validNumber(u.runningCreatedLineCount);changedLineCount+=validNumber(u.changedLineCount);
        for(const a of u.visualizationActivity?.activities ?? []) {
          const prev=visual.get(a.path);
          visual.set(a.path,{kind:prev?.kind==="create"||a.kind==="create"?"create":"update",
            isInProgress:prev?.isInProgress===true||u.visualizationActivity?.isInProgress===true});
        }
        break;
      case "exec":
        ++commandCount;
        if (u.visualizationActivityKind != null) {
          visualCommandKind=visualCommandKind==="create"||u.visualizationActivityKind==="create"?"create":"update";
          if(u.isInProgress)++runningVisualizationCommandCount;else ++completedVisualizationCommandCount;
        }
        if (u.isInProgress) {
          ++runningCommandCount;
          if (u.createsFolder) ++runningFolderCreationCommandCount;
          if (u.searchesWeb) ++runningWebSearchCommandCount;
        } else if (u.searchesWeb) ++completedWebSearchCommandCount;
        break;
      case "automatic-approval-review":
        if (u.id) applyReview({id:u.id,status:u.status??""});break;
      case "mcp-tool-call": {
        ++mcpToolCallCount;
        if (u.source != null) {
          const old=sources.get(u.source.key);
          sources.set(u.source.key,{...u.source,count:(old?.count??0)+1,runningCount:(old?.runningCount??0)+(u.isInProgress?1:0)});
        }
        break;
      }
      case "web-search":
        webSearchCount+=validNumber(u.count);runningWebSearchCount+=validNumber(u.runningCount);break;
    }
  }
  const visuals=[...visual.values()];
  const visualizationActivity=visualCommandKind!=null||visuals.length>0?{
    kind:visualCommandKind==="create"||visuals.some(v=>v.kind==="create")?"create" as const:"update" as const,
    isInProgress:runningVisualizationCommandCount>0||visuals.some(v=>v.isInProgress),
  }:undefined;
  return {
    createdFileCount:sets.created.size,runningCreatedFileCount:sets.runningCreated.size,stoppedCreatedFileCount:sets.stoppedCreated.size,
    runningCreatedLineCount,changedLineCount,editedFileCount:sets.edited.size,runningEditedFileCount:sets.runningEdited.size,
    deletedFileCount:sets.deleted.size,runningDeletedFileCount:sets.runningDeleted.size,
    exploredFileCount:sets.explored.size,runningExploredFileCount:sets.runningExplored.size,
    loadedToolCount:sets.loaded.size,runningLoadedToolCount:sets.runningLoaded.size,
    searchCount,runningSearchCount,listCount,runningListCount,deniedRequestCount,timedOutRequestCount,
    commandCount,runningCommandCount,completedWebSearchCommandCount,runningFolderCreationCommandCount,
    visualizationActivity,completedVisualizationCommandCount,runningVisualizationCommandCount,runningWebSearchCommandCount,
    mcpToolCallCount,mcpToolCallSources:[...sources.values()],webSearchCount,runningWebSearchCount,
  };
}
