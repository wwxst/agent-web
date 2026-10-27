import {test,expect} from "@playwright/test";

test("source KZu clips its content while portaled Mae approval options stay visible and anchored",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-mcp-approval-request").click();
 const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
 const card=row.locator("[data-codex-approval-surface]");
 const options=card.getByRole("button",{name:"Approval options"});
 await options.click();
 const menu=page.getByRole("menu",{name:"Approval options"});
 await expect(menu).toBeVisible();
 const placement=async()=>page.evaluate(()=>{
   const card=document.querySelector("[data-codex-approval-surface][data-source-mcp-reply-phase='idle']");
   const button=card?.querySelector<HTMLButtonElement>('[aria-label="Approval options"]');
   const menu=document.querySelector<HTMLElement>("[data-source-approval-menu-portal]");
   if(!card||!button||!menu)return null;
   const anchor=button.getBoundingClientRect(),overlay=menu.getBoundingClientRect();
   return {
     cardClip:getComputedStyle(card).overflowX,
     portaled:menu.parentElement===document.body,
     outsideCard:!card.contains(menu),
     overlay:{x:overlay.x,y:overlay.y,width:overlay.width,height:overlay.height,
       right:overlay.right,bottom:overlay.bottom},
     anchor:{top:anchor.top,bottom:anchor.bottom,right:anchor.right},
     side:menu.dataset.sourceApprovalMenuPlacement,
     maxHeight:getComputedStyle(menu).maxHeight,
     viewport:{width:innerWidth,height:innerHeight},
   };
 });
 const initial=await placement();
 expect(initial).not.toBeNull();
 expect(initial!.cardClip).toBe("hidden");
 expect(initial!.portaled).toBe(true);
 expect(initial!.outsideCard).toBe(true);
 expect(initial!.overlay.x).toBeGreaterThanOrEqual(7);
 expect(initial!.overlay.right).toBeLessThanOrEqual(initial!.viewport.width-7);
 expect(initial!.overlay.y).toBeGreaterThanOrEqual(7);
 expect(initial!.overlay.bottom).toBeLessThanOrEqual(initial!.viewport.height-7);
 if(initial!.side==="top")expect(initial!.overlay.bottom)
   .toBeLessThanOrEqual(initial!.anchor.top-4);
 else expect(initial!.overlay.y).toBeGreaterThanOrEqual(initial!.anchor.bottom+4);
 await page.setViewportSize({width:1040,height:720});
 await expect.poll(async()=>{
   const next=await placement();
   return next?.overlay.right!=null&&next.overlay.right<=1033&&
     next.overlay.x>=7&&next.overlay.bottom<=713;
 }).toBe(true);
 await expect(menu.getByRole("menuitem",{name:"Allow this conversation"})).toBeVisible();
 const menuId=await menu.getAttribute("id");
 expect(menuId).not.toBeNull();
 await expect(options).toHaveAttribute("aria-controls",menuId!);
 await row.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-clipped-card-portaled-menu.png"),animations:"disabled"});
 await page.keyboard.press("Escape");
 await expect(menu).toHaveCount(0);
 await expect(options).toBeFocused();
 await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
 await options.click();
 await expect(menu).toBeVisible();
 // The menu is not a leftover screen-level element after clicking outside.
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await expect(menu).toHaveCount(0);
 await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
});
