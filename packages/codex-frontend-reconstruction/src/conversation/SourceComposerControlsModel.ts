/**
 * Source-backed model/reasoning and permission-mode contract for the Composer.
 *
 * The original app-primary owners i9e/f9e/fG and PermissionsModeDropdown read
 * model catalogs, reasoning capabilities and resolved permission policy from
 * the active host/configuration. This independent UI must never invent a model
 * list or mutate a permission locally. All selectable values therefore arrive
 * through a typed host snapshot and every mutation is acknowledged by the host.
 */
export interface SourceComposerReasoningEffortOption {
  readonly id:string;
  readonly label:string;
  readonly disabledReason?:string;
}

export interface SourceComposerModelOption {
  readonly id:string;
  readonly label:string;
  readonly description?:string;
  readonly disabledReason?:string;
  readonly defaultReasoningEffortId?:string;
  readonly reasoningEfforts:readonly SourceComposerReasoningEffortOption[];
}

export interface SourceComposerSelectedModel {
  readonly id:string;
  readonly label:string;
  readonly reasoningEffortId?:string;
  readonly reasoningEffortLabel?:string;
  readonly serviceTierId?:string;
  readonly serviceTierLabel?:string;
  readonly lockedReasoningEffort?:boolean;
}

export interface SourceComposerPermissionConfirmation {
  readonly title:string;
  readonly body:string;
  readonly riskDescription?:string;
  readonly capabilities:readonly string[];
  readonly confirmLabel?:string;
  readonly cancelLabel?:string;
}

export type SourceComposerPermissionOptionKind =
  |"agent-mode"|"custom"|"profile"|"server-default";

export interface SourceComposerPermissionOption {
  readonly id:string;
  readonly kind:SourceComposerPermissionOptionKind;
  readonly label:string;
  readonly description?:string;
  readonly disabledReason?:string;
  readonly requiresConfirmation?:boolean;
  readonly confirmation?:SourceComposerPermissionConfirmation;
}

export interface SourceComposerSelectedPermission {
  readonly id:string;
  readonly label:string;
  readonly kind:SourceComposerPermissionOptionKind;
}

export interface SourceComposerControlsSnapshot {
  readonly schemaVersion:1;
  readonly conversationId:string;
  readonly model:{
    readonly selected:SourceComposerSelectedModel|null;
    readonly options:readonly SourceComposerModelOption[];
    readonly unavailableReason?:string;
  };
  readonly permissions:{
    readonly selected:SourceComposerSelectedPermission|null;
    readonly options:readonly SourceComposerPermissionOption[];
    readonly unavailableReason?:string;
  };
}

export interface SourceComposerModelChangeRequest {
  readonly conversationId:string;
  readonly modelId:string;
  readonly reasoningEffortId?:string;
}

export interface SourceComposerControlsMutationResult {
  readonly ok:boolean;
  readonly snapshot:SourceComposerControlsSnapshot|null;
  readonly errorMessage?:string;
}

/** Parse an acknowledged host mutation; never accept an optimistic renderer value. */
export function parseSourceComposerControlsMutationResult(
  value:unknown,
  expectedConversationId:string,
):SourceComposerControlsMutationResult|null{
  if(!isRecord(value)||typeof value.ok!=="boolean")return null;
  const errorMessage=value.errorMessage==null?undefined:
    safeText(value.errorMessage,500)??undefined;
  if(value.ok!==true)return {ok:false,snapshot:null,
    ...(errorMessage==null?{}:{errorMessage})};
  const snapshot=value.snapshot==null?null:
    parseSourceComposerControlsSnapshot(value.snapshot,expectedConversationId);
  if(value.snapshot!=null&&snapshot==null)return null;
  return {ok:true,snapshot};
}

export interface SourceComposerPermissionChangeRequest {
  readonly conversationId:string;
  readonly permissionModeId:string;
  /** Main must still re-resolve policy and require its own confirmation. */
  readonly userConfirmed:boolean;
}

export interface SourceComposerControlsHost {
  getComposerControls?(request:{conversationId:string}):Promise<unknown>;
  setComposerModelAndReasoningEffort?(
    request:SourceComposerModelChangeRequest,
  ):Promise<unknown>;
  setComposerPermissionMode?(
    request:SourceComposerPermissionChangeRequest,
  ):Promise<unknown>;
}

export type SourceComposerPermissionSelectionPlan =
  |{kind:"disabled";reason:string}
  |{kind:"confirm";option:SourceComposerPermissionOption}
  |{kind:"apply";option:SourceComposerPermissionOption};

function isRecord(value:unknown):value is Record<string,unknown>{
  return value!=null&&typeof value==="object"&&!Array.isArray(value);
}

function safeText(value:unknown,maxLength=240):string|null{
  if(typeof value!=="string"||value.trim().length===0||
    value.length>maxLength||/[\u0000-\u001f\u007f]/u.test(value))return null;
  return value.trim();
}

function parseEfforts(value:unknown):SourceComposerReasoningEffortOption[]|null{
  if(!Array.isArray(value)||value.length>24)return null;
  const result:SourceComposerReasoningEffortOption[]=[];
  const seen=new Set<string>();
  for(const raw of value){
    if(!isRecord(raw))return null;
    const id=safeText(raw.id,96),label=safeText(raw.label,120);
    if(id==null||label==null||seen.has(id))return null;
    const disabledReason=raw.disabledReason==null?undefined:safeText(raw.disabledReason,300)??undefined;
    result.push({id,label,...(disabledReason==null?{}:{disabledReason})});
    seen.add(id);
  }
  return result;
}

function parseModels(value:unknown):SourceComposerModelOption[]|null{
  if(!Array.isArray(value)||value.length>128)return null;
  const result:SourceComposerModelOption[]=[];
  const seen=new Set<string>();
  for(const raw of value){
    if(!isRecord(raw))return null;
    const id=safeText(raw.id,128),label=safeText(raw.label,160);
    const reasoningEfforts=parseEfforts(raw.reasoningEfforts);
    if(id==null||label==null||reasoningEfforts==null||seen.has(id))return null;
    const description=raw.description==null?undefined:safeText(raw.description,500)??undefined;
    const disabledReason=raw.disabledReason==null?undefined:safeText(raw.disabledReason,300)??undefined;
    const defaultReasoningEffortId=raw.defaultReasoningEffortId==null
      ?undefined:safeText(raw.defaultReasoningEffortId,96)??undefined;
    if(defaultReasoningEffortId!=null&&
      !reasoningEfforts.some(item=>item.id===defaultReasoningEffortId))return null;
    result.push({id,label,reasoningEfforts,
      ...(description==null?{}:{description}),
      ...(disabledReason==null?{}:{disabledReason}),
      ...(defaultReasoningEffortId==null?{}:{defaultReasoningEffortId})});
    seen.add(id);
  }
  return result;
}

function parseConfirmation(value:unknown):SourceComposerPermissionConfirmation|null{
  if(!isRecord(value))return null;
  const title=safeText(value.title,180),body=safeText(value.body,1600);
  if(title==null||body==null||!Array.isArray(value.capabilities)||
    value.capabilities.length>12)return null;
  const capabilities=value.capabilities.map(item=>safeText(item,240));
  if(capabilities.some(item=>item==null))return null;
  const riskDescription=value.riskDescription==null?undefined:
    safeText(value.riskDescription,800)??undefined;
  const confirmLabel=value.confirmLabel==null?undefined:
    safeText(value.confirmLabel,80)??undefined;
  const cancelLabel=value.cancelLabel==null?undefined:
    safeText(value.cancelLabel,80)??undefined;
  return {title,body,capabilities:capabilities as string[],
    ...(riskDescription==null?{}:{riskDescription}),
    ...(confirmLabel==null?{}:{confirmLabel}),
    ...(cancelLabel==null?{}:{cancelLabel})};
}

function parsePermissionOptions(value:unknown):SourceComposerPermissionOption[]|null{
  if(!Array.isArray(value)||value.length>32)return null;
  const result:SourceComposerPermissionOption[]=[];
  const seen=new Set<string>();
  const kinds=new Set<SourceComposerPermissionOptionKind>([
    "agent-mode","custom","profile","server-default",
  ]);
  for(const raw of value){
    if(!isRecord(raw))return null;
    const id=safeText(raw.id,128),label=safeText(raw.label,160);
    const kind=raw.kind;
    if(id==null||label==null||typeof kind!=="string"||
      !kinds.has(kind as SourceComposerPermissionOptionKind)||seen.has(id))return null;
    const description=raw.description==null?undefined:safeText(raw.description,500)??undefined;
    const disabledReason=raw.disabledReason==null?undefined:safeText(raw.disabledReason,300)??undefined;
    const requiresConfirmation=raw.requiresConfirmation===true;
    const confirmation=raw.confirmation==null?undefined:parseConfirmation(raw.confirmation)??undefined;
    result.push({id,label,kind:kind as SourceComposerPermissionOptionKind,
      ...(description==null?{}:{description}),
      ...(disabledReason==null?{}:{disabledReason}),
      ...(requiresConfirmation?{requiresConfirmation:true}:{}),
      ...(confirmation==null?{}:{confirmation})});
    seen.add(id);
  }
  return result;
}

function parseSelectedModel(value:unknown):SourceComposerSelectedModel|null|undefined{
  if(value==null)return null;
  if(!isRecord(value))return undefined;
  const id=safeText(value.id,128),label=safeText(value.label,160);
  if(id==null||label==null)return undefined;
  const reasoningEffortId=value.reasoningEffortId==null?undefined:
    safeText(value.reasoningEffortId,96)??undefined;
  const reasoningEffortLabel=value.reasoningEffortLabel==null?undefined:
    safeText(value.reasoningEffortLabel,120)??undefined;
  const serviceTierId=value.serviceTierId==null?undefined:
    safeText(value.serviceTierId,96)??undefined;
  const serviceTierLabel=value.serviceTierLabel==null?undefined:
    safeText(value.serviceTierLabel,120)??undefined;
  return {id,label,
    ...(reasoningEffortId==null?{}:{reasoningEffortId}),
    ...(reasoningEffortLabel==null?{}:{reasoningEffortLabel}),
    ...(serviceTierId==null?{}:{serviceTierId}),
    ...(serviceTierLabel==null?{}:{serviceTierLabel}),
    ...(value.lockedReasoningEffort===true?{lockedReasoningEffort:true}:{})};
}

function parseSelectedPermission(value:unknown):SourceComposerSelectedPermission|null|undefined{
  if(value==null)return null;
  if(!isRecord(value))return undefined;
  const id=safeText(value.id,128),label=safeText(value.label,160);
  const kind=value.kind;
  if(id==null||label==null||typeof kind!=="string"||
    !["agent-mode","custom","profile","server-default"].includes(kind))return undefined;
  return {id,label,kind:kind as SourceComposerPermissionOptionKind};
}

/** Fail closed on malformed, stale or cross-thread host snapshots. */
export function parseSourceComposerControlsSnapshot(
  value:unknown,
  expectedConversationId:string,
):SourceComposerControlsSnapshot|null{
  if(!isRecord(value)||value.schemaVersion!==1||
    value.conversationId!==expectedConversationId||
    !isRecord(value.model)||!isRecord(value.permissions))return null;
  const options=parseModels(value.model.options);
  const selected=parseSelectedModel(value.model.selected);
  const permissionOptions=parsePermissionOptions(value.permissions.options);
  const selectedPermission=parseSelectedPermission(value.permissions.selected);
  if(options==null||selected===undefined||
    permissionOptions==null||selectedPermission===undefined)return null;
  const unavailableModelReason=value.model.unavailableReason==null?undefined:
    safeText(value.model.unavailableReason,300)??undefined;
  const unavailablePermissionReason=value.permissions.unavailableReason==null?undefined:
    safeText(value.permissions.unavailableReason,300)??undefined;
  return {
    schemaVersion:1,conversationId:expectedConversationId,
    model:{selected,options,...(unavailableModelReason==null?{}:{unavailableReason:unavailableModelReason})},
    permissions:{selected:selectedPermission,options:permissionOptions,
      ...(unavailablePermissionReason==null?{}:{unavailableReason:unavailablePermissionReason})},
  };
}

export function sourceComposerModelChangeRequest(
  snapshot:SourceComposerControlsSnapshot,
  modelId:string,
  reasoningEffortId?:string,
):SourceComposerModelChangeRequest|null{
  const option=snapshot.model.options.find(item=>item.id===modelId);
  if(option==null||option.disabledReason!=null)return null;
  const effortId=reasoningEffortId??option.defaultReasoningEffortId;
  if(effortId!=null){
    const effort=option.reasoningEfforts.find(item=>item.id===effortId);
    if(effort==null||effort.disabledReason!=null)return null;
  }
  return {conversationId:snapshot.conversationId,modelId,
    ...(effortId==null?{}:{reasoningEffortId:effortId})};
}

export function planSourceComposerPermissionSelection(
  snapshot:SourceComposerControlsSnapshot,
  permissionModeId:string,
):SourceComposerPermissionSelectionPlan{
  const option=snapshot.permissions.options.find(item=>item.id===permissionModeId);
  if(option==null)return {kind:"disabled",reason:"This permission mode is not available from the host."};
  if(option.disabledReason!=null)return {kind:"disabled",reason:option.disabledReason};
  if(option.requiresConfirmation===true&&option.confirmation==null)
    return {kind:"disabled",reason:"The host did not provide the required permission confirmation details."};
  return option.requiresConfirmation===true
    ?{kind:"confirm",option}
    :{kind:"apply",option};
}
