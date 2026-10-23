import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStaticThreadTranscriptModel,
  findLastUserMessageEntryIndex,
  getVisibleWorkGroupItems,
  shouldInitiallyCollapseWorkGroup,
} from "../build/StaticThreadTranscriptModel.js";

test("normalizes user and assistant messages with a global stable message counter", () => {
  const snapshot = {
    turns: [
      { items: [{ type: "userMessage", content: [{ type: "text", text: "Hello" }, { type: "text", text: "world" }] }] },
      { items: [{ type: "agentMessage", text: "Hi" }, { type: "userMessage", content: [{ type: "text", text: "Again" }] }] },
    ],
  };
  const model = buildStaticThreadTranscriptModel(snapshot);
  assert.equal(model.turns[0].entries[0].id, "message-1");
  assert.equal(model.turns[0].entries[0].message.text, "Hello\nworld");
  assert.equal(model.turns[1].entries[0].id, "message-2");
  assert.equal(model.turns[1].entries[1].id, "message-3");
  assert.equal(model.lastUserTurnIndex, 1);
});

test("collects inspected images, generated images, and file diffs in separate output groups", () => {
  const snapshot = {
    turns: [{
      items: [
        { type: "imageView", url: "inspected.png" },
        { type: "imageGeneration", result: "generated.png" },
        { type: "fileChange", changes: [{ path: "src/a.ts", diff: "+hello\n-old" }] },
      ],
    }],
  };
  const turn = buildStaticThreadTranscriptModel(snapshot).turns[0];
  assert.deepEqual(turn.inspectedImages, ["inspected.png"]);
  assert.deepEqual(turn.generatedImages, ["generated.png"]);
  assert.deepEqual(turn.fileChanges, [{ fileName: "src/a.ts", text: "+hello\n-old" }]);
});

test("merges activity groups and all entries between the first and last activity group", () => {
  const snapshot = {
    turns: [{
      items: [
        { type: "reasoning", summary: "Thinking" },
        { type: "agentMessage", text: "intermediate" },
        { type: "agentMessage", phase: "commentary", text: "More activity" },
        { type: "userMessage", content: [{ type: "text", text: "Follow-up" }] },
        { type: "reasoning", summary: "Final thought" },
        { type: "agentMessage", text: "Final answer" },
      ],
    }],
  };
  const entries = buildStaticThreadTranscriptModel(snapshot).turns[0].entries;
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, "work");
  assert.deepEqual(entries[0].items.map((item) => item.type), [
    "reasoning", "message", "commentary", "message", "reasoning",
  ]);
  assert.equal(entries[1].type, "message");
  assert.equal(entries[1].message.role, "assistant");
});

test("attaches the inspected-image group before the first top-level assistant message, or at the end", () => {
  const withAssistant = buildStaticThreadTranscriptModel({
    turns: [{ items: [
      { type: "userMessage", content: [{ type: "text", text: "Look" }] },
      { type: "imageView", url: "x.png" },
      { type: "agentMessage", text: "I see it" },
    ] }],
  }).turns[0];
  assert.equal(withAssistant.firstAssistantEntryIndex, 1);

  const withoutAssistant = buildStaticThreadTranscriptModel({
    turns: [{ items: [
      { type: "userMessage", content: [{ type: "text", text: "Look" }] },
      { type: "imageView", url: "x.png" },
    ] }],
  }).turns[0];
  assert.equal(withoutAssistant.firstAssistantEntryIndex, -1);
});

test("computes the initial user-entry anchor only for the last user turn", () => {
  const model = buildStaticThreadTranscriptModel({
    turns: [
      { items: [{ type: "userMessage", content: [{ type: "text", text: "first" }] }] },
      { items: [{ type: "agentMessage", text: "answer" }] },
      { items: [{ type: "userMessage", content: [{ type: "text", text: "last" }] }] },
    ],
  });
  assert.equal(model.turns[0].firstUserEntryIndex, -1);
  assert.equal(model.turns[1].firstUserEntryIndex, -1);
  assert.equal(model.turns[2].firstUserEntryIndex, 0);
});

test("delegates first-turn omission policy and preserves original turn keys", () => {
  const model = buildStaticThreadTranscriptModel({
    turns: [{ items: [] }, { items: [] }],
  }, { shouldOmitFirstTurn: () => true });
  assert.equal(model.turns[0].omitted, true);
  assert.equal(model.turns[1].omitted, false);
  assert.equal(model.turns[1].key, "turn-1");
});

test("work groups collapse to user messages unless navigation targets an assistant message", () => {
  const items = [
    { type: "reasoning", id: "r1", text: "thinking" },
    { type: "message", id: "u1", message: { role: "user", text: "continue", images: [] } },
    { type: "message", id: "a1", message: { role: "assistant", text: "answer", images: [] } },
  ];
  assert.equal(shouldInitiallyCollapseWorkGroup(items, ""), true);
  assert.deepEqual(getVisibleWorkGroupItems(items, true).map((item) => item.id), ["u1"]);
  assert.equal(shouldInitiallyCollapseWorkGroup(items, "a1"), false);
  assert.deepEqual(getVisibleWorkGroupItems(items, false), items);
  assert.equal(findLastUserMessageEntryIndex(items), 1);
});
