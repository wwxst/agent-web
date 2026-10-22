import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getToolPatchDiffPresentation as present,
  getToolPatchDiffText as diffText,
} from "../build/ToolPatchDiffPresentationModel.js";

test("s0n synthesizes source-shaped add and delete unified diffs", () => {
  assert.equal(diffText("src/new.ts", { type: "add", content: "one\ntwo\n" }),
    "diff --git a/src/new.ts b/src/new.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/new.ts\n@@ -0,0 +1,2 @@\n+one\n+two\n");
  assert.equal(diffText("src/old.ts", { type: "delete", content: "one\r\ntwo\r\n" }),
    "diff --git a/src/old.ts b/src/old.ts\ndeleted file mode 100644\n--- a/src/old.ts\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-one\n-two\n");
});

test("s0n preserves update hunks and adds missing git/file headers", () => {
  assert.equal(diffText("src/a.ts", { type: "update", unified_diff: "@@ -1 +1 @@\n-old\n+new" }),
    "diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-old\n+new");
  assert.equal(diffText("src/a.ts", { type: "update", move_path: "src/b.ts", unified_diff: "--- a/src/a.ts\n+++ b/src/b.ts\n@@ -1 +1 @@\n-old\n+new" }),
    "diff --git a/src/a.ts b/src/b.ts\n--- a/src/a.ts\n+++ b/src/b.ts\n@@ -1 +1 @@\n-old\n+new");
});

test("s0n returns null when the source preview exceeds the original 1 MiB cap", () => {
  assert.equal(diffText("src/large.txt", { type: "add", content: "x".repeat(1_048_577) }), null);
  assert.equal(diffText("x".repeat(262_145), { type: "delete", content: "one" }), null);
  assert.equal(diffText("src/a.ts", { type: "update", unified_diff: "x".repeat(1_048_577) }), null);
});

test("patch diff stats exclude file headers and track the first added line", () => {
  const diff = [
    "--- a/src/example.ts",
    "+++ b/src/example.ts",
    "@@ -2,3 +2,4 @@",
    " context",
    "-oldValue",
    "+newValue",
    "+anotherValue",
  ].join("\n");
  assert.deepEqual(present(diff), { added: 2, removed: 1, openLocationLine: 3 });
});

test("patch diff stats for synthesized add/delete previews use unified diff line counts", () => {
  assert.deepEqual(present(diffText("src/new.ts", { type: "add", content: "one\ntwo\n" })), {
    added: 2, removed: 0, openLocationLine: 1,
  });
  assert.deepEqual(present(diffText("src/old.ts", { type: "delete", content: "one\ntwo" })), {
    added: 0, removed: 2, openLocationLine: 1,
  });
});

test("patch diff stats use the first deletion line when no additions exist", () => {
  const diff = [
    "--- a/src/example.ts",
    "+++ b/src/example.ts",
    "@@ -7,2 +7,0 @@",
    "-oldValue",
    "-anotherOldValue",
  ].join("\n");
  assert.deepEqual(present(diff), { added: 0, removed: 2, openLocationLine: 7 });
});

test("patch diff stats fall back to raw +/- counts and line one without a hunk", () => {
  assert.deepEqual(present("+new line\n-old line\n"), {
    added: 1, removed: 1, openLocationLine: 1,
  });
});

test("patch diff stats preserve zero counts for an unchanged parsed unified diff", () => {
  assert.deepEqual(present("--- a/file\n+++ b/file\n@@ -1 +1 @@\n same"), {
    added: 0, removed: 0, openLocationLine: 1,
  });
});

test("patch diff stats omit unchanged plain text", () => {
  assert.equal(present("plain context"), null);
});
