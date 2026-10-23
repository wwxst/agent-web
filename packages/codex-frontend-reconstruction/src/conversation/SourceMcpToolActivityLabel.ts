/**
 * Source-confirmed xa (exported as t), mcp-tool-activity-label-220d2d98d4ad.js.
 * Reconstructs the common title/metadata precedence, not the private
 * Pt/Mt/mt/gt/et/Ea/Ta or resolved-app formatters. Those stay host callbacks.
 */
export interface SourceMcpToolActivityLabelInput {
  completed: boolean;
  serverName?: string | null;
  toolName: string;
  toolArguments?: unknown;
  toolResult?: {type?: string} | null;
  toolDisplay?: {
    invoking?: string | null;
    invoked?: string | null;
    title?: string | null;
  } | null;
  toolDefinition?: {
    _meta?: unknown;
    [key: string]: unknown;
  } | null;
}
export type SourceMcpToolActivityLabelSource =
  | "specialized" | "js-title" | "connector-action"
  | "invocation" | "display-title" | "definition-title"
  | "fallback" | "unavailable";
export interface SourceMcpToolActivityLabelResult {
  text: string | null;
  source: SourceMcpToolActivityLabelSource;
}
export interface SourceMcpToolActivityLabelHost {
  /** Pt/Mt action lookup & intl: already localized; highest priority. */
  getSpecializedActionLabel?(input: SourceMcpToolActivityLabelInput): string | null | undefined;
  /** mt/gt connector action & intl. */
  getConnectorActionLabel?(input: SourceMcpToolActivityLabelInput): string | null | undefined;
  /** Imported ct failure predicate. Explicitly supplied by the host. */
  isFailedResult?(input: SourceMcpToolActivityLabelInput): boolean;
  /** Imported et(toolDefinition), which is not the same as _meta. */
  getToolDefinitionTitle?(definition: SourceMcpToolActivityLabelInput["toolDefinition"]): string | null | undefined;
  /** Final Ea/Ta + browser use + ja host-specific fallback. */
  getFallbackLabel?(input: SourceMcpToolActivityLabelInput): string | null | undefined;
}
/** Source tool records arrive as unknown host JSON; validate before modeling. */
export interface SourceMcpActivityRecord {
  completed?: unknown;
  invocation?: unknown;
  result?: unknown;
  toolDisplay?: unknown;
  toolDefinition?: unknown;
}
const asRecord=(value:unknown):Record<string,unknown>|null=>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string,unknown> : null;
const optionalString=(value:unknown):string|null|undefined=>
  typeof value==="string" ? value : value===null ? null : undefined;

/** Never trust an unvalidated backend/MCP payload as a typed title object. */
export function sourceMcpLabelInputFromActivity(
  item:SourceMcpActivityRecord,
):SourceMcpToolActivityLabelInput {
  const invocation=asRecord(item.invocation);
  const toolDisplay=asRecord(item.toolDisplay);
  const toolResult=asRecord(item.result);
  const definition=asRecord(item.toolDefinition);
  const stringOrNull=(value:unknown):value is string|null =>
    value===null || typeof value==="string";
  const serverName=optionalString(invocation?.server);
  return {
    completed:item.completed===true,
    ...(serverName !== undefined ? {serverName} : {}),
    toolName:typeof invocation?.tool==="string" ? invocation.tool : "",
    toolArguments:invocation?.arguments,
    toolResult:toolResult==null?null:{
      ...(typeof toolResult.type==="string" ? {type:toolResult.type} : {}),
    },
    toolDisplay:toolDisplay==null?null:{
      ...(stringOrNull(toolDisplay.invoking) ? {invoking:toolDisplay.invoking} : {}),
      ...(stringOrNull(toolDisplay.invoked) ? {invoked:toolDisplay.invoked} : {}),
      ...(stringOrNull(toolDisplay.title) ? {title:toolDisplay.title} : {}),
    },
    toolDefinition:definition,
  };
}
const nonBlank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const result = (text: string | null, source: SourceMcpToolActivityLabelSource):
  SourceMcpToolActivityLabelResult => ({text,source});

/** wa: this applies only to tool-key js and a validated title arg, max 80 UTF-16 units. */
export function sourceJsToolTitle(toolName:string, args:unknown): string | null {
  const toolKey = toolName.trim().toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean).join("_");
  if (toolKey !== "js" || args == null || typeof args !== "object" ||
      Array.isArray(args) || !("title" in args)) return null;
  const raw = (args as {title?:unknown}).title;
  if (typeof raw !== "string") return null;
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) return null;
  return title.length <= 80 ? title : title.slice(0,79).trimEnd() + "…";
}
function sourceMetaLabel(definition:SourceMcpToolActivityLabelInput["toolDefinition"],
  phase:"invoking"|"invoked"):string|null {
  const meta=definition?._meta;
  if (meta == null || typeof meta !== "object" || Array.isArray(meta)) return null;
  const candidate=(meta as Record<string,unknown>)[`openai/toolInvocation/${phase}`];
  // Va.safeParse: invalid or blank metadata is discarded rather than trusted.
  return nonBlank(candidate) ? candidate : null;
}
export function resolveSourceMcpToolActivityLabel(
  input:SourceMcpToolActivityLabelInput,
  host:SourceMcpToolActivityLabelHost = {},
):SourceMcpToolActivityLabelResult {
  const special=host.getSpecializedActionLabel?.(input);
  if(special != null) return result(special,"specialized");
  const js=sourceJsToolTitle(input.toolName,input.toolArguments);
  if(js != null) return result(js,"js-title");
  const action=host.getConnectorActionLabel?.(input);
  if(action != null) return result(action,"connector-action");

  const phase=input.completed ? "invoked" : "invoking";
  const selected=input.toolDisplay?.[phase] ?? sourceMetaLabel(input.toolDefinition,phase);
  // Original xa: reject dynamic status on failed results and on finished calls
  // lacking an explicit success result. The private ct is host-provided.
  const allowDynamic = host.isFailedResult?.(input) === false &&
    (!input.completed || input.toolResult?.type === "success");
  // Keep xa's nullish order: a blank invoking/invoked is NOT replaced with
  // display.title; xa reaches the final fallback if its first non-null is blank.
  const title=(allowDynamic ? selected : undefined) ??
    input.toolDisplay?.title ?? host.getToolDefinitionTitle?.(input.toolDefinition);
  if(nonBlank(title)) {
    const source:SourceMcpToolActivityLabelSource =
      allowDynamic && selected != null ? "invocation" :
      input.toolDisplay?.title != null ? "display-title" : "definition-title";
    return result(title,source);
  }
  const fallback=host.getFallbackLabel?.(input);
  return nonBlank(fallback) ? result(fallback,"fallback") : result(null,"unavailable");
}
