/**
 * Semantic reconstruction of `active-tool-activity-label-4bf40176756e.js`.
 * This module deliberately injects private helper behavior (path formatting,
 * skill recognition, file-edit detection) rather than inventing its internals.
 */

export interface MessageDescriptor {
  id: string;
  defaultMessage: string;
  description: string;
}

export interface ParsedCommandSummary {
  type: string;
  cmd?: string;
  isFinished?: boolean;
  displayLabel?: string | null;
  path?: string | null;
  name?: string | null;
  query?: string | null;
  [key: string]: unknown;
}

export interface ExecActivityItem {
  type: string;
  callId: string;
  executionStatus: string | null | undefined;
  parsedCmd: ParsedCommandSummary;
  cwd?: string;
}

export interface ActivityLabel {
  activityKey: string;
  icon: string;
  message: MessageDescriptor;
  values?: Record<string, string>;
}

export interface SkillReadInfo {
  isSkillDefinitionFile?: boolean;
  skillName?: string;
  [key: string]: unknown;
}

export interface ActiveToolLabelDependencies {
  /** Mirrors the bundled path/name display formatter used by read summaries. */
  formatReadTarget(pathOrName: string | undefined): string;
  /** Recognizes a skill definition read from parsed command metadata and cwd. */
  getSkillReadInfo(summary: ParsedCommandSummary, cwd?: string): SkillReadInfo | null;
  /** Identifies the canonical internal-knowledge skill. */
  isInternalKnowledgeSkill(info: SkillReadInfo): boolean;
  /** Mirrors the bundled path formatter for search/list summaries. */
  formatPath(path: string): string;
}

export type SearchTermListFormatter = (terms: string[]) => string;

const REGEX_SPECIAL_CHARACTERS = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]"]);

function isAsciiAlphaNumeric(character: string): boolean {
  return /^[A-Za-z0-9]$/.test(character);
}

function splitUnescapedPipes(input: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "|") {
      parts.push(input.slice(start, index));
      start = index + 1;
    }
  }

  if (parts.length === 0) return [];
  parts.push(input.slice(start));
  return parts;
}

function unescapeSafeTerm(input: string): string | null {
  let output = "";
  let escaped = false;

  for (const character of input) {
    if (escaped) {
      if (isAsciiAlphaNumeric(character)) return null;
      output += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (REGEX_SPECIAL_CHARACTERS.has(character)) return null;
    output += character;
  }

  return escaped ? null : output;
}

function quoteTerm(term: string): string {
  const unquoted = term.replace(/^["']+/, "").replace(/["']+$/, "");
  return `“${unquoted}”`;
}

export function joinSearchTermsNaturally([first, ...rest]: string[]): string {
  if (first == null) return "";
  let result = first;
  for (const [index, term] of rest.entries()) {
    const separator = index === rest.length - 1 ? (rest.length === 1 ? " and " : ", and ") : ", ";
    result += `${separator}${term}`;
  }
  return result;
}

/**
 * Reconstructs the original safe query-term display logic. A pipe-separated
 * query is split only when every term can be safely unescaped; otherwise the
 * entire query is shown as one quoted term.
 */
export function formatSearchQueryTerms(
  query: string,
  formatList: SearchTermListFormatter = joinSearchTermsNaturally,
): string {
  const splitTerms = splitUnescapedPipes(query);
  let terms: string[] | null = null;

  if (splitTerms.length >= 2) {
    const decoded: string[] = [];
    let valid = true;
    for (const rawTerm of splitTerms) {
      const decodedTerm = unescapeSafeTerm(rawTerm);
      if (decodedTerm == null || decodedTerm.length === 0) {
        valid = false;
        break;
      }
      decoded.push(decodedTerm);
    }
    if (valid) terms = decoded;
  }

  if (terms == null) terms = [unescapeSafeTerm(query) ?? query];
  return formatList(terms.map(quoteTerm));
}

export const activeToolMessages = {
  read: {
    id: "localConversation.toolActivity.active.read",
    defaultMessage: "<action>Reading</action> <detail>{target}</detail>",
    description: "Active tool activity summary while Codex is reading a file",
  },
  readSkill: {
    id: "localConversation.toolActivity.active.readSkill",
    defaultMessage: "<action>Reading</action> <detail>{skillName} skill</detail>",
    description: "Active tool activity summary while Codex is reading a skill definition",
  },
  readInternalKnowledge: {
    id: "localConversation.toolActivity.active.readInternalKnowledge",
    defaultMessage: "<action>Reading</action> <detail>Internal Knowledge</detail>",
    description: "Active tool activity summary while Codex is reading the canonical Internal Knowledge skill definition",
  },
  searchFolder: {
    id: "localConversation.toolActivity.active.search.folder",
    defaultMessage: "<action>Searching</action> <detail>files in {folder} folder</detail>",
    description: "Active tool activity summary while Codex is searching files in a folder",
  },
  searchQuery: {
    id: "localConversation.toolActivity.active.search.query",
    defaultMessage: "<action>Searching</action> <detail>for {query}</detail>",
    description: "Active tool activity summary while Codex is searching for a query",
  },
  searchFiles: {
    id: "localConversation.toolActivity.active.search.files",
    defaultMessage: "<action>Searching</action> <detail>files</detail>",
    description: "Active tool activity summary while Codex is searching for files",
  },
  listFiles: {
    id: "localConversation.toolActivity.active.list.files",
    defaultMessage: "<action>Listing</action> <detail>files</detail>",
    description: "Active tool activity summary while Codex is listing files",
  },
  listFolder: {
    id: "localConversation.toolActivity.active.list.folder",
    defaultMessage: "<action>Listing</action> <detail>files in {folder} folder</detail>",
    description: "Active tool activity summary while Codex is listing files in a folder",
  },
  activeCreating: {
    id: "codex.visualization.activity.active.creating",
    defaultMessage: "<action>Creating</action> <detail>visualization</detail>",
    description: "Active tool activity summary while Codex creates an inline visualization",
  },
  activeUpdating: {
    id: "codex.visualization.activity.active.updating",
    defaultMessage: "<action>Updating</action> <detail>visualization</detail>",
    description: "Active tool activity summary while Codex updates an inline visualization",
  },
  commandStopped: {
    id: "localConversation.toolActivity.active.command.stopped",
    defaultMessage: "<action>Stopped command</action>",
    description: "Active tool activity summary after Codex stops a command",
  },
  commandStoppedWithDetail: {
    id: "localConversation.toolActivity.active.command.stopped.detail",
    defaultMessage: "<action>Stopped</action> <detail>{command}</detail>",
    description: "Active tool activity summary after Codex stops a command",
  },
  commandRan: {
    id: "localConversation.toolActivity.active.command.ran",
    defaultMessage: "<action>Ran command</action>",
    description: "Active tool activity summary after Codex runs a command",
  },
  commandRanWithDetail: {
    id: "localConversation.toolActivity.active.command.ran.detail",
    defaultMessage: "<action>Ran</action> <detail>{command}</detail>",
    description: "Active tool activity summary after Codex runs a command",
  },
  commandRunning: {
    id: "localConversation.toolActivity.active.command.running",
    defaultMessage: "<action>Running command</action>",
    description: "Active tool activity summary while Codex runs a command",
  },
  commandRunningWithDetail: {
    id: "localConversation.toolActivity.active.command.running.detail",
    defaultMessage: "<action>Running</action> <detail>{command}</detail>",
    description: "Active tool activity summary while Codex runs a command",
  },
} satisfies Record<string, MessageDescriptor>;

export interface ActiveToolLabelOptions {
  items: Array<ExecActivityItem | { type: string; [key: string]: unknown }>;
  threadDetailLevel: string;
  formatSearchQueryTermList?: SearchTermListFormatter;
  dependencies: ActiveToolLabelDependencies;
}

const VISUALIZATIONS_PATH = /(?:^|[\\/])visualizations(?:[\\/"'\s;]|$)/i;
const WRITE_COMMAND = /(?:^|\s)(?:apply_patch|mkdir|tee|touch|cp|mv|install)(?:\s|$)|(?:^|[^<])>>?/;
const ADD_VISUALIZATION_FILE = /\*\*\* Add File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i;
const UPDATE_VISUALIZATION_FILE = /\*\*\* Update File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i;
const DELETE_VISUALIZATION_FILE = /\*\*\* Delete File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i;

function isVisualizationLabelStatusEligible(status: string | null | undefined): boolean {
  if (status == null) return true;
  return status === "inProgress" || status === "completed";
}

/** Reconstructed from skill-exploration-labels' visualization command detector. */
export function getVisualizationAction(command: string | undefined): "create" | "update" | null {
  if (command == null || !VISUALIZATIONS_PATH.test(command) || !WRITE_COMMAND.test(command)) return null;
  if (ADD_VISUALIZATION_FILE.test(command)) return "create";
  if (UPDATE_VISUALIZATION_FILE.test(command)) return "update";
  if (DELETE_VISUALIZATION_FILE.test(command)) return null;
  return "create";
}

function isInProgress(item: ExecActivityItem): boolean {
  return item.executionStatus !== "interrupted" && !item.parsedCmd.isFinished;
}

function getCommandActivityLabel(item: ExecActivityItem): ActivityLabel {
  const command = item.parsedCmd.cmd?.trim() ?? "";
  const interrupted = item.executionStatus === "interrupted";
  const finished = item.parsedCmd.isFinished === true;
  const message = interrupted
    ? command.length === 0 ? activeToolMessages.commandStopped : activeToolMessages.commandStoppedWithDetail
    : finished
      ? command.length === 0 ? activeToolMessages.commandRan : activeToolMessages.commandRanWithDetail
      : command.length === 0 ? activeToolMessages.commandRunning : activeToolMessages.commandRunningWithDetail;

  return {
    activityKey: item.callId,
    icon: interrupted ? "stop" : "run-command",
    message,
    ...(command.length === 0 ? {} : { values: { command } }),
  };
}

function getSingleExecLabel(
  item: ExecActivityItem,
  threadDetailLevel: string,
  formatSearchQueryTermList: SearchTermListFormatter | undefined,
  dependencies: ActiveToolLabelDependencies,
): ActivityLabel | null {
  const summary = item.parsedCmd;
  const editAction = isVisualizationLabelStatusEligible(item.executionStatus)
    ? getVisualizationAction(summary.cmd)
    : null;

  if (editAction === "create" || editAction === "update") {
    return {
      activityKey: item.callId,
      icon: "edit-files",
      message: editAction === "create" ? activeToolMessages.activeCreating : activeToolMessages.activeUpdating,
    };
  }

  switch (summary.type) {
    case "read": {
      const target = summary.displayLabel ?? dependencies.formatReadTarget(summary.path ?? summary.name ?? undefined);
      const skillInfo = dependencies.getSkillReadInfo(summary, item.cwd);
      if (skillInfo?.isSkillDefinitionFile === true && dependencies.isInternalKnowledgeSkill(skillInfo)) {
        return { activityKey: item.callId, icon: "internal-knowledge", message: activeToolMessages.readInternalKnowledge };
      }
      return skillInfo?.isSkillDefinitionFile === true
        ? { activityKey: item.callId, icon: "run-command", message: activeToolMessages.readSkill, values: { skillName: skillInfo.skillName ?? "" } }
        : { activityKey: item.callId, icon: "run-command", message: activeToolMessages.read, values: { target } };
    }
    case "search": {
      if (summary.path) {
        return { activityKey: item.callId, icon: "code-searching", message: activeToolMessages.searchFolder, values: { folder: dependencies.formatPath(summary.path) } };
      }
      if (summary.query) {
        const query = threadDetailLevel === "STEPS_PROSE"
          ? formatSearchQueryTerms(summary.query, formatSearchQueryTermList)
          : summary.query;
        return { activityKey: item.callId, icon: "code-searching", message: activeToolMessages.searchQuery, values: { query } };
      }
      return { activityKey: item.callId, icon: "code-searching", message: activeToolMessages.searchFiles };
    }
    case "list_files":
      return summary.path == null
        ? { activityKey: item.callId, icon: "list-files", message: activeToolMessages.listFiles }
        : { activityKey: item.callId, icon: "list-files", message: activeToolMessages.listFolder, values: { folder: dependencies.formatPath(summary.path) } };
    case "format":
    case "lint":
    case "noop":
    case "test":
    case "unknown":
      return getCommandActivityLabel(item);
    default:
      return null;
  }
}

/**
 * Selects the last recognized exec summary, preferring a still-running command.
 * This follows the control flow in the compiled `D` / `O` / `k` functions.
 */
export function getActiveToolActivityLabel(options: ActiveToolLabelOptions): ActivityLabel | null {
  const { items, threadDetailLevel, formatSearchQueryTermList, dependencies } = options;
  const findLast = (inProgressOnly: boolean): ActivityLabel | null => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const candidate = items[index];
      if (candidate?.type !== "exec") continue;
      const exec = candidate as ExecActivityItem;
      if (inProgressOnly && !isInProgress(exec)) continue;
      const label = getSingleExecLabel(exec, threadDetailLevel, formatSearchQueryTermList, dependencies);
      if (label != null) return label;
    }
    return null;
  };

  return findLast(true) ?? findLast(false);
}
