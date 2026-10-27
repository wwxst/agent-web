import {test,expect} from "@playwright/test";

test("original MCP risk header, emphasized tool title and unfolded multiline parameters mount in real transcript",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
  const card=row.locator('[data-source-mcp-approval-card]');
  await expect(card).toHaveCount(1);
  const header=card.locator('[data-source-mcp-header-variant]');
  await expect(header).toHaveAttribute("data-source-mcp-header-variant","elevated-risk");
  await expect(header).toHaveText(/Elevated Risk/);
  // Source ye replaces normal header content for high risk; the trusted
  // connector appears only in the title's source Se formatting.
  await expect(header).not.toContainText("Fixture files MCP connector");
  const title=card.locator(".codex-source-mcp-approval__title");
  await expect(title).toHaveText("Allow Fixture files MCP connector to run files.search tool?");
  await expect(title.locator(".codex-source-mcp-approval__tool-name")).toHaveText("files.search");
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  const description=card.locator('[data-source-mcp-param="description"] pre');
  await expect(description).toHaveAttribute("data-source-mcp-param-preview","preview");
  const preview=await description.evaluate(el=>{
    const css=getComputedStyle(el);
    return {height:el.getBoundingClientRect().height,
      lineHeight:parseFloat(css.lineHeight),clamp:css.webkitLineClamp,
      overflow:css.overflowY};
  });
  expect(preview.clamp).toBe("4");
  expect(preview.height).toBeLessThan(100);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-mcp-risk-header-clamped-params.png"),
    animations:"disabled"});
  await card.getByRole("button",{name:"Expand description"}).click();
  await expect(description).toHaveAttribute("data-source-mcp-param-preview","expanded");
  const expanded=await description.evaluate(el=>({
    height:el.getBoundingClientRect().height,
    text:el.textContent,
    maxHeight:getComputedStyle(el).maxHeight,
  }));
  expect(expanded.text).toContain("Line 18: long tool argument");
  expect(expanded.height).toBeGreaterThan(preview.height*2);
  expect(expanded.maxHeight).toBe("none");
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-mcp-expanded-full-argument.png"),
    animations:"disabled"});
  // This presentation operation does not submit permission responses.
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
});
