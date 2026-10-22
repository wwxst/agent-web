import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getToolCommandElapsedMs as elapsedMs,
  getToolCommandSummary as summary,
  getSkillScriptSummary,
  isDateTimeCheckCommand,
} from "../build/ToolCommandSummaryModel.js";

const base = {
  summaryType: "unknown",
  command: ["git", "status", "--short"],
  elapsedLabel: null,
  isInProgress: false,
  isBackgroundTerminalRunning: false,
  isBackgroundTerminalFinished: false,
  wasInterrupted: false,
  wasDeclinedByAutoReview: false,
  isExpanded: false,
  showRawCommand: true,
};

test("JC duration uses the live clock only for an in-progress command", () => {
  assert.equal(elapsedMs({ isInProgress: true, startedAtMs: 1000, durationMs: 500, nowMs: 4500 }), 3500);
  assert.equal(elapsedMs({ isInProgress: false, startedAtMs: 1000, durationMs: 2500, nowMs: 9000 }), 2500);
  assert.equal(elapsedMs({ isInProgress: false, startedAtMs: 1000, nowMs: 9000 }), 0);
  assert.equal(elapsedMs({ isInProgress: true, startedAtMs: 9000, nowMs: 1000 }), 0);
});

test("WC completed and interrupted commands include raw command only while collapsed", () => {
  assert.equal(summary({ ...base, elapsedLabel: "2 秒" }), "已运行 git status --short，耗时 2 秒");
  assert.equal(summary({ ...base, isExpanded: true, elapsedLabel: "2 秒" }), "已运行命令，耗时 2 秒");
  assert.equal(summary({ ...base, wasInterrupted: true, elapsedLabel: "2 秒" }), "已停止 git status --short，耗时 2 秒");
  assert.equal(summary({ ...base, isExpanded: true, wasInterrupted: true }), "已停止命令");
});

test("WC background terminal branches preserve their distinct labels", () => {
  assert.equal(summary({ ...base, isInProgress: true, isBackgroundTerminalRunning: true }), "后台终端已启动，运行命令 git status --short");
  assert.equal(summary({ ...base, isInProgress: true, isBackgroundTerminalRunning: true, showRawCommand: false }), "后台终端已启动");
  assert.equal(summary({ ...base, isBackgroundTerminalFinished: true }), "已运行 git status --short");
  assert.equal(summary({ ...base, isBackgroundTerminalFinished: true, wasInterrupted: true }), "后台终端已停止，命令：git status --short");
  assert.equal(summary({ ...base, isBackgroundTerminalFinished: true, showRawCommand: false }), "后台终端已结束");
});

test("WC declined-review summary hides the command when expanded or hidden", () => {
  assert.equal(summary({ ...base, wasDeclinedByAutoReview: true }), "命令被自动审查拒绝：git status --short");
  assert.equal(summary({ ...base, wasDeclinedByAutoReview: true, isExpanded: true }), "命令被自动审查拒绝");
  assert.equal(summary({ ...base, wasDeclinedByAutoReview: true, showRawCommand: false }), "命令被自动审查拒绝");
});

test("GC recognizes only date commands with source-observed date/time flags", () => {
  assert.equal(isDateTimeCheckCommand("date +%Y-%m-%d"), true);
  assert.equal(isDateTimeCheckCommand(["/usr/bin/date", "-u", "+%s"]), true);
  assert.equal(isDateTimeCheckCommand("date --iso-8601=seconds"), true);
  assert.equal(isDateTimeCheckCommand("date --set tomorrow"), false);
  assert.equal(isDateTimeCheckCommand("git date"), false);
});

test("WC date summaries include status and elapsed label", () => {
  assert.equal(summary({ ...base, command: "date +%Y-%m-%d", elapsedLabel: "3 秒", isInProgress: true }), "正在检查当前日期和时间，耗时 3 秒");
  assert.equal(summary({ ...base, command: "date +%Y-%m-%d", elapsedLabel: "3 秒" }), "已检查当前日期和时间，耗时 3 秒");
  assert.equal(summary({ ...base, command: "date +%Y-%m-%d", wasInterrupted: true }), "已停止检查当前日期和时间");
});


test("visualization command summaries follow source path, write-command and status predicates", () => {
  assert.equal(summary({ ...base, command: "mkdir /tmp/visualizations", executionStatus: "inProgress", isInProgress: true }), "正在创建可视化");
  assert.equal(summary({ ...base, command: "apply_patch\n*** Update File: /tmp/visualizations/chart.ts", executionStatus: "completed" }), "已更新可视化");
  assert.equal(summary({ ...base, command: "apply_patch\n*** Add File: /tmp/visualizations/chart.ts", executionStatus: null }), "已创建可视化");
  assert.equal(summary({ ...base, command: "apply_patch\n*** Delete File: /tmp/visualizations/chart.ts", executionStatus: "completed" }), "已运行 apply_patch\n*** Delete File: /tmp/visualizations/chart.ts");
  assert.equal(summary({ ...base, command: "mkdir /tmp/visualizations", executionStatus: "failed" }), "已运行 mkdir /tmp/visualizations");
  assert.equal(summary({ ...base, command: "mkdir /tmp/visualizations", executionStatus: "completed", wasDeclinedByAutoReview: true }), "命令被自动审查拒绝：mkdir /tmp/visualizations");
});


test("ZC/QC/$C classify supported interpreter scripts under skill-owned scripts directories", () => {
  assert.deepEqual(getSkillScriptSummary([
    "python3", "-u", "/workspace/.agents/skills/repo_audit/scripts/check.py",
  ]), { skillName: "Repo Audit", fileName: "check.py" });
  assert.deepEqual(getSkillScriptSummary(
    "bash '/home/user/.codex/skills/code_review/scripts/review.sh' --verbose",
  ), { skillName: "Code Review", fileName: "review.sh" });
  assert.deepEqual(getSkillScriptSummary([
    "sh", "C:\\\\Users\\\\user\\\\.agents\\\\skills\\\\my_skill\\\\scripts\\\\run.sh",
  ]), { skillName: "My Skill", fileName: "run.sh" });
  assert.equal(getSkillScriptSummary(["node", "/workspace/.agents/skills/repo_audit/scripts/check.js"]), null);
  assert.equal(getSkillScriptSummary(["python3", "/workspace/.agents/skills/repo_audit/check.py"]), null);
  assert.equal(getSkillScriptSummary(["python3", "/workspace/scripts/check.py"]), null);
});

test("WC uses the source-specific skill-script label for background start and finish", () => {
  const command = "python3 -u /workspace/.agents/skills/repo_audit/scripts/check.py";
  const rawCommand = ["python3", "-u", "/workspace/.agents/skills/repo_audit/scripts/check.py"];
  assert.equal(summary({
    ...base, command, rawCommand, isInProgress: true, isBackgroundTerminalRunning: true,
  }), "已启动后台终端，运行来自 Repo Audit 技能的 check.py");
  assert.equal(summary({
    ...base, command, rawCommand, isBackgroundTerminalFinished: true,
  }), "后台终端已完成运行来自 Repo Audit 技能的 check.py");
  assert.equal(summary({
    ...base, command, rawCommand, isBackgroundTerminalFinished: true, wasInterrupted: true,
  }), "后台终端已通过 来自 Repo Audit 技能的脚本 check.py 停止");
});

test("WC uses skill-script labels in collapsed summaries but preserves source gating", () => {
  const command = "python3 /workspace/.agents/skills/repo_audit/scripts/check.py";
  const rawCommand = ["python3", "/workspace/.agents/skills/repo_audit/scripts/check.py"];
  assert.equal(summary({ ...base, command, rawCommand, elapsedLabel: "2 秒" }),
    "已在 2 秒内运行 来自 Repo Audit 技能的脚本 check.py");
  assert.equal(summary({ ...base, command, rawCommand, wasInterrupted: true, elapsedLabel: "2 秒" }),
    "运行 2 秒 后停止 来自 Repo Audit 技能的脚本 check.py");
  assert.equal(summary({ ...base, command, rawCommand, isExpanded: true, elapsedLabel: "2 秒" }),
    "已运行命令，耗时 2 秒");
  assert.equal(summary({ ...base, command, rawCommand, summaryType: "test", isBackgroundTerminalFinished: true }),
    "已运行 " + command);
  assert.equal(summary({ ...base, command, rawCommand, showRawCommand: false, isBackgroundTerminalFinished: true }),
    "后台终端已完成运行来自 Repo Audit 技能的 check.py");
});

test("hidden raw-command mode never adds elapsed text to summaries", () => {
  assert.equal(summary({ ...base, showRawCommand: false, elapsedLabel: null }), "已运行命令");
  assert.equal(summary({ ...base, showRawCommand: false, isInProgress: true, elapsedLabel: null }), "正在运行命令");
});
