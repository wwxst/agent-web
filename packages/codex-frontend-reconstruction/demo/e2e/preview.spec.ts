import { test, expect } from "@playwright/test";

test("mounts recovered transcript components and handles mock-only interactions", async ({ page }, testInfo) => {
  const uncaughtErrors: string[] = [];
  page.on("pageerror", (error) => uncaughtErrors.push(error.message));
  await page.goto("/");
  const conversationViewport=page.getByRole("region",{name:"对话"});
  await expect(conversationViewport).toHaveAttribute("tabindex","0");
  await expect(conversationViewport).toHaveAttribute("data-thread-scroll-viewport","");
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.locator("[data-demo-role='assistant']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "打开演示工具" })).toBeVisible();
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);
  const layout = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    };
    return { rail: bounds("[data-app-navigation-rail]"), sidebar: bounds(".demo-sidebar"), menubar: bounds(".demo-window-menu"),
      header: bounds(".demo-header"), composer: bounds(".demo-composer"),
      rootWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
      theme: getComputedStyle(document.querySelector(".demo-main")!).backgroundColor };
  });
  expect(layout.rail?.width).toBe(52); // compiled dWc browser:w-13, token --spacing: 4px
  expect(layout.sidebar?.width).toBe(275); // separate app-shared preferred panel width
  expect(layout.sidebar?.x).toBe(52); // rail and secondary sidebar are siblings
  expect(layout.menubar?.height).toBe(36);
  expect(layout.header?.height).toBe(46); // app-shared --height-toolbar
  expect(layout.composer?.width).toBeGreaterThan(650);
  const footerGeometry=await page.evaluate(()=>{
    const main=document.querySelector(".demo-main")!;
    const footer=document.querySelector("[data-thread-scroll-footer='true']")!;
    const viewport=document.querySelector<HTMLElement>("[data-testid='transcript-scroll']")!;
    const outer=main.getBoundingClientRect(),bar=footer.getBoundingClientRect();
    return {
      footerPosition:getComputedStyle(footer).position,
      footerBottom:bar.bottom,mainBottom:outer.bottom,
      padding:parseFloat(getComputedStyle(viewport).getPropertyValue("--thread-scroll-padding-bottom")),
      footerHeight:bar.height,
      scrollPadding:getComputedStyle(viewport).scrollPaddingBottom,
      scrollBottom:viewport.getBoundingClientRect().bottom,
    };
  });
  expect(footerGeometry.footerPosition).toBe("absolute");
  expect(Math.abs(footerGeometry.footerBottom-footerGeometry.mainBottom)).toBeLessThan(1);
  expect(Math.abs(footerGeometry.scrollBottom-footerGeometry.mainBottom)).toBeLessThan(1);
  expect(Math.abs(footerGeometry.padding-footerGeometry.footerHeight-16)).toBeLessThan(2);
  expect(parseFloat(footerGeometry.scrollPadding)).toBeGreaterThan(footerGeometry.footerHeight);
  // The original i_i surface/fade parts are siblings of the actual composer
  // and transcript, not a gradient painted across the entire footer.
  const sourceLayers=await page.evaluate(()=>{
    const viewport=document.querySelector<HTMLElement>("[data-thread-scroll-viewport]")!;
    const footer=document.querySelector<HTMLElement>("[data-thread-scroll-footer]")!;
    const spacer=viewport.querySelector<HTMLElement>("[data-thread-footer-clearance]")!;
    const fade=spacer.querySelector<HTMLElement>('[data-thread-footer-background-part="fade"]')!;
    const surface=footer.querySelector<HTMLElement>('[data-thread-footer-background-part="surface"]')!;
    const style=getComputedStyle(spacer);
    return {
      spacerPosition:style.position,
      spacerHeight:spacer.getBoundingClientRect().height,
      measuredPadding:parseFloat(viewport.style.getPropertyValue("--thread-scroll-padding-bottom")),
      fadeHeight:fade.getBoundingClientRect().height,
      fadeBackground:getComputedStyle(fade).backgroundImage,
      surfacePointerEvents:getComputedStyle(surface).pointerEvents,
      footerBackground:getComputedStyle(footer).backgroundImage,
    };
  });
  expect(sourceLayers.spacerPosition).toBe("sticky");
  expect(Math.abs(sourceLayers.spacerHeight-(sourceLayers.measuredPadding-16))).toBeLessThan(2);
  expect(sourceLayers.fadeHeight).toBe(32);
  expect(sourceLayers.fadeBackground).toContain("linear-gradient");
  expect(sourceLayers.surfacePointerEvents).toBe("none");
  expect(sourceLayers.footerBackground).toBe("none");
  const composerRoot = page.locator('.codex-composer-layout');
  await expect(composerRoot).toHaveAttribute('data-composer-layout', 'multiline');
  await expect(composerRoot).toHaveAttribute('data-composer-density', 'comfortable');
  await expect(composerRoot).toHaveAttribute('data-composer-radius-variant', 'default');
  await expect(page.locator('.codex-composer-layout__footer')).toHaveAttribute('data-composer-rows', 'stacked');
  await expect(page.locator('[data-app-shell-frame]')).toHaveAttribute('data-app-shell-sidebar-open', 'true');
  await expect(page.locator('[data-app-shell-frame]')).toHaveAttribute('data-app-shell-feature-navigation', 'true');
  await expect(page.getByRole('navigation', {name: 'App navigation'})).toBeVisible();
  await expect(page.locator('[data-sidebar-destination="builtin:home"]')).toHaveAttribute('aria-current','page');
  await expect(page.getByRole('button', {name: 'Scheduled'})).toBeDisabled();
  expect(layout.rootWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.theme).toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: testInfo.outputPath("codex-light-shell.png"), animations: "disabled" });

  const composer = page.getByRole("textbox", { name: "演示消息输入" });
  await composer.fill("测试模拟会话投影");
  await page.getByRole("button", { name: "发送模拟消息" }).click();
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "打开演示工具" }).click();
  await page.getByRole("button", { name: /添加 45 条历史/ }).click();
  await expect(page.getByRole("button", { name: /添加 45 条历史/ })).toBeDisabled();
  await page.getByRole("button", { name: /跳到开头/ }).click();
  await expect(page.locator('[data-turn-key="history-content:turn:intro"]')).toBeAttached();
  // Source thread-scroll-layout active viewport is keyboard focusable. Native
  // browser keyboard scrolling must work without bypassing the virtualizer.
  await conversationViewport.focus();
  await expect(conversationViewport).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect.poll(()=>conversationViewport.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await expect(conversationViewport).toHaveCSS("outline-style","solid");
  // The source conversation-gap item variant uses 16px, not the previous
  // hardcoded 22px preview virtualizer gap. Check real mounted row geometry.
  const conversationTokens=await page.evaluate(()=>{
    const css=getComputedStyle(document.documentElement);
    const rows=[...document.querySelectorAll("[data-turn-key]")];
    return {
      item:css.getPropertyValue("--conversation-item-gap").trim(),
      grouped:css.getPropertyValue("--conversation-grouped-item-gap").trim(),
      chat:css.getPropertyValue("--codex-chat-font-size").trim(),
      mountedMargins:rows.map(el=>
        getComputedStyle(el.parentElement!).marginTop),
    };
  });
  expect(conversationTokens.item).toBe("16px");
  expect(conversationTokens.grouped).toBe("4px");
  expect(conversationTokens.mountedMargins).toContain("16px");
  // Different message and code leaves now share app-shared text tokens.
  await expect(page.locator(".demo-markdown").first()).toHaveCSS("font-size","13px");
  await page.getByRole("button", { name: /跳到最新/ }).click();
  const lastRow = page.locator('[data-turn-key="history-content:turn:history-45"]');
  await expect(lastRow).toBeInViewport({ ratio: 0.1 });
  // Unlike the earlier sibling-footer preview, the scroll viewport now
  // extends behind the composer. Measured content clearance must ensure
  // the latest message never sits under the absolute footer.
  const clearance=await page.evaluate(()=>{
    const row=document.querySelector('[data-turn-key="history-content:turn:history-45"]')!;
    const footer=document.querySelector('[data-thread-scroll-footer="true"]')!;
    return footer.getBoundingClientRect().top-row.getBoundingClientRect().bottom;
  });
  expect(clearance).toBeGreaterThanOrEqual(-1);
  // Wt/Gt: live ResizeObserver must update the source CSS variable as the
  // Composer footer grows and keep the pinned-bottom viewport stable.
  const initialFooterPadding=await conversationViewport.evaluate(el =>
    parseFloat(el.style.getPropertyValue("--thread-scroll-padding-bottom")));
  const footer=page.locator('[data-thread-scroll-footer="true"]');
  await footer.evaluate(el => {
    const element=el as HTMLElement;
    element.style.height=`${element.getBoundingClientRect().height+96}px`;
  });
  await expect.poll(()=>conversationViewport.evaluate(el =>
    parseFloat(el.style.getPropertyValue("--thread-scroll-padding-bottom"))
  )).toBeGreaterThan(initialFooterPadding+40);
  await expect.poll(()=>page.locator("[data-thread-footer-clearance]").evaluate(el =>
    el.getBoundingClientRect().height)).toBeGreaterThan(initialFooterPadding+20);
  await expect.poll(()=>conversationViewport.evaluate(el =>
    Math.max(0,el.scrollHeight-el.clientHeight-el.scrollTop)
  )).toBeLessThan(3);
  await footer.evaluate(el => {(el as HTMLElement).style.removeProperty("height");});
  await expect.poll(()=>conversationViewport.evaluate(el =>
    parseFloat(el.style.getPropertyValue("--thread-scroll-padding-bottom"))
  )).toBeLessThan(initialFooterPadding+2);
  const geometry = await page.evaluate(() => {
    const scroll = document.querySelector('[data-testid="transcript-scroll"]');
    const rows = [...document.querySelectorAll('[data-turn-key]')];
    return { scrollTop: scroll?.scrollTop, scrollHeight: scroll?.scrollHeight,
      viewportHeight: scroll?.clientHeight, mountedRowKeys: rows.map(el => el.getAttribute('data-turn-key')) };
  });
  console.log('VIRTUALIZER_VIEWPORT', JSON.stringify(geometry));

  await page.screenshot({ path: testInfo.outputPath("browser-preview.png"), animations: "disabled" });
  expect(uncaughtErrors).toEqual([]);
});

test("switches the mock conversation and shows its real recovered row dispatch", async ({ page }) => {
  const uncaughtErrors: string[] = [];
  page.on("pageerror", (error) => uncaughtErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /工具调用与审批交互/ }).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("工具调用与审批交互");
  await expect(page.locator("[data-demo-role='assistant']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "打开演示工具" })).toBeVisible();
  expect(uncaughtErrors).toEqual([]);
});

test("thread navigation retains canonical transcript, appended history, draft and explicit reset boundary",async({page})=>{
  await page.goto("/");
  const editor=page.getByRole("textbox",{name:"演示消息输入"});
  await editor.fill("未发送的前端草稿");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await editor.fill("仅供审阅会话的草稿");
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  await expect(editor).toContainText("未发送的前端草稿");
  await editor.fill("跨会话保留消息");
  await page.getByRole("button",{name:"发送模拟消息"}).click();
  await expect(page.getByText("已收到你的消息",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByRole("button",{name:"添加 45 条历史"}).click();
  await expect(page.getByRole("button",{name:"添加 45 条历史"})).toBeDisabled();
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await expect(editor).toContainText("仅供审阅会话的草稿");
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  // The existing tool popover remains open across thread switches. Confirm
  // its already-injected history control remains disabled, not recreated.
  await expect(page.getByRole("button",{name:"添加 45 条历史"})).toBeDisabled();
  await page.getByRole("button",{name:"重置"}).click();
  await expect(page.getByRole("button",{name:"添加 45 条历史"})).toBeEnabled();
  await expect(editor).toBeEmpty();
});

test("thread navigation restores its own virtualized scroll distance without forcing bottom follow",async({page})=>{
  await page.goto("/");
  const viewport=page.getByTestId("transcript-scroll");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByRole("button",{name:"添加 45 条历史"}).click();
  await expect.poll(()=>viewport.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(1200);
  const before=await viewport.evaluate(el=>{
    const total=el.scrollHeight-el.clientHeight;
    el.scrollTop=Math.round(total*0.43);
    el.dispatchEvent(new Event("scroll",{bubbles:true}));
    return Math.max(0,total-el.scrollTop);
  });
  expect(before).toBeGreaterThan(300);
  // The source virtualizer measures rendered rows asynchronously. Test a
  // settled user viewport, not a scrollTop set in the middle of a reflow.
  await page.waitForTimeout(350);
  const settledBefore=await viewport.evaluate(el=>Math.max(0,el.scrollHeight-el.clientHeight-el.scrollTop));
  console.log("SOURCE_VIEWPORT_BEFORE",{before,settledBefore});
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("工具调用与审批交互");
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await page.waitForTimeout(500);
  const afterDiagnostics=await viewport.evaluate(el=>({
    distance:Math.max(0,el.scrollHeight-el.clientHeight-el.scrollTop),
    scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,
    rowKeys:[...el.querySelectorAll("[data-turn-key]")].map(n=>n.getAttribute("data-turn-key")).slice(0,12),
  }));
  console.log("SOURCE_VIEWPORT_AFTER",{settledBefore,afterDiagnostics});
  await expect.poll(async()=>{
    const after=await viewport.evaluate(el=>Math.max(0,el.scrollHeight-el.clientHeight-el.scrollTop));
    return Math.abs(after-settledBefore);
  },{timeout:12000}).toBeLessThan(170);
  // Restore an actual scroll position without discarding the same source data.
  await expect(page.getByRole("button",{name:"添加 45 条历史"})).toBeDisabled();
  await page.getByRole("button",{name:"重置"}).click();
  await expect(page.getByRole("button",{name:"添加 45 条历史"})).toBeEnabled();
  await expect.poll(()=>viewport.evaluate(el=>Math.max(0,el.scrollHeight-el.clientHeight-el.scrollTop)))
    .toBeLessThan(125);
});
