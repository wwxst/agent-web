import {test,expect} from "@playwright/test";

test("original Ke/fr and qe filter only source-confirmed rows inside mounted latest ga",async ({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const turn=page.locator('[data-demo-turn-id="review-source-ke-qe"]');
  await expect(turn).toHaveCount(1);
  const latest=turn.locator("[data-codex-current-turn-activity]");
  await expect(latest).toBeVisible();
  // One old completed group is pruned by qe; the active second group remains.
  const groups=latest.locator("[data-codex-activity-group]");
  await expect(groups).toHaveCount(1);
  await expect(groups).toHaveAttribute("data-codex-group-state","summary");
  await groups.locator(".codex-activity-group-row__toggle").click();
  // Ke/fr filtered two redundant exec rows BEFORE original N grouping:
  // a host-confirmed loaded-tool read and a completed visual command that
  // is already represented by the following patch visualization activity.
  await expect(groups.locator(".codex-activity-group-row__subrow")).toHaveCount(3);
  await expect(groups.locator('[data-codex-source-leaf="exec-command"]')).toHaveCount(1);
  await expect(groups.locator('[data-codex-source-leaf="exec-read"]')).toHaveCount(1);
  await expect(groups).toContainText("ordinary/SKILL.md");
  await expect(groups.locator("[data-codex-source-patch]")).toHaveCount(1);
  await expect(groups).not.toContainText("visualize/SKILL.md");
  await expect(groups).not.toContainText("touch .codex/visualizations/preview.html");
  await expect(latest).not.toContainText("git status");
  expect(errors).toEqual([]);
});
