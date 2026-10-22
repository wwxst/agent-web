import * as React from "react";
import {
  getToolPatchStatus,
  type ToolItem,
} from "../conversation/ToolActivityDetailModel.js";
import { isMeaningfulReadToolActivity, getVisualizationActivityKind } from "../conversation/ToolActivityHistorySourceTransforms.js";
import { getToolPatchDiffPresentation, getToolPatchDiffText } from "../conversation/ToolPatchDiffPresentationModel.js";
import { CodexSourcePatchDiffPreview } from "./CodexSourcePatchDiffPreview.js";
import { getToolCommandElapsedMs, getToolCommandSummary } from "../conversation/ToolCommandSummaryModel.js";
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
        aria-label="存在自动审批审查记录" title="自动审批审查记录" data-codex-source-review-indicator="">✓</span>}
    </div>
  );
}

function ApprovalReviewDetails(props: { reviews: unknown; isDeclined?: boolean }) {
  const reviews = Array.isArray(props.reviews) ? props.reviews.filter(isRecord) : [];
  if (reviews.length === 0) return null;
  if (props.isDeclined) {
    return <div className="codex-source-tool-review-details" data-codex-source-review-details="">
      <p>需要明确授权才能执行此操作。</p>
      {reviews.map((review, index) => {
        const rationale = text(review.rationale) ?? text(review.reason) ?? text(review.message);
        return rationale ? <p key={text(review.id) ?? index}>{rationale}</p> : null;
      })}
    </div>;
  }
  return <div className="codex-source-tool-review-details" data-codex-source-review-details="">
    {reviews.map((review, index) => {
      const status = text(review.status) ?? "审查记录";
      const risk = text(review.riskLevel);
      const rationale = text(review.rationale) ?? text(review.reason) ?? text(review.message);
      return <details key={text(review.id) ?? index} className="codex-source-tool-review-details__item">
        <summary>{status}{risk ? " · " + risk : ""}</summary>
        {rationale && <p>{rationale}</p>}
      </details>;
    })}
  </div>;
}

function ToolSummaryWithReviews(props: {
  label: React.ReactNode;
  summaryIcon?: React.ReactNode;
  automaticApprovalReviews?: unknown;
  className?: string;
}) {
  if (!reviewsExist(props.automaticApprovalReviews)) return <ToolSummary {...props} />;
  return <details className="codex-source-tool-summary-disclosure" data-codex-source-review-disclosure="">
    <summary><ToolSummary {...props} /></summary>
    <ApprovalReviewDetails reviews={props.automaticApprovalReviews} />
  </details>;
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
      <ToolSummaryWithReviews label={isSkillDefinition ? title : <>{title} {pathNode}</>}
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
    <ToolSummaryWithReviews label={label} summaryIcon={props.summaryIcon}
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
    <ToolSummaryWithReviews label={label} summaryIcon={props.summaryIcon}
      automaticApprovalReviews={props.automaticApprovalReviews} />
  </div>;
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
  const [initialStartedAtMs] = React.useState(() =>
    startedAtMs ?? (props.isInProgress ? Date.now() : null));
  const effectiveStartedAtMs = startedAtMs ?? initialStartedAtMs;
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (props.hideRawCommand || !props.isInProgress || props.isBackgroundTerminalRunning ||
        effectiveStartedAtMs == null) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [props.hideRawCommand, props.isInProgress, props.isBackgroundTerminalRunning, effectiveStartedAtMs]);

  const elapsedMs = getToolCommandElapsedMs({
    durationMs, isInProgress: props.isInProgress, nowMs, startedAtMs: effectiveStartedAtMs,
  });
  const elapsed = !props.hideRawCommand && elapsedMs > 0 ? formatElapsed(elapsedMs) : null;
  const label = getToolCommandSummary({
    summaryType: text(props.summary.type) ?? "unknown",
    command: props.summary.cmd,
    executionStatus: text(props.item.executionStatus),
    elapsedLabel: elapsed,
    isInProgress: props.isInProgress,
    isBackgroundTerminalRunning: props.isBackgroundTerminalRunning,
    isBackgroundTerminalFinished: props.isBackgroundTerminalFinished,
    wasInterrupted: props.wasInterrupted,
    wasDeclinedByAutoReview: props.wasDeclinedByAutoReview,
    isExpanded: expanded,
    showRawCommand: !props.hideRawCommand,
  });
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
      {props.hideRawCommand
        ? <div className="codex-source-tool-command__static" data-codex-source-command-static="">
            <ToolSummary label={label} summaryIcon={props.showSummaryIcon ? props.summaryIcon : null}
              automaticApprovalReviews={props.item.automaticApprovalReviews}
              className={props.summaryTone === "muted" ? "is-muted" : ""} />
          </div>
        : <button type="button" className="codex-source-tool-command__toggle"
            aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
            data-codex-source-command-toggle="">
            <span className={"codex-source-tool-command__chevron" + (expanded ? " is-expanded" : "")}
              aria-hidden="true">›</span>
            <ToolSummary label={label} summaryIcon={props.showSummaryIcon ? props.summaryIcon : null}
              automaticApprovalReviews={props.item.automaticApprovalReviews}
              className={props.summaryTone === "muted" ? "is-muted" : ""} />
          </button>}
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
        {!props.wasDeclinedByAutoReview && <ApprovalReviewDetails reviews={props.item.automaticApprovalReviews} />}
        {props.wasDeclinedByAutoReview && <div className="codex-source-tool-command__review">
          <strong>自动审查拒绝</strong>
          <p>{denialRationale || "没有提供拒绝原因。"}</p>
        </div>}
      </div>}
    </div>
  );
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
  grantRoot?: string | null | undefined;
  hostId: string;
  onOpenFile?: (request: ToolActivityOpenFileRequest) => void;
  automaticApprovalReviews?: unknown;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const diff = getToolPatchDiffText(props.path, props.change);
  const diffPresentation = getToolPatchDiffPresentation(diff);
  const counts = diffPresentation;
  const label = patchChangeLabel(props.change, props.status);
  const type = isRecord(props.change) ? text(props.change.type) : undefined;
  const displayPath = props.path;
  const shortPath = basename(displayPath);
  const openFile = () => props.onOpenFile?.({ path: props.path, ...(diffPresentation ? { line: diffPresentation.openLocationLine } : {}), cwd: props.grantRoot ?? props.cwd ?? null, hostId: props.hostId });
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
          {props.status === "auto-review-declined" && <span className="codex-source-tool-patch-file__declined-label">文件变更被自动审查拒绝：</span>}
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
          {props.status !== "auto-review-declined" && <span className={"codex-source-tool-patch-file__status status-" + props.status}>{label}</span>}
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
          ? <>
              <ApprovalReviewDetails reviews={props.automaticApprovalReviews} isDeclined={props.status === "auto-review-declined"} />
              <div className="codex-source-tool-patch-file__empty">差异过大，无法预览</div>
            </>
          : diff === ""
            ? <>
                <ApprovalReviewDetails reviews={props.automaticApprovalReviews} isDeclined={props.status === "auto-review-declined"} />
                <div className="codex-source-tool-patch-file__empty">{isDelete ? "文件内容已删除" : "没有差异"}</div>
              </>
            : unified
              ? <CodexSourcePatchDiffPreview patch={diff}
                  header={<ApprovalReviewDetails reviews={props.automaticApprovalReviews}
                    isDeclined={props.status === "auto-review-declined"} />} />
              : <>
                  <ApprovalReviewDetails reviews={props.automaticApprovalReviews} isDeclined={props.status === "auto-review-declined"} />
                  <pre className={isAdd ? "diff-added-file" : isDelete ? "diff-deleted-file" : ""}>{diff}</pre>
                </>}
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
          status={status} showDiffDetails={props.showDiffDetails} cwd={props.cwd} grantRoot={props.grantRoot}
          hostId={props.hostId} onOpenFile={props.onOpenFile}
          automaticApprovalReviews={item.automaticApprovalReviews} />)}
      </div>
    </div>
  );
}
