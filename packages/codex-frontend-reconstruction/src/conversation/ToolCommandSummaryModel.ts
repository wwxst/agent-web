type Command = unknown;

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

function withElapsed(label: string, elapsed: string | null, separator = "，耗时 "): string {
  return elapsed == null ? label : label + separator + elapsed;
}

/**
 * Source-derived WC summary branches. Skill-script summaries and the private
 * executionStatus-to-create/update classifier remain outside this model.
 */
export function getToolCommandSummary(input: ToolCommandSummaryInput): string {
  const rawCommand = input.showRawCommand ? commandText(input.command) : "";
  const collapsedCommand = input.isExpanded ? "" : rawCommand;

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
      return rawCommand ? "后台终端已启动，运行命令 " + rawCommand : "后台终端已启动";
    }
    return withElapsed("正在运行命令", input.elapsedLabel);
  }

  if (genericCommand && input.isBackgroundTerminalFinished) {
    if (input.wasInterrupted && rawCommand) return "后台终端已停止，命令：" + rawCommand;
    if (rawCommand) return "已运行 " + rawCommand;
    if (input.wasInterrupted) return "后台终端已停止";
    return "后台终端已结束";
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
