import * as React from "react";
import "./sourceConversationRoleHeading.css";

export type SourceConversationMessageRole = "user" | "assistant";

/**
 * Original Ft in user-message-attachments-93893a2e6026.js:
 * one screen-reader heading per rendered user/assistant message, visible in
 * printed transcripts. Assistant headings also carry a focus target.
 *
 * The original uses private localized messages; independent hosts may supply
 * localized text without replacing this shared message structure.
 */
export function SourceConversationRoleHeading({
  role, label,
}:{
  role: SourceConversationMessageRole;
  label?: string;
}) {
  return <h4
    className="codex-source-message-role-heading"
    data-source-message-role-heading={role}
    data-conversation-role={role==="assistant"?"assistant":undefined}
    tabIndex={role==="assistant"?-1:undefined}>
    {label ?? (role==="user"?"You said:":"ChatGPT said:")}
  </h4>;
}
