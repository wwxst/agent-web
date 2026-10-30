import {test,expect,type Locator,type Page} from "@playwright/test";

async function installWorkspaceHost(page:Page){
  await page.addInitScript(()=>{
    const state={selectCalls:0,reads:[] as string[],revokeCalls:0};
    Object.assign(window,{__pinnedContentTabsTest:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.selectCalls++;
        return {selected:true,name:"fixture-workspace"};
      },
      revokeWorkspaceDirectory:async()=>{state.revokeCalls++;return true;},
      readWorkspaceTextFile:async(request:{path:string;line?:number;endLine?:number})=>{
        state.reads.push(request.path);
        const isIndex=request.path.endsWith("/index.ts");
        return {
          name:isIndex?"index.ts":"App.tsx",
          relativePath:isIndex?"src/index.ts":"src/App.tsx",
          text:isIndex?"export const index = true;\n":"export const app = true;\n",
          line:request.line,endLine:request.endLine,readOnly:true,
        };
      },
    }});
  });
}

async function readHostState(page:Page){
  return page.evaluate(()=>(
    window as unknown as {__pinnedContentTabsTest:{
      selectCalls:number;reads:string[];revokeCalls:number;
    }}
  ).__pinnedContentTabsTest);
}

async function openAppFile(page:Page){
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const attachment=row.getByRole("button",{name:/App\.tsx/});
  await attachment.click();
  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await expect(preview).toBeVisible();
  return {row,preview,attachment};
}

async function pinAppFromTabMenu(preview:Locator){
  const tab=preview.getByRole("tab",{name:"App.tsx"});
  await tab.click({button:"right"});
  const menu=preview.page().getByRole("menu",{name:"Local file tab actions"});
  await expect(menu.getByRole("menuitem",{name:"Pin to sidebar"})).toBeVisible();
  await menu.getByRole("menuitem",{name:"Pin to sidebar"}).click();
  const pinned=preview.page().getByRole("navigation",{name:"Pinned content tabs"});
  await expect(pinned.locator('[data-pinned-content-tab-id]')).toHaveCount(1);
  return pinned;
}

test("pin creates an exact source-tab reference, reveal selects that same tab, and unpin does not close it",async({page})=>{
  await installWorkspaceHost(page);
  const {row,preview}=await openAppFile(page);
  const tabs=preview.getByRole("tablist",{name:"Open local files"});
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");
  const appEditor=preview.locator(".cm-editor").first();
  await appEditor.evaluate(element=>{
    (window as unknown as {__pinnedAppEditor?:Element}).__pinnedAppEditor=element;
  });

  const pinned=await pinAppFromTabMenu(preview);
  const pinRow=pinned.locator('[data-pinned-content-tab-id]').first();
  await expect(pinRow).toHaveAttribute("data-pinned-content-tab-unavailable","false");
  await expect(pinRow.locator(".demo-pinned-item__title")).toHaveText("App.tsx");
  await expect(tabs.locator('[data-source-file-tab-id]').first())
    .toHaveAttribute("data-source-file-tab-preview","false");

  // Open a second file, then select the sidebar pin. It must reveal the
  // existing EditorView rather than issuing another file read or cloning it.
  await row.getByRole("button",{name:/index\.ts/}).click();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await pinRow.locator(".demo-pinned-item__reveal").click();
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");
  expect(await preview.locator(".cm-editor:visible").evaluate(element=>
    element===(window as unknown as {__pinnedAppEditor?:Element}).__pinnedAppEditor
  )).toBe(true);
  expect((await readHostState(page)).reads).toHaveLength(2);

  // Source f7n removes only the sidebar reference. The original file tab
  // remains mounted, selected, and usable.
  const appTab=tabs.getByRole("tab",{name:"App.tsx"});
  await appTab.click({button:"right"});
  const menu=page.getByRole("menu",{name:"Local file tab actions"});
  await expect(menu.getByRole("menuitem",{name:"Unpin from sidebar"})).toBeVisible();
  await menu.getByRole("menuitem",{name:"Unpin from sidebar"}).click();
  await expect(pinned.locator('[data-pinned-content-tab-id]')).toHaveCount(0);
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(appTab).toHaveAttribute("aria-selected","true");
  expect((await readHostState(page)).reads).toHaveLength(2);
});

test("closing a source tab keeps its sidebar reference as unavailable and allows unpin",async({page})=>{
  await installWorkspaceHost(page);
  const {preview}=await openAppFile(page);
  const pinned=await pinAppFromTabMenu(preview);
  const pinRow=pinned.locator('[data-pinned-content-tab-id]').first();

  await preview.getByRole("button",{name:"Close App.tsx tab"}).click();
  await expect(preview).toHaveCount(0);
  await expect(pinRow).toHaveAttribute("data-pinned-content-tab-unavailable","true");
  await pinRow.locator(".demo-pinned-item__reveal").click();
  await expect(page.getByRole("status").filter({
    hasText:"This source tab is unavailable. You can keep the pin or unpin it.",
  })).toBeVisible();
  expect((await readHostState(page)).reads).toHaveLength(1);

  await pinRow.getByRole("button",{name:"Unpin tab"}).click();
  await expect(pinned.locator('[data-pinned-content-tab-id]')).toHaveCount(0);
  expect((await readHostState(page)).reads).toHaveLength(1);
});

test("pinned identity persists across reload but a missing local owner is not falsely presented as live",async({page})=>{
  await installWorkspaceHost(page);
  const {preview}=await openAppFile(page);
  const pinned=await pinAppFromTabMenu(preview);
  await expect(pinned.locator('[data-pinned-content-tab-unavailable="false"]'))
    .toHaveCount(1);
  await expect.poll(()=>page.evaluate(()=>
    window.localStorage.getItem("pinned-content-tabs-v1")??""))
    .toContain("App.tsx");

  await page.reload();
  const restored=page.getByRole("navigation",{name:"Pinned content tabs"});
  const pinRow=restored.locator('[data-pinned-content-tab-id]').first();
  await expect(pinRow).toBeVisible();
  await expect(pinRow).toHaveAttribute("data-pinned-content-tab-unavailable","true");
  expect((await readHostState(page)).reads).toHaveLength(0);
  await pinRow.locator(".demo-pinned-item__reveal").click();
  await expect(page.getByRole("status").filter({
    hasText:"This source tab is unavailable. You can keep the pin or unpin it.",
  })).toBeVisible();
  await pinRow.getByRole("button",{name:"Unpin tab"}).click();
  await expect(restored.locator('[data-pinned-content-tab-id]')).toHaveCount(0);
});
