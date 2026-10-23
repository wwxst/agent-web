import { test } from "node:test";
import assert from "node:assert/strict";
import { isSourceMcpResultUngroupable } from "../build/SourceMcpResultGroupingGuard.js";
import { projectSourceRepeatedActivityRows } from "../build/SourceRepeatedActivityGroups.js";

const errorData = {
  error: "The tool could not complete the operation",
  error_code: "tool_failed",
  error_data: { type: "mcp_tool_execution_error", result: { isError: true } },
};
const wrap = (structuredContent, isError = false) => ({
  content: [], meta: {}, isError, structuredContent,
});
const success = (structuredContent) => ({ type: "success", structuredContent });

test("$_ excludes transport errors but leaves ordinary non-Apps success to Je", () => {
  assert.equal(isSourceMcpResultUngroupable("files", {type: "error"}), true);
  assert.equal(isSourceMcpResultUngroupable("files", success(errorData)), false);
  assert.equal(isSourceMcpResultUngroupable("codex_apps", success({ok: true})), false);
  assert.equal(isSourceMcpResultUngroupable("codex_apps", null), false);
});

test("$_ recognizes the Codex Apps BIt wrapper's isError flag", () => {
  assert.equal(isSourceMcpResultUngroupable("codex_apps", success(wrap({ ok: false }, true))), true);
  assert.equal(isSourceMcpResultUngroupable("codex_apps", success(wrap({ ok: true }))), false);
  // Missing BIt fields must not be interpreted as a valid wrapped response.
  assert.equal(isSourceMcpResultUngroupable("codex_apps", success({
    content: [], isError: true, structuredContent: {ok: false},
  })), false);
});

test("$_ detects VIt MCP execution errors both directly and inside BIt", () => {
  assert.equal(isSourceMcpResultUngroupable("codex_apps", success(errorData)), true);
  assert.equal(isSourceMcpResultUngroupable("codex_apps", success(wrap(errorData))), true);
  for (const nearMiss of [
    {...errorData, error_data: {type: "other_error", result: {isError: true}}},
    {...errorData, error_data: {type: "mcp_tool_execution_error", result: {isError: false}}},
    {...errorData, error_code: 500},
    {...errorData, error_data: {type: "mcp_tool_execution_error"}},
  ]) {
    assert.equal(isSourceMcpResultUngroupable("codex_apps", success(nearMiss)), false,
      JSON.stringify(nearMiss));
  }
});

test("Je splits a repeated Codex Apps run around a hidden execution error", () => {
  const mk = (id, result) => ({
    id, type: "mcp-tool-call", grouping: "groupable",
    completed: true, source: null,
    invocation: {server: "codex_apps", tool: "search"},
    result,
  });
  const items = [
    mk("a", success({ok: true})),
    mk("b", success(wrap(errorData))),
    mk("c", success({ok: true})),
    mk("d", success({ok: true})),
  ];
  const rows = projectSourceRepeatedActivityRows(items, {
    getGrouping: item => item.grouping,
    canGroupMcpResult: () => true,
    getToolDisplaySignature: () => "search",
  });
  assert.deepEqual(rows.map(row => [row.kind, row.items.map(item => item.id)]),
    [["single", ["a"]], ["single", ["b"]], ["mcp-tool-call", ["c", "d"]]]);
});
