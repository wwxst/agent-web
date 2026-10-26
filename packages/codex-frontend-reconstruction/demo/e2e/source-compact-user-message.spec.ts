import {test,expect} from "@playwright/test";

/** Original user-message Rt: explicit isAeonFormatted selects
 * _compactMessageBubble_168sz_15 in the canonical virtualized user row.
 * This review item is an explicitly tagged TEST FIXTURE, not an inferred
 * chat-level Agent/feature-flag setting. */
test("mounted source user message applies compact Aeon geometry only for explicit flag",
  async({page},testInfo)=>{
    await page.goto("/");
    // The normal message must remain on the standard source bubble path.
    await page.locator('[data-testid="transcript-scroll"]').evaluate(
      (el:HTMLElement)=>{el.scrollTop=0;},
    );
    const standard=page.locator('[data-demo-turn-id="intro"] [data-conversation-message="user"]');
    await expect(standard).toHaveAttribute("data-source-user-message-format","standard");
    const standardGeometry=await standard.evaluate(el=>{
      const style=getComputedStyle(el);
      return {radius:style.borderTopLeftRadius,padding:style.paddingLeft,
        maxWidth:getComputedStyle(el.closest(".demo-row--user")!
          .querySelector(":scope > div:not(.demo-time-marker)")!).maxWidth};
    });
    expect(standardGeometry).toEqual({radius:"22px",padding:"16px",maxWidth:"70%"});

    await page.getByRole("button",{name:/工具调用与审批交互/}).click();
    await page.locator('[data-testid="transcript-scroll"]').evaluate(
      (el:HTMLElement)=>{el.scrollTop=0;},
    );
    const compact=page.locator(
      '[data-demo-turn-id="review-intro"] [data-conversation-message="user"]');
    await expect(compact).toHaveAttribute("data-source-user-message-format","compact");
    const actual=await compact.evaluate(el=>{
      const st=getComputedStyle(el);
      const outer=el.closest(".demo-row--user")!.querySelector(
        ":scope > div:not(.demo-time-marker)")!;
      const markdown=el.querySelector(".demo-markdown")!;
      const md=getComputedStyle(markdown);
      return {
        maxWidth:st.maxWidth,
        wrapperMaxWidth:getComputedStyle(outer).maxWidth,
        horizontalPadding:st.paddingLeft,
        verticalPadding:st.paddingTop,
        radius:st.borderTopLeftRadius,
        width:el.getBoundingClientRect().width,
        lineHeight:md.lineHeight,
        letterSpacing:md.letterSpacing,
      };
    });
    expect(actual.maxWidth).toContain("456px");
    expect(actual.wrapperMaxWidth).toContain("456px");
    expect(actual.horizontalPadding).toBe("12px");
    expect(actual.verticalPadding).toBe("8px");
    expect(actual.radius).toBe("16px");
    expect(actual.width).toBeLessThanOrEqual(456);
    expect(actual.lineHeight).toBe("17px");
    expect(parseFloat(actual.letterSpacing)).toBeCloseTo(-.13,1);
    await compact.scrollIntoViewIfNeeded();
    await page.screenshot({path:testInfo.outputPath("source-aeon-compact-live-message.png"),
      animations:"disabled"});
  },
);
