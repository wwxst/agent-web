import {test,expect} from "@playwright/test";

test("original qbd shared approval surface has scroll body, semantic reason and responsive scoped footer",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const card=page.locator('[data-demo-turn-id^="mcp-approval-"]').last()
    .locator("[data-codex-approval-surface]");
  await expect(card).toHaveCount(1);
  await expect(card.locator('[aria-atomic="true"][role="alert"]')).toHaveCount(1);
  await expect(card.locator('.codex-source-mcp-approval__reason-row dt')).toHaveText("Reason");
  await expect(card.locator('.codex-source-mcp-approval__reason-row dd'))
    .toHaveText("Read a list of sample project files for display only.");
  const footer=card.locator("form.codex-source-mcp-approval__footer");
  await expect(footer.getByRole("button",{name:"Always allow"})).toHaveCount(1);
  await expect(footer.getByRole("button",{name:"Deny"})).toHaveCount(1);
  await expect(footer.getByRole("button",{name:"Allow once"})).toHaveCount(1);
  await expect(footer.getByRole("button",{name:"Approval options"})).toHaveAttribute("aria-haspopup","menu");
  await expect(footer.getByRole("button",{name:"Allow for session"})).toHaveCount(0);
  const measure=async(width:number)=>card.evaluate((el,w)=>{
    el.style.width=w+"px";
    const footer=el.querySelector(".codex-source-mcp-approval__footer")!;
    const always=footer.querySelector(".codex-source-mcp-approval__action--leading")!;
    const deny=footer.querySelector(".codex-source-mcp-approval__trailing button")!;
    const primary=footer.querySelector(".codex-source-mcp-approval__action--primary")!;
    return {
      direction:getComputedStyle(footer).flexDirection,
      always:always.getBoundingClientRect().toJSON(),
      deny:deny.getBoundingClientRect().toJSON(),
      primary:primary.getBoundingClientRect().toJSON(),
    };
  },width);
  const wide=await measure(600);
  expect(wide.direction).toBe("row");
  expect(wide.always.x).toBeLessThan(wide.deny.x);
  expect(wide.deny.x).toBeLessThan(wide.primary.x);
  expect(Math.abs(wide.deny.y-wide.primary.y)).toBeLessThan(3);
  const narrow=await measure(410);
  expect(narrow.direction).toBe("column");
  expect(narrow.always.y).toBeLessThan(narrow.deny.y);
  expect(narrow.deny.y).toBeLessThan(narrow.primary.y);
  expect(narrow.primary.width).toBeGreaterThan(280);
  await card.evaluate(el=>el.style.removeProperty("width"));
  const options=footer.getByRole("button",{name:"Approval options"});
  await options.click();
  const menu=footer.getByRole("menu",{name:"Approval options"});
  await expect(menu.getByRole("menuitem",{name:"Allow once"})).toBeVisible();
  await expect(menu.getByRole("menuitem",{name:"Allow this conversation"})).toBeVisible();
  await expect(menu.getByRole("menuitem",{name:"Allow once"})).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(options).toBeFocused();
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-qbd-shared-approval-card.png"),
    animations:"disabled"});
});
