import * as React from "react";
import {
  parseSourceComposerControlsMutationResult,
  parseSourceComposerControlsSnapshot,
  planSourceComposerPermissionSelection,
  sourceComposerModelChangeRequest,
  type SourceComposerControlsHost,
  type SourceComposerControlsSnapshot,
  type SourceComposerModelOption,
  type SourceComposerPermissionOption,
} from "../conversation/SourceComposerControlsModel.js";

export interface CodexComposerControlsController {
  readonly status:"loading"|"ready"|"unavailable"|"error";
  readonly snapshot:SourceComposerControlsSnapshot|null;
  readonly errorMessage:string|null;
  readonly pending:boolean;
  readonly canChangeModel:boolean;
  readonly canChangePermission:boolean;
  readonly pendingPermissionConfirmation:SourceComposerPermissionOption|null;
  requestModelChange:(modelId:string,reasoningEffortId?:string)=>Promise<void>;
  requestPermissionChange:(permissionModeId:string)=>void;
  confirmPermissionChange:()=>Promise<void>;
  cancelPermissionChange:()=>void;
}

/**
 * The native host owns model catalogs, reasoning capabilities and resolved
 * permission policy. The renderer only displays a validated snapshot and
 * sends a typed request; it never invents models or changes policy locally.
 */
export function useCodexComposerControls(
  host:SourceComposerControlsHost|undefined,
  conversationId:string,
):CodexComposerControlsController{
  const [status,setStatus]=React.useState<CodexComposerControlsController["status"]>("loading");
  const [snapshot,setSnapshot]=React.useState<SourceComposerControlsSnapshot|null>(null);
  const [errorMessage,setErrorMessage]=React.useState<string|null>(null);
  const [pending,setPending]=React.useState(false);
  const [pendingPermissionConfirmation,setPendingPermissionConfirmation]=
    React.useState<SourceComposerPermissionOption|null>(null);
  const requestEpoch=React.useRef(0);

  const refresh=React.useCallback(async()=>{
    const epoch=++requestEpoch.current;
    setPendingPermissionConfirmation(null);
    if(typeof host?.getComposerControls!=="function"){
      setSnapshot(null);setStatus("unavailable");setErrorMessage(null);return;
    }
    setStatus("loading");setErrorMessage(null);
    try{
      const raw=await host.getComposerControls({conversationId});
      if(epoch!==requestEpoch.current)return;
      const next=parseSourceComposerControlsSnapshot(raw,conversationId);
      if(next==null){
        setSnapshot(null);setStatus("unavailable");
        setErrorMessage("The host did not provide a valid Composer controls snapshot.");
        return;
      }
      setSnapshot(next);setStatus("ready");
    }catch{
      if(epoch!==requestEpoch.current)return;
      setSnapshot(null);setStatus("error");
      setErrorMessage("Could not read model and permission settings from the host.");
    }
  },[host,conversationId]);

  React.useEffect(()=>{
    void refresh();
    return ()=>{requestEpoch.current+=1;};
  },[refresh]);

  const applyMutation=React.useCallback(async<T,>(
    operation:(request:T)=>Promise<unknown>,
    request:T,
  ):Promise<boolean>=>{
    const epoch=requestEpoch.current;
    setPending(true);setErrorMessage(null);
    try{
      const raw=await operation(request);
      if(epoch!==requestEpoch.current)return false;
      const result=parseSourceComposerControlsMutationResult(raw,conversationId);
      if(result==null||!result.ok){
        setErrorMessage(result?.errorMessage??"The host rejected this Composer setting.");
        return false;
      }
      if(result.snapshot!=null){
        setSnapshot(result.snapshot);setStatus("ready");
      }else{
        setPending(false);
        await refresh();
      }
      return true;
    }catch{
      if(epoch===requestEpoch.current)
        setErrorMessage("The host could not apply this Composer setting. The previous selection is unchanged.");
      return false;
    }finally{
      if(epoch===requestEpoch.current)setPending(false);
    }
  },[conversationId,refresh]);

  const requestModelChange=React.useCallback(async(modelId:string,reasoningEffortId?:string)=>{
    if(snapshot==null)return;
    if(typeof host?.setComposerModelAndReasoningEffort!=="function"){
      setErrorMessage("The host does not expose model selection.");
      return;
    }
    const request=sourceComposerModelChangeRequest(snapshot,modelId,reasoningEffortId);
    if(request==null){
      setErrorMessage("This model or reasoning effort is not available from the host.");
      return;
    }
    await applyMutation(
      host.setComposerModelAndReasoningEffort,
      request,
    );
  },[applyMutation,host,snapshot]);

  const applyPermission=React.useCallback(async(option:SourceComposerPermissionOption,userConfirmed:boolean)=>{
    if(typeof host?.setComposerPermissionMode!=="function"){
      setErrorMessage("The host does not expose permission-mode changes.");
      return false;
    }
    const request={conversationId,permissionModeId:option.id,userConfirmed};
    return applyMutation(
      host.setComposerPermissionMode,
      request,
    );
  },[applyMutation,conversationId,host]);

  const requestPermissionChange=React.useCallback((permissionModeId:string)=>{
    if(snapshot==null)return;
    const plan=planSourceComposerPermissionSelection(snapshot,permissionModeId);
    if(plan.kind==="disabled"){
      setErrorMessage(plan.reason);return;
    }
    if(plan.kind==="confirm"){
      setPendingPermissionConfirmation(plan.option);return;
    }
    void applyPermission(plan.option,false);
  },[applyPermission,snapshot]);

  const confirmPermissionChange=React.useCallback(async()=>{
    const option=pendingPermissionConfirmation;
    if(option==null)return;
    const applied=await applyPermission(option,true);
    if(applied)setPendingPermissionConfirmation(null);
  },[applyPermission,pendingPermissionConfirmation]);

  const cancelPermissionChange=React.useCallback(()=>{
    if(!pending)setPendingPermissionConfirmation(null);
  },[pending]);

  return {status,snapshot,errorMessage,pending,
    canChangeModel:typeof host?.setComposerModelAndReasoningEffort==="function",
    canChangePermission:typeof host?.setComposerPermissionMode==="function",
    pendingPermissionConfirmation,
    requestModelChange,requestPermissionChange,confirmPermissionChange,
    cancelPermissionChange};
}

function controlUnavailableTitle(
  controls:CodexComposerControlsController,
  unavailableReason:string|undefined,
):string{
  return unavailableReason??controls.errorMessage??
    (controls.status==="loading"?"正在读取 Agent 设置…":
      "Agent 后端尚未提供此设置");
}

function ModelMenuOption(props:{
  option:SourceComposerModelOption;
  selected:boolean;
  disabled:boolean;
  onSelect:()=>void;
}){
  return <button type="button" role="menuitemradio" aria-checked={props.selected}
    className="demo-composer-control-menu__item"
    disabled={props.disabled||props.option.disabledReason!=null}
    title={props.option.disabledReason}
    onClick={props.onSelect}>
    <span className="demo-composer-control-menu__item-copy">
      <span>{props.option.label}</span>
      {props.option.description!=null?<small>{props.option.description}</small>:null}
    </span>
    {props.selected?<span aria-hidden="true">✓</span>:null}
  </button>;
}

export function CodexComposerModelReasoningControl(props:{
  controls:CodexComposerControlsController;
}){
  const {controls}=props;
  const [open,setOpen]=React.useState(false);
  const triggerRef=React.useRef<HTMLButtonElement|null>(null);
  const snapshot=controls.snapshot;
  const selected=snapshot?.model.selected??null;
  const selectedOption=snapshot?.model.options.find(option=>option.id===selected?.id)??null;
  const disabled=controls.status!=="ready"||snapshot==null||
    snapshot.model.options.length===0||controls.pending||!controls.canChangeModel;
  const label=selected==null
    ?controls.status==="loading"?"读取模型…":"模型未连接"
    :selected.label;
  const effort=selected?.reasoningEffortLabel;
  const title=controlUnavailableTitle(controls,snapshot?.model.unavailableReason);
  const close=()=>{setOpen(false);triggerRef.current?.focus();};

  return <div className="demo-composer-host-control demo-composer-host-control--model"
    data-composer-model-control="">
    <button ref={triggerRef} type="button"
      className="demo-composer-control-trigger demo-composer-control-trigger--model"
      data-testid="composer-model-control"
      data-codex-intelligence-trigger=""
      data-composer-navigation-target="reasoning"
      data-model-id={selected?.id??"unavailable"}
      data-selected-reasoning-effort={selected?.reasoningEffortId??""}
      aria-label="模型与推理强度"
      aria-haspopup="menu" aria-expanded={open}
      title={disabled?title:"选择模型与推理强度"}
      disabled={disabled}
      onClick={()=>setOpen(value=>!value)}>
      <span>{label}</span>
      {effort!=null?<span className="demo-composer-control-trigger__effort">{effort}</span>:null}
      {selected?.serviceTierLabel!=null
        ?<span className="demo-composer-control-trigger__tier">{selected.serviceTierLabel}</span>:null}
      <span aria-hidden="true">⌄</span>
    </button>
    {open&&snapshot!=null?<div className="demo-composer-control-menu demo-composer-control-menu--model"
      role="menu" aria-label="模型与推理强度"
      onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();close();}}}>
      <div className="demo-composer-control-menu__heading">模型</div>
      {snapshot.model.options.map(option=><ModelMenuOption key={option.id}
        option={option} selected={option.id===selected?.id} disabled={controls.pending}
        onSelect={()=>{
          const defaultEffort=option.defaultReasoningEffortId??
            option.reasoningEfforts.find(item=>item.disabledReason==null)?.id;
          void controls.requestModelChange(option.id,defaultEffort);
          setOpen(false);
        }}/>)}
      {selectedOption!=null&&selectedOption.reasoningEfforts.length>0
        ?<>
          <div className="demo-composer-control-menu__divider"/>
          <div className="demo-composer-control-menu__heading">推理强度</div>
          {selectedOption.reasoningEfforts.map(option=><button key={option.id}
            type="button" role="menuitemradio"
            aria-checked={option.id===selected?.reasoningEffortId}
            className="demo-composer-control-menu__item"
            disabled={controls.pending||selected?.lockedReasoningEffort===true||
              option.disabledReason!=null}
            title={option.disabledReason}
            onClick={()=>{
              if(selected!=null)void controls.requestModelChange(selected.id,option.id);
              setOpen(false);
            }}>
            <span>{option.label}</span>
            {option.id===selected?.reasoningEffortId?<Icon name="check" size={14}/>:null}
          </button>)}
        </>:null}
      {controls.errorMessage!=null
        ?<div className="demo-composer-control-menu__error" role="status">{controls.errorMessage}</div>:null}
    </div>:null}
  </div>;
}

export function CodexComposerPermissionModeControl(props:{
  controls:CodexComposerControlsController;
}){
  const {controls}=props;
  const [open,setOpen]=React.useState(false);
  const triggerRef=React.useRef<HTMLButtonElement|null>(null);
  const snapshot=controls.snapshot;
  const selected=snapshot?.permissions.selected??null;
  const disabled=controls.status!=="ready"||snapshot==null||
    snapshot.permissions.options.length===0||controls.pending||!controls.canChangePermission;
  const label=selected?.label??(controls.status==="loading"?"读取权限…":"权限未连接");
  const title=controlUnavailableTitle(controls,snapshot?.permissions.unavailableReason);
  const close=()=>{setOpen(false);triggerRef.current?.focus();};
  const confirmation=controls.pendingPermissionConfirmation;

  return <div className="demo-composer-host-control demo-composer-host-control--permissions"
    data-composer-permission-control="">
    <button ref={triggerRef} type="button"
      className="demo-composer-control-trigger demo-composer-control-trigger--permissions"
      data-testid="composer-permission-control"
      data-composer-navigation-target="permissions"
      data-permission-mode={selected?.id??"unavailable"}
      aria-label="权限模式"
      aria-haspopup="menu" aria-expanded={open}
      title={disabled?title:"更改权限模式"}
      disabled={disabled}
      onClick={()=>setOpen(value=>!value)}>
      <span className="demo-composer-control-trigger__shield" aria-hidden="true">◇</span>
      <span>{label}</span>
      <span aria-hidden="true">⌄</span>
    </button>
    {open&&snapshot!=null?<div className="demo-composer-control-menu demo-composer-control-menu--permissions"
      role="menu" aria-label="权限模式"
      onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();close();}}}>
      <div className="demo-composer-control-menu__heading">权限</div>
      {snapshot.permissions.options.map(option=><button key={option.id}
        type="button" role="menuitemradio"
        aria-checked={option.id===selected?.id}
        className="demo-composer-control-menu__item"
        disabled={controls.pending||!controls.canChangePermission||option.disabledReason!=null||
          (option.requiresConfirmation===true&&option.confirmation==null)}
        title={option.disabledReason}
        onClick={()=>{
          controls.requestPermissionChange(option.id);
          setOpen(false);
        }}>
        <span className="demo-composer-control-menu__item-copy">
          <span>{option.label}</span>
          {option.description!=null?<small>{option.description}</small>:null}
        </span>
        {option.id===selected?.id?<Icon name="check" size={14}/>:null}
      </button>)}
      {controls.errorMessage!=null
        ?<div className="demo-composer-control-menu__error" role="status">{controls.errorMessage}</div>:null}
    </div>:null}
    {confirmation?.confirmation!=null?<div className="demo-composer-permission-confirmation-backdrop"
      data-composer-permission-confirmation="">
      <section className="demo-composer-permission-confirmation" role="alertdialog"
        aria-modal="true" aria-labelledby="composer-permission-confirm-title"
        aria-describedby="composer-permission-confirm-body">
        <h3 id="composer-permission-confirm-title">{confirmation.confirmation.title}</h3>
        <p id="composer-permission-confirm-body">{confirmation.confirmation.body}</p>
        {confirmation.confirmation.riskDescription!=null
          ?<p className="demo-composer-permission-confirmation__risk">
            {confirmation.confirmation.riskDescription}</p>:null}
        {confirmation.confirmation.capabilities.length>0
          ?<ul>{confirmation.confirmation.capabilities.map((item,index)=>
            <li key={index}>{item}</li>)}</ul>:null}
        {controls.errorMessage!=null?<p role="alert"
          className="demo-composer-control-menu__error">{controls.errorMessage}</p>:null}
        <div className="demo-composer-permission-confirmation__actions">
          <button type="button" disabled={controls.pending}
            onClick={controls.cancelPermissionChange}>
            {confirmation.confirmation.cancelLabel??"取消"}
          </button>
          <button type="button" disabled={controls.pending}
            onClick={()=>void controls.confirmPermissionChange()}>
            {controls.pending?"正在应用…":confirmation.confirmation.confirmLabel??"确认更改"}
          </button>
        </div>
      </section>
    </div>:null}
  </div>;
}
