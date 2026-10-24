type Command = unknown;

/** The original `command-execution-command-615dea847916.js` t/n.
 * The display command is the final non-shell commandAction, falling back
 * only to a non-shell top-level command. This is presentation only: never
 * remove commandActions from the host record or change execution semantics. */
export function selectSourceExecutionDisplayCommand(input: {
  command: string;
  commandActions: ReadonlyArray<{command?:string|null} | null | undefined>;
}): string {
  const isShellLauncher=(command:string)=>
    /^(?:.*[/\\])?(?:bash|cmd(?:\.exe)?|fish|powershell(?:\.exe)?|pwsh(?:\.exe)?|sh|zsh)(?:\s|$)/i.test(command);
  for(let index=input.commandActions.length-1;index>=0;index--){
    const command=input.commandActions[index]?.command?.trim()??"";
    if(command.length>0&&!isShellLauncher(command))return command;
  }
  const fallback=input.command.trim();
  return isShellLauncher(fallback)?"":fallback;
}

export interface ToolCommandElapsedInput {
  durationMs?: number | null;
  isInProgress: boolean;
  nowMs: number;
  startedAtMs?: number | null;
}

/** Mirrors the compiled JC duration precedence: live clock only while running. */
export function getToolCommandElapsedMs(input: ToolCommandElapsedInput): number {
  return Math.max(
    input.isInProgress && input.startedAtMs != null
      ? input.nowMs - input.startedAtMs
      : input.durationMs ?? 0,
    0,
  );
}

export interface ToolCommandSummaryInput {
  summaryType: string;
  command: Command;
  rawCommand?: Command;
  elapsedLabel: string | null;
  isInProgress: boolean;
  isBackgroundTerminalRunning: boolean;
  isBackgroundTerminalFinished: boolean;
  wasInterrupted: boolean;
  wasDeclinedByAutoReview: boolean;
  isExpanded: boolean;
  showRawCommand: boolean;
  executionStatus?: string | null;
}

function commandText(command: Command): string {
  if (typeof command === "string") return command.trim();
  if (Array.isArray(command)) return command.map((part) => String(part)).join(" ").trim();
  return "";
}

function commandTokens(command: Command): string[] {
  if (Array.isArray(command)) return command.map((part) => String(part));
  if (typeof command !== "string") return [];
  return (command.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s]+/g) ?? [])
    .map((part) => part.replace(/^["']|["']$/g, ""));
}

/** Mirrors compiled GC's narrow date/time command recognition. */
export function isDateTimeCheckCommand(command: Command): boolean {
  const tokens = commandTokens(command);
  if (tokens[0]?.split("/").at(-1) !== "date") return false;
  return tokens.slice(1).every((arg) =>
    arg.startsWith("+") || arg === "-u" || arg === "--utc" ||
    arg === "--universal" || arg === "-R" || arg === "--rfc-email" ||
    arg === "-I" || arg.startsWith("-I=") || arg.startsWith("--iso-8601") ||
    arg.startsWith("--rfc-3339")
  );
}


function visualizationCommandKind(command: unknown): "create" | "update" | null {
  const source = typeof command === "string"
    ? command
    : Array.isArray(command) ? command.map((part) => String(part)).join(" ") : "";
  const hasVisualizationPath = /(?:^|[\\/])visualizations(?:[\\/"'\s;]|$)/i.test(source);
  const hasWriteOperation = /(?:^|\s)(?:apply_patch|mkdir|tee|touch|cp|mv|install)(?:\s|$)|(?:^|[^<])>>?/.test(source);
  if (!hasVisualizationPath || !hasWriteOperation) return null;
  if (/\*\*\* Add File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i.test(source)) return "create";
  if (/\*\*\* Update File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i.test(source)) return "update";
  if (/\*\*\* Delete File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i.test(source)) return null;
  return "create";
}

function isEligibleVisualizationExecutionStatus(status: string | null | undefined): boolean {
  if (status == null) return true;
  return status === "inProgress" || status === "completed";
}


const skillScriptInterpreters = new Set(["python", "python3", "bash", "sh"]);
const skillScriptAcronyms = new Set(["GH", "IA", "MCP", "API", "CI", "CLI", "LLM", "PDF", "PR", "RCS", "UI", "URL", "SQL", "TW", "GPU", "CPU"]);
const skillScriptLowerWords = new Set(["and", "or", "to", "up", "with"]);
const skillScriptNameOverrides = new Map([
  ["openai", "OpenAI"], ["openaideveloperdocs", "OpenAI Developer Docs"],
  ["openapi", "OpenAPI"], ["github", "GitHub"], ["imessage", "iMessage"],
  ["pagerduty", "PagerDuty"], ["datadog", "DataDog"], ["sharepoint", "SharePoint"],
  ["sqlite", "SQLite"], ["fastapi", "FastAPI"],
]);

function formatSkillNamePart(value: string): string {
  return value.replace(/[_-]+/g, " ").split(/\s+/).filter(Boolean).map((word, index) => {
    const upper = word.toUpperCase();
    if (skillScriptAcronyms.has(upper)) return upper;
    if (word.toLowerCase().endsWith("s") && skillScriptAcronyms.has(word.slice(0, -1).toUpperCase())) {
      return word.slice(0, -1).toUpperCase() + "s";
    }
    const lower = word.toLowerCase();
    const override = skillScriptNameOverrides.get(lower);
    if (override != null) return override;
    if (index > 0 && skillScriptLowerWords.has(lower)) return lower;
    return lower.length === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function formatSkillName(value: string): string {
  return value.split(":").map(formatSkillNamePart).join(": ");
}

interface SkillPathMetadata {
  skillName: string;
  isInScriptsFolder: boolean;
}

/** Port of app-initial's skill-path metadata resolver used by source ZC/QC/$C. */
function getSkillPathMetadata(path: string): SkillPathMetadata | null {
  const normalized = path.trim().replace(/^\.\/+/, "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalized.length === 0) return null;
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  const lower = segments.map((segment) => segment.toLowerCase());

  for (let index = 0; index < lower.length; index += 1) {
    if ((lower[index] !== ".codex" && lower[index] !== ".agents") || lower[index + 1] !== "skills") continue;
    let skillIndex = index + 2;
    if (lower[skillIndex] === "_import" || lower[skillIndex] === ".system") skillIndex += 1;
    const skillId = segments[skillIndex];
    if (skillId == null || skillId.length === 0) continue;
    return {
      skillName: formatSkillName(skillId.replaceAll("_", "-")),
      isInScriptsFolder: lower[skillIndex + 1] === "scripts",
    };
  }

  for (let index = 0; index < lower.length; index += 1) {
    if (lower[index] !== "plugins") continue;
    const hasCachePrefix = lower[index + 1] === "cache";
    const pluginIndex = index + (hasCachePrefix ? 3 : 1);
    const pluginId = segments[pluginIndex];
    if (pluginId == null) continue;
    const searchAfter = pluginIndex + (hasCachePrefix ? 1 : 0);
    let skillsIndex = -1;
    for (let candidate = searchAfter + 1; candidate < lower.length; candidate += 1) {
      if (lower[candidate] === "skills") {
        skillsIndex = candidate;
        break;
      }
    }
    const hasSkillsSegment = skillsIndex >= 0;
    const skillIndex = hasSkillsSegment ? skillsIndex + 1 : searchAfter;
    const skillId = segments[skillIndex];
    if (skillId == null || skillId.length === 0) continue;
    const relative = lower.slice(skillIndex + 1);
    if (!hasSkillsSegment && !(relative.length === 1 && relative[0] === "skill.md")) continue;
    return {
      skillName: formatSkillName(skillId.replaceAll("_", "-")),
      isInScriptsFolder: relative[0] === "scripts",
    };
  }
  return null;
}

function commandPathBasename(path: string): string | null {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalized.length === 0) return null;
  const basename = normalized.split("/").at(-1) ?? null;
  return basename == null || basename.length === 0 || basename === "scripts" ? null : basename;
}

export interface SkillScriptSummary {
  skillName: string;
  fileName: string;
}

/** Port of source ZC: only supported interpreters and skill-owned scripts are classified. */
export function getSkillScriptSummary(command: Command): SkillScriptSummary | null {
  const tokens = commandTokens(command);
  const interpreter = commandPathBasename(tokens[0] ?? "");
  if (interpreter == null || !skillScriptInterpreters.has(interpreter.toLowerCase())) return null;
  let scriptPath: string | null = null;
  for (const token of tokens.slice(1)) {
    if (token.length > 0 && !token.startsWith("-")) {
      scriptPath = token;
      break;
    }
  }
  if (scriptPath == null) return null;
  const metadata = getSkillPathMetadata(scriptPath);
  if (metadata == null || !metadata.isInScriptsFolder) return null;
  const fileName = commandPathBasename(scriptPath);
  return fileName == null ? null : { skillName: metadata.skillName, fileName };
}

function withElapsed(label: string, elapsed: string | null, separator = "，耗时 "): string {
  return elapsed == null ? label : label + separator + elapsed;
}

/**
 * Source-derived WC summary branches, including the separate ZC/QC/$C
 * skill-script classifier and background-terminal labels.
 */
export function getToolCommandSummary(input: ToolCommandSummaryInput): string {
  const rawCommand = input.showRawCommand ? commandText(input.command) : "";
  const collapsedCommand = input.isExpanded ? "" : rawCommand;
  const skillScriptSummary = input.summaryType === "unknown" &&
    (input.isBackgroundTerminalRunning || input.isBackgroundTerminalFinished || !input.isExpanded)
    ? getSkillScriptSummary(input.rawCommand ?? input.command)
    : null;
  // Match the zh-CN strings for toolSummaryForCmd.skillScript and WC's
  // background.started/finished/stopped.skillScript branches in the compiled bundle.
  const skillScriptLabel = skillScriptSummary == null
    ? collapsedCommand
    : "来自 " + skillScriptSummary.skillName + " 技能的脚本 " + skillScriptSummary.fileName;

  if (input.wasDeclinedByAutoReview) {
    return collapsedCommand
      ? "命令被自动审查拒绝：" + collapsedCommand
      : "命令被自动审查拒绝";
  }

  if (!input.wasInterrupted && isEligibleVisualizationExecutionStatus(input.executionStatus)) {
    const kind = visualizationCommandKind(input.command);
    if (kind === "create") return input.isInProgress ? "正在创建可视化" : "已创建可视化";
    if (kind === "update") return input.isInProgress ? "正在更新可视化" : "已更新可视化";
  }

  if (isDateTimeCheckCommand(input.command)) {
    if (input.wasInterrupted) {
      return withElapsed("已停止检查当前日期和时间", input.elapsedLabel);
    }
    if (input.isInProgress) {
      return withElapsed("正在检查当前日期和时间", input.elapsedLabel);
    }
    return withElapsed("已检查当前日期和时间", input.elapsedLabel);
  }

  const genericCommand = ["format", "test", "lint", "noop", "unknown"].includes(input.summaryType);
  if (genericCommand && input.isInProgress) {
    if (input.isBackgroundTerminalRunning) {
      if (skillScriptSummary != null) {
        return "已启动后台终端，运行来自 " + skillScriptSummary.skillName +
          " 技能的 " + skillScriptSummary.fileName;
      }
      return rawCommand ? "后台终端已启动，运行命令 " + rawCommand : "后台终端已启动";
    }
    return withElapsed("正在运行命令", input.elapsedLabel);
  }

  if (genericCommand && input.isBackgroundTerminalFinished) {
    if (input.wasInterrupted && skillScriptSummary != null) {
      return "后台终端已通过 " + skillScriptLabel + " 停止";
    }
    if (input.wasInterrupted && rawCommand) {
      return "后台终端已停止，命令：" + rawCommand;
    }
    if (skillScriptSummary != null) {
      return "后台终端已完成运行来自 " + skillScriptSummary.skillName +
        " 技能的 " + skillScriptSummary.fileName;
    }
    if (rawCommand) return "已运行 " + rawCommand;
    if (input.wasInterrupted) return "后台终端已停止";
    return "后台终端已结束";
  }

  if (!input.isExpanded && skillScriptSummary != null) {
    if (input.wasInterrupted) {
      return input.elapsedLabel == null
        ? "已停止 " + skillScriptLabel
        : "运行 " + input.elapsedLabel + " 后停止 " + skillScriptLabel;
    }
    return input.elapsedLabel == null
      ? "已运行 " + skillScriptLabel
      : "已在 " + input.elapsedLabel + " 内运行 " + skillScriptLabel;
  }
  if (!input.isExpanded && rawCommand) {
    if (input.wasInterrupted) {
      return withElapsed("已停止 " + rawCommand, input.elapsedLabel, "，耗时 ");
    }
    return withElapsed("已运行 " + rawCommand, input.elapsedLabel, "，耗时 ");
  }

  if (input.wasInterrupted) {
    return withElapsed("已停止命令", input.elapsedLabel, "，耗时 ");
  }
  return withElapsed("已运行命令", input.elapsedLabel, "，耗时 ");
}
