import * as React from "react";
import "./sourceCompactElicitationCard.css";

/**
 * mcp-plugin-logo shared ct surface, distinct from qbd's approval card:
 * compact flex-wrap form, 40px icon, content column, right-aligned actions.
 * Pure layout with no permission transport or synthetic host state.
 */
export function SourceCompactElicitationCard({
  label,title,description,primaryLabel,secondaryLabel,primaryDisabled,
  secondaryDisabled,onPrimary,onSecondary,requestId,phase,status,kind="url-action",icon,
}:{
  label:string;title:React.ReactNode;description:React.ReactNode;
  primaryLabel:string;secondaryLabel:string;
  primaryDisabled:boolean;secondaryDisabled:boolean;
  onPrimary:()=>void;onSecondary:()=>void;
  requestId:string;phase:string;status?:React.ReactNode;
  kind?:"url-action"|"tool-suggestion";icon?:React.ReactNode;
}){
  return <section className="codex-source-compact-request"
    data-source-url-action-request-id={kind==="url-action"?requestId:undefined}
    data-source-url-action-phase={kind==="url-action"?phase:undefined}
    data-source-tool-suggestion-request-id={kind==="tool-suggestion"?requestId:undefined}
    data-source-tool-suggestion-phase={kind==="tool-suggestion"?phase:undefined}
    aria-label={label}>
    <form className="codex-source-compact-request__form"
      onSubmit={event=>{event.preventDefault();if(!primaryDisabled)onPrimary();}}>
      <div className="codex-source-compact-request__identity">
        <span className="codex-source-compact-request__icon" aria-hidden="true">
          {icon??<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.4.3l2-2a5 5 0 0 0-7.1-7.1l-2 2"/>
            <path d="M14 11a5 5 0 0 0-7.4-.3l-2 2a5 5 0 1 0 7.1 7.1l2-2"/>
          </svg>}
        </span>
        <div className="codex-source-compact-request__content">
          <div className="codex-source-compact-request__title">{title}</div>
          {description!=null?<div className="codex-source-compact-request__description">{description}</div>:null}
          {status}
        </div>
      </div>
      <div className="codex-source-compact-request__actions">
        <button type="button" disabled={secondaryDisabled}
          className="codex-source-compact-request__secondary"
          onClick={onSecondary}>{secondaryLabel}</button>
        <button type="submit" disabled={primaryDisabled}
          className="codex-source-compact-request__primary">{primaryLabel}</button>
      </div>
    </form>
  </section>;
}
