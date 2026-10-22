import { expect, test } from "@playwright/test";

test("source-derived AgentActivity section mounts and toggles without backend effects", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  const activity = page.locator("[data-recovered-agent-activity]").first();
  await expect(activity).toBeVisible();
  await expect(activity).toHaveAttribute("data-agent-activity-collapsed", "true");
  const toggle = activity.getByRole("button", { name: /项工具活动/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(activity.locator("[data-agent-activity-content]")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(activity.locator("[data-agent-activity-content]")).toBeVisible();
  await expect(activity.locator("[data-agent-activity-unit]")).toHaveCount(1);
  // The source-shaped leaf uses hydrated data but performs no host I/O.
  await expect(activity.locator('[data-codex-source-leaf="exec-command"]')).toBeVisible();
  await toggle.click();
  await expect(activity.locator("[data-agent-activity-content]")).toBeHidden();
  expect(errors).toEqual([]);
});

test("activity collapse state is isolated between demo conversations",async ({page})=>{
  await page.goto("/");
  const first = page.locator("[data-recovered-agent-activity]").first();
  await first.getByRole("button",{name:/项工具活动/}).click();
  await expect(first).toHaveAttribute("data-agent-activity-collapsed","false");
  await page.getByRole("button", {name:/工具调用与审批交互/}).click();
  const review = page.locator("[data-recovered-agent-activity]").first();
  await expect(review).toHaveAttribute("data-agent-activity-collapsed","true");
  await review.getByRole("button",{name:/项工具活动/}).click();
  await expect(review).toHaveAttribute("data-agent-activity-collapsed","false");
});


test("source-derived group row toggles its real subrows independently",async ({page},testInfo)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  // The outer source Rk begins collapsed; discover the multi-unit activity by
  // the unambiguous second row's synthetic group key rather than fixture text.
  const groupActivity=page.locator("[data-recovered-agent-activity]").nth(1);
  await groupActivity.getByRole("button",{name:/2 项工具活动/}).click();
  const group=groupActivity.locator("[data-codex-activity-group]");
  await expect(group).toBeVisible();
  await expect(group).toHaveAttribute("data-codex-group-state","summary");
  const toggle=group.getByRole("button",{name:/2 项命令/});
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await expect(group.locator("[data-codex-group-details]")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await expect(group.locator("[data-codex-group-details]")).toBeVisible();
  await expect(group.locator(".codex-activity-group-row__subrow")).toHaveCount(2);
  await expect(group.locator('[data-codex-source-leaf="exec-command"]')).toHaveCount(2);
  await group.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("codex-activity-group-expanded.png"),animations:"disabled"});
  await toggle.click();
  await expect(group.locator("[data-codex-group-details]")).toBeHidden();
  expect(errors).toEqual([]);
});

test("fk/SO source detail entry delegates real exec leaves without changing group state", async ({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  const group=page.locator("[data-recovered-agent-activity]").nth(1);
  await group.getByRole("button",{name:/2 项工具活动/}).click();
  await group.locator("[data-codex-activity-group]").getByRole("button",{name:/2 项命令/}).click();
  const leaves=group.locator("[data-codex-tool-activity-item]");
  await expect(leaves).toHaveCount(2);
  const connectedHistory = group.locator("[data-codex-tool-history-connected]");
  await expect(connectedHistory).toHaveCount(2);
  await expect(connectedHistory.first()).toHaveAttribute("data-codex-tool-history-state", "ready");
  await expect(leaves.first()).toHaveAttribute("data-codex-tool-leaf","exec");
  await expect(leaves.first()).toHaveAttribute("data-codex-tool-exec-kind","command");
  await expect(leaves.first()).toHaveAttribute("data-codex-tool-status","finished");
  await expect(leaves.first().locator("[data-demo-xc-command]")).toHaveAttribute("data-demo-summary-kind","unknown");
  await expect(leaves.first().locator("[data-demo-xc-command]")).toHaveAttribute("data-demo-in-progress","false");
  const commandToggle = leaves.first().locator("[data-codex-source-command-toggle]");
  await commandToggle.click();
  await expect(commandToggle).toHaveAttribute("aria-expanded", "true");
  await expect(leaves.first().locator("[data-codex-source-command-body]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("source-shaped PT/IT leaf shows patch status and expands unified diff without host writes", async ({page}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", {name:/工具调用与审批交互/}).click();
  const patchEntry = page.locator('[data-demo-turn-id="review-patch"]');
  await expect(patchEntry).toHaveCount(1);
  const patchActivity = patchEntry.locator("[data-recovered-agent-activity]");
  await expect(patchActivity).toHaveCount(1);
  await patchActivity.getByRole("button", {name:/项工具活动/}).click();
  // The reconstructed host nests the one-item activity disclosure inside the outer section.
  const patchDetailToggle = patchActivity.getByRole("button", {name:/项活动/});
  await patchDetailToggle.click();
  const patch = patchActivity.locator("[data-codex-source-patch]");
  await expect(patch).toBeVisible();
  await expect(patch).toHaveAttribute("data-patch-status", "pending");
  await expect(patch.locator("[data-codex-source-patch-file]")).toHaveCount(2);
  const firstFile = patch.locator("[data-codex-source-patch-file]").first();
  await expect(firstFile.locator(".codex-source-tool-patch-file__status")).toContainText("正在编辑");
  const diffToggle = firstFile.getByRole("button", {name:/切换差异/});
  await diffToggle.click();
  await expect(firstFile.locator("[data-codex-source-patch-diff]")).toBeVisible();
  await expect(firstFile.locator(".diff-added")).toContainText("createToolActivityHistorySource");
  await expect(firstFile.locator("[data-codex-source-patch-diff]")).not.toContainText("diff --git");
  await expect(firstFile.locator("[data-codex-source-diff-line-number]").first()).toBeVisible();
  await expect(firstFile.locator("[data-codex-source-patch-diff]")).not.toContainText("\\n");
  await patchActivity.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("codex-patch-leaf-expanded.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});

test("source-shaped RC/EC/NC leaves route read search and file-list summaries", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", {name:/工具调用与审批交互/}).click();
  const leafEntry = page.locator('[data-demo-turn-id="review-exploration"]');
  await expect(leafEntry).toHaveCount(1);
  const activity = leafEntry.locator("[data-recovered-agent-activity]");
  await expect(activity).toHaveCount(1);
  await activity.getByRole("button", {name:/项工具活动/}).click();
  const group = activity.locator("[data-codex-activity-group]");
  await expect(group).toBeVisible();
  await group.getByRole("button", {name:/3 项命令/}).click();
  await expect(activity.locator('[data-codex-source-leaf="exec-read"]')).toHaveCount(1);
  await expect(activity.locator('[data-codex-source-leaf="exec-search"]')).toHaveCount(1);
  await expect(activity.locator('[data-codex-source-leaf="exec-list-files"]')).toHaveCount(1);
  await expect(activity.locator('[data-codex-source-leaf="exec-read"]')).toContainText("ToolActivityHistorySource.ts");
  await expect(activity.locator('[data-codex-source-leaf="exec-search"]')).toContainText("useSyncExternalStore");
  await expect(activity.locator('[data-codex-source-leaf="exec-list-files"]')).toContainText("src/conversation");
  expect(errors).toEqual([]);
});
