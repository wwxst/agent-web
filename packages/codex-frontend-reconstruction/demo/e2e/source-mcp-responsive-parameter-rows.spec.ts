import {test,expect} from "@playwright/test";

test("mounted MCP details follow source Ibd/Mbd responsive dl rows and we remembers hidden expansion",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
  const card=row.locator("[data-source-mcp-approval-card]");
  await expect(card).toHaveCount(1);
  const path=card.locator('[data-source-mcp-param="path"]');
  await expect(path.locator("dl")).toHaveCount(0);
  await expect(path.locator("dt")).toHaveCount(1);
  await expect(path.locator("dd")).toHaveCount(1);

  // Test the original Ibd @container breakpoint using the SAME mounted
  // parameter row; no detached CSS-only fixture or second rendering tree.
  const measure=async(width:number)=>path.evaluate((el,w)=>{
    el.style.width=w+"px";
    const dt=el.querySelector("dt")!;
    const dd=el.querySelector("dd")!;
    const grid=el.querySelector(".codex-source-mcp-approval__param-row")!;
    return {parent:el.tagName.toLowerCase(),narrowCols:getComputedStyle(grid).gridTemplateColumns,
      dtX:dt.getBoundingClientRect().x,ddX:dd.getBoundingClientRect().x};
  },width);
  const narrow=await measure(320);
  expect(narrow.parent).toBe("dl");
  expect(Math.abs(narrow.dtX-narrow.ddX)).toBeLessThan(2);
  expect(narrow.narrowCols.split(" ").length).toBe(1);
  const wide=await measure(520);
  expect(wide.ddX-wide.dtX).toBeGreaterThan(100);
  expect(wide.narrowCols.split(" ").length).toBe(2);
  await path.evaluate(el=>el.style.removeProperty("width"));

  await card.getByRole("button",{name:"Show 2 more items"}).click();
  const description=card.locator('[data-source-mcp-param="description"]');
  const toggle=description.getByRole("button",{name:"Expand description"});
  await toggle.click();
  await expect(description.locator("pre")).toHaveAttribute("data-source-mcp-param-preview","expanded");
  await expect(description.getByRole("button",{name:"Collapse description"})).toHaveAttribute("aria-expanded","true");
  await card.getByRole("button",{name:"Show fewer items"}).click();
  await expect(description).toHaveCount(0);
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  // Original we stores expansion state above Ee rows in u keyed by name:index:
  // unmounting a hidden extra row must NOT erase its expanded state.
  await expect(description.getByRole("button",{name:"Collapse description"}))
    .toHaveAttribute("aria-expanded","true");
  await expect(description.locator("pre")).toContainText("Line 18: long tool argument");
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("mcp-responsive-details-restored.png"),
    animations:"disabled"});
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
});
