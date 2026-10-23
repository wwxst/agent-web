/**
 * Semantic reconstruction of the snapshot-turn normalization in:
 * `static-thread-transcript-c04876a22450.js` (compiled helper `Bt`).
 *
 * This module intentionally handles data transformation only. Omission policy
 * from the shared-snapshot module remains an explicit adapter in the React view.
 */

export type SnapshotRole = "user" | "assistant";

export interface SnapshotTextContent {
  type: "text";
  text: string;
}
export interface SnapshotImageContent {
  type: "image";
  url: string;
}
export type SnapshotUserContent = SnapshotTextContent | SnapshotImageContent | Record<string, unknown>;

export interface SnapshotItem extends Record<string, any> {
  type: string;
}
export interface SnapshotTurn extends Record<string, any> {
  items: SnapshotItem[];
  durationMs?: number | null;
}
export interface SharedSnapshot extends Record<string, any> {
  turns: SnapshotTurn[];
  assets?: Record<string, unknown> | null;
  omittedFileChangeCount?: number | null;
}

export interface SnapshotMessage {
  role: SnapshotRole;
  text: string;
  images: string[];
}
export interface SnapshotMessageEntry {
  type: "message";
  id: string;
  message: SnapshotMessage;
}
export interface SnapshotWorkActivityEntry {
  type: "reasoning" | "commentary";
  id: string;
  text: string;
}
export type SnapshotWorkEntry = SnapshotMessageEntry | SnapshotWorkActivityEntry;
export interface SnapshotWorkGroupEntry {
  type: "work";
  items: SnapshotWorkEntry[];
}
export type SnapshotRenderEntry = SnapshotMessageEntry | SnapshotWorkGroupEntry;

export interface SnapshotFileChange {
  fileName?: string;
  text: string;
}
export interface SnapshotTurnRenderModel {
  /** Original zero-based turn index; preserved even if an earlier turn is omitted. */
  index: number;
  key: string;
  durationMs: number | null;
  entries: SnapshotRenderEntry[];
  inspectedImages: string[];
  generatedImages: unknown[];
  fileChanges: SnapshotFileChange[];
  /** First top-level assistant message entry; -1 when none exists. */
  firstAssistantEntryIndex: number;
  /** First top-level user entry in the last turn containing a user message. */
  firstUserEntryIndex: number;
  /** True when the source snapshot policy says this leading turn is omitted. */
  omitted: boolean;
}
export interface StaticThreadTranscriptModel {
  turns: SnapshotTurnRenderModel[];
  lastUserTurnIndex: number;
}

function isUserMessageItem(item: SnapshotItem): boolean {
  return item.type === "userMessage";
}

function isUserRenderEntry(entry: SnapshotRenderEntry): boolean {
  return entry.type === "message"
    ? entry.message.role === "user"
    : entry.items.some((item) => item.type === "message" && item.message.role === "user");
}

function isAssistantRenderEntry(entry: SnapshotRenderEntry): boolean {
  return entry.type === "message" && entry.message.role === "assistant";
}

function getUserText(content: SnapshotUserContent[] | undefined): string {
  return (content ?? [])
    .flatMap((part) => part?.type === "text" && typeof part.text === "string" ? [part.text] : [])
    .join("\n");
}

function getUserImages(content: SnapshotUserContent[] | undefined): string[] {
  return (content ?? [])
    .flatMap((part) => part?.type === "image" && typeof part.url === "string" ? [part.url] : []);
}

function normalizeTurn(
  turn: SnapshotTurn,
  turnIndex: number,
  nextMessageNumber: { value: number },
): SnapshotRenderEntry[] {
  const entries: SnapshotRenderEntry[] = [];

  for (const [itemIndex, item] of turn.items.entries()) {
    if (item.type === "reasoning" || (item.type === "agentMessage" && item.phase === "commentary")) {
      const workItem: SnapshotWorkActivityEntry = item.type === "reasoning"
        ? {
            type: "reasoning",
            id: `item-${turnIndex}-${itemIndex}`,
            text: typeof item.summary === "string" ? item.summary : "",
          }
        : {
            type: "commentary",
            id: `item-${turnIndex}-${itemIndex}`,
            text: typeof item.text === "string" ? item.text : "",
          };

      const previous = entries.at(-1);
      if (previous?.type === "work") previous.items.push(workItem);
      else entries.push({ type: "work", items: [workItem] });
      continue;
    }

    if (item.type === "agentMessage") {
      nextMessageNumber.value += 1;
      entries.push({
        type: "message",
        id: `message-${nextMessageNumber.value}`,
        message: {
          role: "assistant",
          text: typeof item.text === "string" ? item.text : "",
          images: [],
        },
      });
      continue;
    }

    if (isUserMessageItem(item)) {
      nextMessageNumber.value += 1;
      entries.push({
        type: "message",
        id: `message-${nextMessageNumber.value}`,
        message: {
          role: "user",
          text: getUserText(item.content),
          images: getUserImages(item.content),
        },
      });
    }
  }

  // The compiled helper folds the complete range from the first activity group
  // through the last activity group into one group, preserving intervening
  // messages as message entries inside that activity group.
  const firstWorkIndex = entries.findIndex((entry) => entry.type === "work");
  let lastWorkIndex = -1;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index]?.type === "work") {
      lastWorkIndex = index;
      break;
    }
  }

  if (firstWorkIndex >= 0 && lastWorkIndex > firstWorkIndex) {
    const merged: SnapshotWorkEntry[] = [];
    for (const entry of entries.slice(firstWorkIndex, lastWorkIndex + 1)) {
      if (entry.type === "work") merged.push(...entry.items);
      else merged.push(entry);
    }
    entries.splice(firstWorkIndex, lastWorkIndex - firstWorkIndex + 1, {
      type: "work",
      items: merged,
    });
  }

  return entries;
}

function collectInspectedImages(items: SnapshotItem[]): string[] {
  return items.flatMap((item) =>
    item.type === "imageView" && typeof item.url === "string" ? [item.url] : [],
  );
}

function collectGeneratedImages(items: SnapshotItem[]): unknown[] {
  return items.flatMap((item) => item.type === "imageGeneration" ? [item.result] : []);
}

function collectFileChanges(items: SnapshotItem[]): SnapshotFileChange[] {
  return items.flatMap((item) => {
    if (item.type !== "fileChange" || !Array.isArray(item.changes)) return [];
    return item.changes.map((change: Record<string, unknown>) => ({
      ...(typeof change.path === "string" ? { fileName: change.path } : {}),
      text: typeof change.diff === "string" ? change.diff : "",
    }));
  });
}

/**
 * Builds the render plan used by the static shared-transcript component.
 *
 * `shouldOmitFirstTurn` is supplied by the shared-snapshot policy helper; its
 * exact implementation lives in another compiled chunk and is not guessed.
 */
export function buildStaticThreadTranscriptModel(
  snapshot: SharedSnapshot,
  options: {
    shouldOmitFirstTurn?: (snapshot: SharedSnapshot) => boolean;
  } = {},
): StaticThreadTranscriptModel {
  const lastUserTurnIndex = snapshot.turns.reduce(
    (last, turn, index) => turn.items.some(isUserMessageItem) ? index : last,
    -1,
  );
  const nextMessageNumber = { value: 0 };
  const omitFirstTurn = options.shouldOmitFirstTurn?.(snapshot) === true;

  const turns = snapshot.turns.map((turn, index) => {
    const entries = normalizeTurn(turn, index, nextMessageNumber);
    return {
      index,
      key: `turn-${index}`,
      durationMs: typeof turn.durationMs === "number" ? turn.durationMs : null,
      entries,
      inspectedImages: collectInspectedImages(turn.items),
      generatedImages: collectGeneratedImages(turn.items),
      fileChanges: collectFileChanges(turn.items),
      firstAssistantEntryIndex: entries.findIndex(isAssistantRenderEntry),
      firstUserEntryIndex: index === lastUserTurnIndex ? entries.findIndex(isUserRenderEntry) : -1,
      omitted: omitFirstTurn && index === 0,
    };
  });

  return { turns, lastUserTurnIndex };
}

/** The work group starts collapsed unless the navigation target is an assistant message in it. */
export function shouldInitiallyCollapseWorkGroup(
  items: SnapshotWorkEntry[],
  initialMessageId: string,
): boolean {
  return !items.some(
    (item) =>
      item.type === "message" &&
      item.message.role === "assistant" &&
      initialMessageId === item.id,
  );
}

/** Matches the compiled work-group rendering: collapsed groups retain only user messages. */
export function getVisibleWorkGroupItems(
  items: SnapshotWorkEntry[],
  isCollapsed: boolean,
): SnapshotWorkEntry[] {
  return isCollapsed
    ? items.filter((item) => item.type === "message" && item.message.role === "user")
    : items;
}

/** Last user message within a work group receives the fallback navigation ref. */
export function findLastUserMessageEntryIndex(items: SnapshotWorkEntry[]): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.type === "message" && item.message.role === "user") return index;
  }
  return -1;
}
