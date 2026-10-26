import {test,expect} from "@playwright/test";

/** Original Fn/Jrd user-controlled code wrap: a single source preference
 * affects every *mounted* code block in the real virtualized transcript.
 * The renderer still owns the original Markdown and copy action. */
test("real submitted Markdown code blocks share original Wrap lines and scroll modes",
  async({page},testInfo)=>{
    await page.goto("/");
    const longToken="sourceWrap_"+("WRAPME0123456789".repeat(28));
    const message=[
      "Verify two source-code-block containers in the canonical conversation.",
      "",
      "```ts",
      `const alpha = "${longToken}";`,
      "```",
      "",
      "```js",
      `const beta = "${longToken}";`,
      "```",
    ].join("\n");
    await page.getByRole("textbox",{name:"演示消息输入"}).fill(message);
    await page.getByRole("button",{name:"发送模拟消息"}).click();
    const row=page.locator('[data-demo-turn-id^="user-"]').last();
    const blocks=row.locator('[data-code-block][data-conversation-code-surface="true"]');
    await expect(blocks).toHaveCount(2);
    await expect(blocks.first()).toHaveAttribute("data-source-code-wrap-lines","false");
    await expect(blocks.nth(1)).toHaveAttribute("data-source-code-wrap-lines","false");
    await expect(blocks.locator("[data-code-block-controls]")).toHaveCount(2);
    await expect(blocks.locator("[data-code-block-action-bar]")).toHaveCount(2);
    const measured=async()=>blocks.evaluateAll(elements=>elements.map(el=>{
      const header=el.querySelector<HTMLElement>('[data-code-block-action-bar]')!;
      const source=el.querySelector<HTMLElement>('[data-code-block-source]')!;
      const pre=source.querySelector("pre")!;
      const button=el.querySelector<HTMLButtonElement>(".demo-markdown-code-wrap")!;
      return {
        wrap:el.getAttribute("data-source-code-wrap-lines"),
        overflowX:getComputedStyle(source).overflowX,
        whitespace:getComputedStyle(pre).whiteSpace,
        headerHeight:header.getBoundingClientRect().height,
        scrollWidth:source.scrollWidth,
        clientWidth:source.clientWidth,
        pressed:button.getAttribute("aria-pressed"),
        text:pre.textContent,
      };
    }));
    const before=await measured();
    for(const x of before){
      expect(x.headerHeight).toBeGreaterThanOrEqual(48);
      expect(x.overflowX).toBe("auto");
      expect(x.whitespace).toBe("pre");
      expect(x.scrollWidth).toBeGreaterThan(x.clientWidth+20);
      expect(x.pressed).toBe("false");
      expect(x.text).toContain(longToken);
    }
    await blocks.first().getByRole("button",{name:"Enable word wrap"}).click();
    await expect(blocks.first()).toHaveAttribute("data-source-code-wrap-lines","true");
    await expect(blocks.nth(1)).toHaveAttribute("data-source-code-wrap-lines","true");
    const wrapped=await measured();
    for(let i=0;i<wrapped.length;i++){
      const x=wrapped[i]!;
      expect(x.overflowX).toBe("hidden");
      expect(x.whitespace).toBe("pre-wrap");
      expect(x.scrollWidth).toBeLessThanOrEqual(x.clientWidth+2);
      expect(x.pressed).toBe("true");
      expect(x.text).toBe(before[i]!.text);
    }
    await blocks.first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path:testInfo.outputPath("source-code-block-word-wrap-enabled.png"),
      animations:"disabled",
    });
    await blocks.nth(1).getByRole("button",{name:"Disable word wrap"}).click();
    await expect(blocks.first()).toHaveAttribute("data-source-code-wrap-lines","false");
    await expect(blocks.nth(1)).toHaveAttribute("data-source-code-wrap-lines","false");
    const reset=await measured();
    expect(reset[0]!.scrollWidth).toBeGreaterThan(reset[0]!.clientWidth+20);
    expect(reset[1]!.scrollWidth).toBeGreaterThan(reset[1]!.clientWidth+20);
  });
