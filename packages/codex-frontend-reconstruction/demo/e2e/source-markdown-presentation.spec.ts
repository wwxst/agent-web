import {test,expect} from "@playwright/test";

/** Original compiled markdown CSS and user-message Rt: verify geometry inside
 * the actual mounted/virtualized React user message, not a demo-only HTML
 * specimen or a screenshot oracle detached from app event state. */
test("original user bubble + Markdown structural geometry in sent live turn",async({page},testInfo)=>{
  await page.goto("/");
  const input=page.getByRole("textbox",{name:"演示消息输入"});
  await input.fill([
    "Layout evidence from the original Codex Markdown component.",
    "",
    "## Source heading",
    "",
    "- First item",
    "- Second item",
    "",
    "> Source quotation",
    "",
    "Inline `source-code` should remain inline.",
    "",
    "| Name | Value |",
    "| --- | --- |",
    "| Width | 70% |",
    "| Padding | 16px |",
  ].join("\n"));
  await page.getByRole("button",{name:"发送模拟消息"}).click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  const bubble=row.locator('[data-conversation-message="user"]');
  const md=bubble.locator(".demo-markdown");
  await expect(md.getByRole("heading",{name:"Source heading"})).toBeVisible();
  await expect(md.locator("table")).toHaveCount(1);
  await expect(md.locator("blockquote")).toHaveCount(1);
  const actual=await bubble.evaluate(el=>{
    const read=(node:Element,prop:string)=>getComputedStyle(node).getPropertyValue(prop).trim();
    const md=el.querySelector(".demo-markdown")!;
    const h2=md.querySelector("h2")!,list=md.querySelector("ul")!;
    const quote=md.querySelector("blockquote")!,table=md.querySelector("table")!;
    const inline=Array.from(md.querySelectorAll("code"))
      .find(c=>c.textContent==="source-code")!;
    const wrapper=el.parentElement!;
    return {
      bubbleWidth:el.getBoundingClientRect().width,
      wrapperMaxWidth:read(wrapper,"max-width"),
      bubblePaddingInline:read(el,"padding-inline-start"),
      bubbleRadius:read(el,"border-top-left-radius"),
      h2Size:parseFloat(read(h2,"font-size")),
      baseSize:parseFloat(read(md,"font-size")),
      h2MarginTop:read(h2,"margin-top"),
      listIndent:read(list,"padding-inline-start"),
      listStyle:read(list,"list-style-type"),
      quoteIndent:read(quote,"padding-inline-start"),
      quoteStroke:getComputedStyle(quote,"::before").width,
      quoteStrokeBackground:getComputedStyle(quote,"::before").backgroundColor,
      tableCollapse:read(table,"border-collapse"),
      tableScale:parseFloat(read(table,"font-size"))/parseFloat(read(md,"font-size")),
      inlineScale:parseFloat(read(inline,"font-size"))/parseFloat(read(md,"font-size")),
    };
  });
  expect(actual.wrapperMaxWidth).toBe("70%");
  expect(actual.bubblePaddingInline).toBe("16px");
  expect(actual.bubbleRadius).toBe("22px");
  expect(actual.h2Size/actual.baseSize).toBeCloseTo(1.5,1);
  expect(actual.h2MarginTop).toBe("32px");
  expect(actual.listStyle).toBe("disc");
  expect(parseFloat(actual.listIndent)/actual.baseSize).toBeCloseTo(1.625,1);
  expect(actual.quoteIndent).toBe("24px");
  expect(actual.quoteStroke).toBe("4px");
  expect(actual.quoteStrokeBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(actual.tableCollapse).toBe("separate");
  expect(actual.tableScale).toBeCloseTo(.875,1);
  expect(actual.inlineScale).toBeCloseTo(.875,1);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-markdown-real-user-turn.png"),animations:"disabled"});
});
