import * as React from "react";

/**
 * Shared approval shell from original app-initial qbd -> eQu/iQu/Ibd.
 *
 * It owns only layout, semantic heading, reason/details and the footer form.
 * Approval dispatch, scopes, request identity and authoritative host
 * settlement remain the responsibility of the calling approval family.
 */
export interface SourceApprovalCardSurfaceProps {
  headerContent:React.ReactNode;
  title:React.ReactNode;
  subtitle?:React.ReactNode;
  reason?:React.ReactNode;
  details?:React.ReactNode;
  status?:React.ReactNode;
  actions:React.ReactNode;
  onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;
  requestId:string;
  phase:string;
}
export function SourceApprovalCardSurface({
  headerContent,title,subtitle,reason,details,status,actions,onSubmit,
  requestId,phase,
}:SourceApprovalCardSurfaceProps){
  return <section className="codex-source-mcp-approval"
    data-codex-approval-surface="true"
    data-source-mcp-approval-card=""
    data-source-mcp-request-id={requestId}
    data-source-mcp-reply-phase={phase}
    aria-label="MCP tool approval request">
    <div className="codex-source-mcp-approval__body">
      <div role="alert" aria-atomic="true" className="codex-source-mcp-approval__heading">
        {headerContent!=null
          ?<div className="codex-source-mcp-approval__header">{headerContent}</div>
          :null}
        <div className="codex-source-mcp-approval__heading-group">
          <div className="codex-source-mcp-approval__title">{title}</div>
          {subtitle!=null
            ?<div className="codex-source-mcp-approval__subtitle">{subtitle}</div>
            :null}
        </div>
      </div>
      {reason!=null||details!=null
        ?<div className="codex-source-mcp-approval__details">
          {reason!=null
            ?<dl className="codex-source-mcp-approval__reason-row">
              <div className="codex-source-mcp-approval__param-row">
                <dt className="codex-source-mcp-approval__param-name">Reason</dt>
                <dd className="codex-source-mcp-approval__param-value">{reason}</dd>
              </div>
            </dl>
            :null}
          {details}
        </div>:null}
      {status}
    </div>
    <form className="codex-source-mcp-approval__footer"
      onSubmit={onSubmit}>{actions}</form>
  </section>;
}
