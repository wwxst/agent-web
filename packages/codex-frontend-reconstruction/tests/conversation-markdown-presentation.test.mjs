import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeConversationNewlines, escapeConversationHtml, escapeConversationDetailsTags,
  quoteConversationInlineCode, fenceConversationCode, codeConversationHtml,
  normalizeConversationHeading, summarizeExplorationActions,
  formatConversationActivityCounts, commandConversationStatus,
  countUnifiedDiffChanges, describeConversationFileChange,
} from "../build/ConversationMarkdownPresentation.js";

test("normalizes CRLF and lone CR line endings", () => {
  assert.equal(normalizeConversationNewlines("a\r\nb\rc"), "a\nb\nc");
});

test("escapes HTML-sensitive characters in the source order", () => {
  assert.equal(escapeConversationHtml('<a title="A&B">'), '&lt;a title=&quot;A&amp;B&quot;&gt;');
  assert.equal(codeConversationHtml("<x>&"), "<code>&lt;x&gt;&amp;</code>");
});

test("escapes only details element tags and preserves regular inline markup", () => {
  const value = escapeConversationDetailsTags("<details open><summary>x</summary><DETAILS>z</DETAILS><a>ok</a>");
  assert.equal(value, "&lt;details open&gt;<summary>x</summary>&lt;DETAILS&gt;z&lt;/DETAILS&gt;<a>ok</a>");
});

test("inline and fenced code delimiters exceed contained backtick runs", () => {
  assert.equal(quoteConversationInlineCode("abc"), "`abc`");
  assert.equal(quoteConversationInlineCode("x``y"), "```x``y```");
  assert.equal(fenceConversationCode("ts", "first\n```\r\nend\n"), "````ts\nfirst\n```\nend\n````");
});

test("normalizes escaped conversation headings without creating a default empty heading", () => {
  assert.equal(normalizeConversationHeading("  \t\n "), "Conversation");
  assert.equal(normalizeConversationHeading(" A   #2 \n test "), "A \\#2 test");
});

test("summarizes exec read, search and list actions only", () => {
  const items = [
    { type: "exec", parsedCmd: { type: "read" } },
    { type: "exec", parsedCmd: { type: "search" } },
    { type: "exec", parsedCmd: { type: "list_files" } },
    { type: "exec", parsedCmd: { type: "read" } },
    { type: "mcp-tool-call" },
  ];
  assert.equal(summarizeExplorationActions(items), "Explored 2 files, a search, a list");
  assert.equal(summarizeExplorationActions([{ type: "exec", parsedCmd: { type: "write" } }]), "Explored");
});

test("formats mixed activity counters with source ordering and grammar", () => {
  assert.equal(formatConversationActivityCounts({}), "Tool activity");
  assert.equal(formatConversationActivityCounts({ createdFileCount: 1, editedFileCount: 3 }), "Created a file, edited 3 files");
  assert.equal(formatConversationActivityCounts({ exploredFileCount: 2, searchCount: 1, listCount: 1 }), "Explored 2 files, a search, a list");
  assert.equal(formatConversationActivityCounts({ timedOutRequestCount: 2, commandCount: 1, mcpToolCallCount: 2, webSearchCount: 1 }), "2 requests timed out, ran a command, called 2 tools, searched the web");
  assert.equal(formatConversationActivityCounts({ webSearchCount: 2 }), "Searched the web");
});

test("exec statuses distinguish interruption, in progress, completed and exit codes", () => {
  assert.equal(commandConversationStatus({ executionStatus: "interrupted", output: { exitCode: 1 } }), "Stopped");
  assert.equal(commandConversationStatus({ executionStatus: "running" }), "Running");
  assert.equal(commandConversationStatus({ executionStatus: "completed" }), "Success");
  assert.equal(commandConversationStatus({ executionStatus: "running", output: { exitCode: 0 } }), "Success");
  assert.equal(commandConversationStatus({ executionStatus: "completed", output: { exitCode: 127 } }), "Failed with exit code 127");
});

test("counts unified diff content but not +++/--- path headers", () => {
  const diff = "--- a/file\r\n+++ b/file\r\n@@ -1 +1 @@\r\n-old\r\n+new\r\n+line\r\n context";
  assert.deepEqual(countUnifiedDiffChanges(diff), { additions: 2, deletions: 1 });
  assert.deepEqual(countUnifiedDiffChanges("+++ path\n--- path"), { additions: 0, deletions: 0 });
});

test("describes file changes using the three observed states", () => {
  assert.equal(describeConversationFileChange("add"), "Created");
  assert.equal(describeConversationFileChange("delete"), "Deleted");
  assert.equal(describeConversationFileChange("update"), "Edited");
  assert.equal(describeConversationFileChange("move"), undefined);
});
