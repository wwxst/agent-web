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

  const skillName = text(summary.skillName) ??
    (path.toLowerCase().endsWith("/skill.md") ? basename(path.split("/").slice(0, -1).join("/")) : undefined);
  const title = isSkillDefinition && skillName != null
    ? "已读取 " + skillName + " 技能"
    : "已读取 " + (label || path || "文件");
  const pathNode = props.onOpenFile && path
    ? <button type="button" className="codex-source-tool-path codex-source-tool-path--button"
        onClick={() => props.onOpenFile?.({ path, cwd: props.cwd, hostId: props.hostId })}
        data-agent-activity-file-link="">{path || label}</button>
    : <span className="codex-source-tool-path" data-agent-activity-file-link="">{path || label}</span>;

  return (
    <div className="codex-source-tool-leaf" data-codex-source-leaf="exec-read">
      <ToolSummary label={<>{title}{path ? <> <span className="codex-source-tool-path-separator">·</span> {pathNode}</> : null}</>}
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

function commandSummary(props: ExecCommandLeafProps, elapsed: string | null): string {
  const command = props.hideRawCommand ? "" : commandText(props.item.cmd ?? props.summary.cmd);
  const withCommand = (prefix: string) => command ? prefix + " " + command : prefix;
  if (props.wasDeclinedByAutoReview) return withCommand("命令被自动审查拒绝");
  if (props.isBackgroundTerminalRunning) return withCommand("后台终端已启动");
  if (props.isBackgroundTerminalFinished) {
    return props.wasInterrupted ? withCommand("后台终端已停止") : withCommand("后台终端已完成");
  }
  if (props.wasInterrupted) return withCommand("已停止命令") + (elapsed ? " · " + elapsed : "");
  if (props.isInProgress) return "正在运行命令" + (elapsed ? " · " + elapsed : "");
  return withCommand(command ? "已运行" : "命令已完成") + (elapsed ? " · " + elapsed : "");
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
  const label = commandSummary(props, elapsed);
  const output = isRecord(props.item.output) ? props.item.output : null;
  const outputText = text(output?.aggregatedOutput) ?? "";
  const exitCode = typeof output?.exitCode === "number" ? output.exitCode : undefined;
  const command = commandText(props.item.cmd ?? props.summary.cmd);
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
      {expanded && <div className="codex-source-tool-command__body" data-codex-source-command-body="">
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

function changeCounts(diff: string | null): { added: number; removed: number } | null {
  if (diff == null) return null;
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
  if (status === "auto-review-declined") return "文件变更被自动审查拒绝";
  if (status === "rejected") return "已拒绝";
  const action = type === "add" ? "创建" : type === "delete" ? "删除" : "编辑";
  if (status === "stopped") return "已停止" + action;
  if (status === "streaming" || status === "pending") return "正在" + action;
  return "已" + (type === "add" ? "创建" : type === "delete" ? "删除" : "编辑");
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
  const counts = changeCounts(diff);
  const label = patchChangeLabel(props.change, props.status);
  const type = isRecord(props.change) ? text(props.change.type) : undefined;
  const displayPath = text(isRecord(props.change) ? props.change.move_path : undefined) ?? props.path;
  const openFile = () => props.onOpenFile?.({ path: displayPath, cwd: props.cwd, hostId: props.hostId });
  const canExpand = props.showDiffDetails && diff != null && diff.length > 0;
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
                onClick={openFile} data-agent-activity-file-link="">{displayPath}</button>
            : <span className="codex-source-tool-path" data-agent-activity-file-link="">{displayPath}</span>}
          {counts && <span className="codex-source-tool-patch-file__counts">
            <span className="is-added">+{counts.added}</span>
            <span className="is-removed">−{counts.removed}</span>
          </span>}
        </div>
        <div className="codex-source-tool-patch-file__actions">
          <span className={"codex-source-tool-patch-file__status status-" + props.status}>{label}</span>
          {canExpand && <button type="button" className="codex-source-tool-patch-file__toggle"
            aria-label={(expanded ? "收起" : "展开") + "差异 " + displayPath}
            aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
            data-codex-source-patch-toggle="">
            {expanded ? "收起差异" : "查看差异"}
          </button>}
        </div>
      </div>
      {expanded && diff != null && <div className="codex-source-tool-patch-file__diff"
        role="region" aria-label={displayPath + " 文件差异"} data-codex-source-patch-diff="">
        {unified
          ? <pre>{lines.map((line, index) => {
              const className = line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@ ")
                ? "diff-meta"
                : line.startsWith("+") ? "diff-added"
                  : line.startsWith("-") ? "diff-removed" : "";
              return <span key={index} className={className}>{line}{"\n"}</span>;
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
