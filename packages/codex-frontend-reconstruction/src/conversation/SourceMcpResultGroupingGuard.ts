/**
 * Original app-initial-5851df3f6cb1.js `$_` (export mjr), called by
 * inline-followup-markdown `Je` before combining repeated MCP calls.
 *
 * The original uses BIt/VIt Zod schemas. This independent implementation
 * validates the corresponding error-envelope fields; it never executes a
 * tool, interprets approvals, or treats a successful transport as a safe
 * application result.
 */
export interface SourceMcpResult {
  type?: string;
  structuredContent?: unknown;
}

type JsonObject = Record<string, unknown>;
const record = (value: unknown): value is JsonObject =>
  value != null && typeof value === "object" && !Array.isArray(value);

/**
 * `BIt`: the Codex Apps result wrapper. Invalid/missing wrapper fields must
 * not cause its nested content to be interpreted as the wrapped result.
 */
function codexAppsEnvelope(value: unknown): JsonObject | null {
  if (!record(value) || !Array.isArray(value.content) ||
      typeof value.isError !== "boolean" ||
      !("meta" in value) || !("structuredContent" in value)) return null;
  return value;
}

/** `VIt`: the nested Codex Apps MCP execution-error payload. */
function isCodexAppsExecutionError(value: unknown): boolean {
  if (!record(value) || typeof value.error !== "string" ||
      typeof value.error_code !== "string" || !record(value.error_data)) return false;
  const data = value.error_data;
  return data.type === "mcp_tool_execution_error" &&
    record(data.result) && data.result.isError === true;
}

/**
 * True excludes an activity from Je's repeated-call subgroup. A success
 * on a non-Codex-Apps server is *not* excluded by this private guard; the
 * other Je preconditions and host-approved display identity still apply.
 */
export function isSourceMcpResultUngroupable(
  serverName: string | undefined,
  result: SourceMcpResult | null | undefined,
): boolean {
  if (result?.type === "error") return true;
  if (result?.type !== "success" || serverName !== "codex_apps") return false;
  const envelope = codexAppsEnvelope(result.structuredContent);
  if (envelope?.isError === true) return true;
  return isCodexAppsExecutionError(envelope == null
    ? result.structuredContent : envelope.structuredContent);
}
