import * as React from "react";
import {
  getToolPatchStatus,
  type ToolItem,
} from "../conversation/ToolActivityDetailModel.js";
import { isMeaningfulReadToolActivity, getVisualizationActivityKind } from "../conversation/ToolActivityHistorySourceTransforms.js";
import type {
  ExecCommandLeafProps,
  ExecListFilesLeafProps,
  ExecReadLeafProps,
  ExecSearchLeafProps,
  PatchLeafProps,
  ToolActivityOpenFileRequest,
} from "./CodexToolActivityLeafRenderer.js";

type Data = Record<string, unknown>;
const isRecord = (value: unknown): value is Data =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const finished = (summary: Data): boolean => summary.isFinished === true;
const reviewsExist = (value: unknown): boolean => value !== null && value !== undefined;

function basename(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() || path;
}

function commandText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((part) => String(part)).join(" ").trim();
  return "";
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (totalSeconds < 60) return totalSeconds + " 秒";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? minutes + " 分钟" : minutes + " 分 " + seconds + " 秒";
}

function ToolSummary(props: {
  label: React.ReactNode;
  summaryIcon?: React.ReactNode;
  automaticApprovalReviews?: unknown;
  className?: string;
}) {
  const hasApprovalReviews = reviewsExist(props.automaticApprovalReviews);
  return (
    <div className={"codex-source-tool-summary " + (props.className ?? "")}
      data-codex-source-tool-summary="">
      {props.summaryIcon === undefined
        ? <span className="codex-source-tool-summary__icon" aria-hidden="true">›</span>
        : props.summaryIcon == null ? null
          : <span className="codex-source-tool-summary__icon">{props.summaryIcon}</span>}
      <span className="codex-source-tool-summary__label">{props.label}</span>
      {hasApprovalReviews && <span className="codex-source-tool-review-marker"
        aria-label="存在自动审批审查记录" title="自动审批审查记录">审查</span>}
    </div>
  );
}

/** Source-shaped RC read leaf; file opening remains an explicit host capability. */
export function CodexSourceExecReadLeaf(props: ExecReadLeafProps & {
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
}) {
  const summary = props.summary;
  const path = text(summary.path) ?? text(summary.name) ?? "";
  const label = text(summary.displayLabel) ?? basename(text(summary.name) ?? path);
  const isSkillDefinition = isMeaningfulReadToolActivity({
    type: "exec", parsedCmd: summary, cwd: props.cwd,
  });
  const isFinished = finished(summary);
  if (isSkillDefinition && !isFinished && props.threadDetailLevel !== "STEPS_PROSE") return null;
  if (!isSkillDefinition && !isFinished) return null;

  const normalizedPath = path.replace(/\\/g, "/");
  const skillName = text(summary.skillName) ??
    (normalizedPath.toLowerCase().endsWith("/skill.md") ? basename(normalizedPath.split("/").slice(0, -1).join("/")) : undefined);
  const title = isSkillDefinition && skillName != null
    ? "已读取 " + skillName + " 技能"
    : "已读取";
  const displayPath = label || path || "文件";
  const pathNode = props.onOpenFile && path
    ? <button type="button" className="codex-source-tool-path codex-source-tool-path--button"
        title={path} onClick={() => props.onOpenFile?.({ path, cwd: props.cwd, hostId: props.hostId })}
        data-agent-activity-file-link="">{displayPath}</button>
    : <span className="codex-source-tool-path" title={path || undefined}
        data-agent-activity-file-link="">{displayPath}</span>;

  return (
    <div className="codex-source-tool-leaf" data-codex-source-leaf="exec-read">
      <ToolSummary label={isSkillDefinition ? title : <>{title} {pathNode}</>}
        summaryIcon={props.summaryIcon} automaticApprovalReviews={props.automaticApprovalReviews} />
    </div>
  );
}

/** Source-shaped EC search summary, including the distinct in-progress wording. */
export function CodexSourceExecSearchLeaf(props: ExecSearchLeafProps) {
  const summary = props.summary;
  const isFinished = finished(summary);
  const query = text(summary.query);
  const path = text(summary.path);
  let label: string;
  if (query && path) label = (isFinished ? "已搜索" : "正在搜索") + " “" + query + "” · " + path;
  else if (query) label = (isFinished ? "已搜索" : "正在搜索") + " “" + query + "”";
  else label = isFinished ? "已搜索文件" : "正在搜索文件";
  return <div className="codex-source-tool-leaf" data-codex-source-leaf="exec-search">
    <ToolSummary label={label} summaryIcon={props.summaryIcon}
      automaticApprovalReviews={props.automaticApprovalReviews} />
  </div>;
}

/** Source-shaped NC file-list summary. */
export function CodexSourceExecListFilesLeaf(props: ExecListFilesLeafProps) {
  const summary = props.summary;
  const isFinished = finished(summary);
  const path = text(summary.path);
  const label = path
    ? (isFinished ? "已列出" : "正在列出") + " " + path + " 中的文件"
    : (isFinished ? "已列出文件" : "正在列出文件");
  return <div className="codex-source-tool-leaf" data-codex-source-leaf="exec-list-files">
    <ToolSummary label={label} summaryIcon={props.summaryIcon}
      automaticApprovalReviews={props.automaticApprovalReviews} />
  </div>;
}

function isDateTimeCheckCommand(value: unknown): boolean {
  const tokens = Array.isArray(value)
    ? value.map((part) => String(part))
    : typeof value === "string"
      ? (value.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s]+/g) ?? [])
          .map((part) => part.replace(/^["']|["']$/g, ""))
      : [];
  if (tokens.length === 0) return false;
  if (basename(tokens[0]).toLowerCase() !== "date") return false;
  return tokens.slice(1).every((arg) =>
    arg.startsWith("+") || arg === "-u" || arg === "--utc" ||
    arg === "--universal" || arg === "-R" || arg === "--rfc-email" ||
    arg === "-I" || arg.startsWith("-I=") || arg.startsWith("--iso-8601") ||
    arg.startsWith("--rfc-3339")
  );
}

function commandSummary(props: ExecCommandLeafProps, elapsed: string | null, expanded: boolean): string {
  const rawCommand = props.hideRawCommand ? "" : commandText(props.item.cmd ?? props.summary.cmd);
  const collapsedCommand = expanded ? "" : rawCommand;
  const withCommand = (prefix: string, command = collapsedCommand) => command ? prefix + " " + command : prefix;
  const withElapsed = (label: string) => elapsed ? label + " · " + elapsed : label;

  if (props.wasDeclinedByAutoReview) return withCommand("命令被自动审查拒绝");
  if (isDateTimeCheckCommand(props.item.cmd ?? props.summary.cmd)) {
    if (props.wasInterrupted) return withElapsed("已停止检查当前日期和时间");
    if (props.isInProgress) return withElapsed("正在检查当前日期和时间");
    return withElapsed("已检查当前日期和时间");
  }
  if (props.isBackgroundTerminalRunning) return withCommand("后台终端已启动", rawCommand);
  if (props.isBackgroundTerminalFinished) {
    if (props.wasInterrupted) return withCommand("后台终端已停止", rawCommand);
    return withCommand(rawCommand ? "已运行" : "后台终端已完成", rawCommand);
  }
  if (props.wasInterrupted) return withElapsed(withCommand("已停止", collapsedCommand || "命令").trim());
  if (props.isInProgress) return withElapsed("正在运行命令");
  return withElapsed(withCommand(collapsedCommand ? "已运行" : "命令已运行", collapsedCommand));
}

/**
 * Source-shaped CC command leaf. The disclosure starts collapsed like the
 * compiled component; output and exit status are projections of the hydrated
 * commandExecution entity. This component never executes a command.
 */
export function CodexSourceExecCommandLeaf(props: ExecCommandLeafProps) {
  const [expanded, setExpanded] = React.useState(false);
  const startedAtMs = typeof props.item.startedAtMs === "number" ? props.item.startedAtMs : null;
  const durationMs = typeof props.item.durationMs === "number" ? props.item.durationMs : null;
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!props.isInProgress || props.isBackgroundTerminalRunning || startedAtMs == null) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [props.isInProgress, props.isBackgroundTerminalRunning, startedAtMs]);

  const elapsedMs = durationMs ?? (startedAtMs == null ? null : Math.max(0, nowMs - startedAtMs));
  const elapsed = elapsedMs == null ? null : formatElapsed(elapsedMs);
  const label = commandSummary(props, elapsed, expanded);
  const output = isRecord(props.item.output) ? props.item.output : null;
  const outputText = text(output?.aggregatedOutput) ?? "";
  const exitCode = typeof output?.exitCode === "number" ? output.exitCode : undefined;
  const command = props.hideRawCommand ? "" : commandText(props.item.cmd ?? props.summary.cmd);
  const reviews = Array.isArray(props.item.automaticApprovalReviews)
    ? props.item.automaticApprovalReviews.filter(isRecord) : [];
  const deniedReview = reviews.find((review) => review.status === "denied");
  const denialRationale = text(deniedReview?.rationale)?.trim();

  return (
    <div className="codex-source-tool-leaf codex-source-tool-command"
      data-codex-source-leaf="exec-command">
      <button type="button" className="codex-source-tool-command__toggle"
        aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
        data-codex-source-command-toggle="">
        <span className={"codex-source-tool-command__chevron" + (expanded ? " is-expanded" : "")}
          aria-hidden="true">›</span>
        <ToolSummary label={label} summaryIcon={props.showSummaryIcon ? props.summaryIcon : null}
          automaticApprovalReviews={props.item.automaticApprovalReviews}
          className={props.summaryTone === "muted" ? "is-muted" : ""} />
      </button>
      {expanded && !props.hideRawCommand && <div className="codex-source-tool-command__body" data-codex-source-command-body="">
        {command && <pre className="codex-source-tool-command__command"><span aria-hidden="true">$ </span>{command}</pre>}
        {outputText && <pre className="codex-source-tool-command__output">{outputText}</pre>}
        {outputText === "" && props.isInProgress && <div className="codex-source-tool-command__empty-output">等待命令输出…</div>}
        <div className="codex-source-tool-command__footer">
          {props.isInProgress ? <span>运行中</span>
            : props.wasInterrupted ? <span>已中断</span>
              : exitCode === 0 ? <span className="is-success">退出代码 0</span>
                : exitCode !== undefined ? <span className="is-error">退出代码 {exitCode}</span>
                  : <span>{props.isBackgroundTerminalFinished ? "后台终端已结束" : "执行已结束"}</span>}
          {props.isReadOnly && <span>只读会话</span>}
        </div>
        {props.wasDeclinedByAutoReview && <div className="codex-source-tool-command__review">
          <strong>自动审查拒绝</strong>
          <p>{denialRationale || "没有提供拒绝原因。"}</p>
        </div>}
      </div>}
    </div>
  );
}

function changeText(change: unknown): string | null {
  if (!isRecord(change)) return null;
  return text(change.unified_diff) ?? text(change.content) ?? text(change.diff) ?? null;
}

function changeCounts(diff: string | null, change?: unknown): { added: number; removed: number } | null {
  if (diff == null) {
    if (!isRecord(change)) return null;
    const type = text(change.type);
    const content = text(change.content);
    if (content == null || (type !== "add" && type !== "delete")) return null;
    const lines = content === "" ? 0 : content.split(/\r?\n/).filter((line, index, all) =>
      !(index === all.length - 1 && line === "")
    ).length;
    return type === "add" ? { added: lines, removed: 0 } : { added: 0, removed: lines };
  }
  const lines = diff.split(/\r?\n/);
  const looksUnified = lines.some((line) => line.startsWith("@@ ")) ||
    lines.some((line) => line.startsWith("+++ ")) || lines.some((line) => line.startsWith("--- "));
  if (!looksUnified) return null;
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added += 1;
    if (line.startsWith("-")) removed += 1;
  }
  return { added, removed };
}

function patchChangeLabel(change: unknown, status: ReturnType<typeof getToolPatchStatus>): string {
  const type = isRecord(change) ? text(change.type) : undefined;
  const action = type === "add" ? "创建" : type === "delete" ? "删除" : "编辑";
  // IT checks stopped before rejected, then uses the pending/streaming state.
  if (status === "stopped") return "已停止" + action;
  if (status === "rejected" || status === "auto-review-declined") return "已拒绝";
  if (status === "streaming" || status === "pending") return "正在" + action;
  return "已" + action;
}

function PatchFileRow(props: {
  path: string;
  change: unknown;
  status: ReturnType<typeof getToolPatchStatus>;
  showDiffDetails: boolean;
  cwd?: string | null | undefined;
  hostId: string;
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const diff = changeText(props.change);
  const counts = changeCounts(diff, props.change);
  const label = patchChangeLabel(props.change, props.status);
  const type = isRecord(props.change) ? text(props.change.type) : undefined;
  const displayPath = text(isRecord(props.change) ? props.change.move_path : undefined) ?? props.path;
  const shortPath = basename(displayPath);
  const openFile = () => props.onOpenFile?.({ path: displayPath, cwd: props.cwd, hostId: props.hostId });
  // IT exposes the disclosure whenever diff details are enabled; its body
  // distinguishes an unavailable/oversized preview from an empty diff.
  const canExpand = props.showDiffDetails;
  const lines = diff?.split(/\r?\n/) ?? [];
  const unified = lines.some((line) => line.startsWith("@@ ")) ||
    lines.some((line) => line.startsWith("+++ ")) || lines.some((line) => line.startsWith("--- "));
  const isAdd = type === "add";
  const isDelete = type === "delete";

  return (
    <section className="codex-source-tool-patch-file" data-codex-source-patch-file=""
      data-change-type={type ?? "update"} data-patch-status={props.status}>
      <div className="codex-source-tool-patch-file__header">
        <div className="codex-source-tool-patch-file__path-wrap">
          {props.onOpenFile
            ? <button type="button" className="codex-source-tool-path codex-source-tool-path--button"
                title={displayPath} onClick={openFile} data-agent-activity-file-link="">{shortPath}</button>
            : <span className="codex-source-tool-path" title={displayPath} data-agent-activity-file-link="">{shortPath}</span>}
          {counts && <span className="codex-source-tool-patch-file__counts">
            <span className="is-added">+{counts.added}</span>
            <span className="is-removed">−{counts.removed}</span>
          </span>}
        </div>
        <div className="codex-source-tool-patch-file__actions">
          <span className={"codex-source-tool-patch-file__status status-" + props.status}>{label}</span>
          {canExpand && <button type="button" className="codex-source-tool-patch-file__toggle"
            aria-label={"切换差异 " + shortPath}
            title={expanded ? "收起差异" : "展开差异"}
            aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
            data-codex-source-patch-toggle="">
            <span aria-hidden="true" className={"codex-source-tool-patch-file__chevron" + (expanded ? " is-expanded" : "")}>›</span>
          </button>}
        </div>
      </div>
      {expanded && <div className="codex-source-tool-patch-file__diff"
        role="region" aria-label={displayPath + " 文件差异"} data-codex-source-patch-diff="">
        {diff == null
          ? <div className="codex-source-tool-patch-file__empty">差异过大，无法预览</div>
          : diff === ""
            ? <div className="codex-source-tool-patch-file__empty">{isDelete ? "文件内容已删除" : "没有差异"}</div>
            : unified
              ? <pre>{lines.map((line, index) => {
                  const className = line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@ ")
                    ? "diff-meta"
                    : line.startsWith("+") ? "diff-added"
                      : line.startsWith("-") ? "diff-removed" : "";
                  return <span key={index} className={className}>{line}{"\\n"}</span>;
                })}</pre>
              : <pre className={isAdd ? "diff-added-file" : isDelete ? "diff-deleted-file" : ""}>{diff}</pre>}
      </div>}
    </section>
  );
}

/**
 * Source-shaped PT/IT patch leaf. It restores the original status precedence,
 * per-file status, and opt-in inline diff disclosure; file writes/opening are
 * never performed here and must be supplied by the host.
 */
export function CodexSourcePatchLeaf(props: PatchLeafProps & {
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
}) {
  const item = props.item;
  const status = getToolPatchStatus(item, { isTurnCancelled: props.isTurnCancelled });
  const changes = isRecord(item.changes) ? Object.entries(item.changes) : [];
  const visualizationKind = getVisualizationActivityKind(item.visualizationActivities);
  const showVisualization = visualizationKind != null &&
    status !== "stopped" && status !== "auto-review-declined" && status !== "rejected";
  if (!showVisualization && changes.length === 0) return null;

  const isInProgress = status === "streaming" || status === "pending";
  const visualizationLabel = visualizationKind === "create"
    ? (isInProgress ? "正在创建可视化" : "已创建可视化")
    : (isInProgress ? "正在更新可视化" : "已更新可视化");

  return (
    <div className="codex-source-tool-leaf codex-source-tool-patch"
      data-codex-source-patch="" data-patch-status={status}>
      {showVisualization && <div className="codex-source-tool-patch__visualization"
        data-codex-source-visualization-state={isInProgress ? "in-progress" : "complete"}>
        {visualizationLabel}
      </div>}
      <div className="codex-source-tool-patch__files">
        {changes.map(([path, change]) => <PatchFileRow key={path} path={path} change={change}
          status={status} showDiffDetails={props.showDiffDetails} cwd={props.cwd}
          hostId={props.hostId} onOpenFile={props.onOpenFile} />)}
      </div>
    </div>
  );
}
