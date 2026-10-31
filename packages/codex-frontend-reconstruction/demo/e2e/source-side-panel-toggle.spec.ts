import {test,expect} from "@playwright/test";

test("thread header toggles the read-only side panel without unmounting tabs or CodeMirror views",async({page})=>{
  await page.addInitScript(()=>{
    const state={selects:0,reads:[] as string[]};
    Object.assign(window,{__sidePanelToggleTest:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.selects++;
        return {selected:true,name:"fixture-workspace"};
      },
      revokeWorkspaceDirectory:async()=>true,
      readWorkspaceTextFile:async(request:{path:string;line?:number;endLine?:number})=>{
        state.reads.push(request.path);
        const isIndex=request.path.endsWith("/index.ts");
        return {
          name:isIndex?"index.ts":"App.tsx",
          relativePath:isIndex?"src/index.ts":"src/App.tsx",
          text:Array.from({length:100},(_,index)=>`source line ${index+1}`).join("\n"),
          line:request.line,endLine:request.endLine,readOnly:true,
        };
      },
    }});
  });

  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  await row.getByRole("button",{name:/App\.tsx/}).click();

  await expect(page.getByRole("complementary",{name:"Local file preview"})).toBeVisible();
  const preview=page.locator("[data-independent-workspace-preview]");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-source-side-panel-visible","true");
  const toggle=page.getByTestId("toggle-side-panel");
  await expect(toggle).toHaveAttribute("aria-pressed","true");

  const editor=preview.locator(".cm-editor").first();
  await expect(editor).toBeVisible();
  await editor.evaluate(element=>{
    (window as Window&{__sidePanelEditor?:Element}).__sidePanelEditor=element;
  });
  const scroller=editor.locator(".cm-scroller");
  await scroller.evaluate(element=>{
    element.scrollTop=180;
    element.dispatchEvent(new Event("scroll",{bubbles:true}));
  });
  const originalScroll=await scroller.evaluate(element=>element.scrollTop);
  expect(originalScroll).toBeGreaterThan(0);

  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed","false");
  await expect(preview).toBeHidden();
  await expect(preview).toHaveAttribute("hidden","");
  await expect(preview).toHaveAttribute("aria-hidden","true");
  await expect(preview).toHaveAttribute("data-source-side-panel-visible","false");
  // Hidden means no layout or accessibility surface, not a destroyed tab.
  await expect(preview.locator(".cm-editor")).toHaveCount(1);
  const focusedTestId=await page.evaluate(()=>document.activeElement?.getAttribute("data-testid"));
  expect(focusedTestId).toBe("toggle-side-panel");

  await toggle.press("Enter");
  await expect(preview).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  expect(await editor.evaluate(element=>
    element===(window as Window&{__sidePanelEditor?:Element}).__sidePanelEditor
  )).toBe(true);
  await expect.poll(()=>scroller.evaluate(element=>element.scrollTop)).toBe(originalScroll);

  // A newly opened file is an explicit panel-opening intent, even after the
  // user hid the previous panel. The native host is read only once per file.
  await toggle.press("Space");
  await expect(preview).toBeHidden();
  await row.getByRole("button",{name:/index\.ts/}).click();
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");

  // A sidebar pin reveal is also an explicit open intent and selects the
  // existing tab rather than reading a second copy of its contents.
  const appTab=preview.getByRole("tab",{name:"App.tsx"});
  await appTab.click({button:"right"});
  const menu=page.getByRole("menu",{name:"Local file tab actions"});
  await menu.getByRole("menuitem",{name:"Pin to sidebar"}).click();
  const pinned=page.getByRole("navigation",{name:"Pinned content tabs"});
  const appPin=pinned.locator('[data-pinned-content-tab-id]').first();
  await expect(appPin).toBeVisible();

  await toggle.press("Space");
  await expect(preview).toBeHidden();
  await appPin.locator(".demo-pinned-item__reveal").click();
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");

  const state=await page.evaluate(()=>{
    const target=window as unknown as {__sidePanelToggleTest:{selects:number;reads:string[]}};
    return target.__sidePanelToggleTest;
  });
  expect(state.selects).toBe(1);
  expect(state.reads).toEqual(["src/App.tsx","src/index.ts"]);
});
