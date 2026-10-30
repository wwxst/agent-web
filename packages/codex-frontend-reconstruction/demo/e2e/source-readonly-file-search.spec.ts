import {test,expect} from "@playwright/test";

test("read-only local CodeMirror restores the original file Find panel and navigation",async({page})=>{
  await page.addInitScript(()=>{
    const state={selects:0,reads:[] as Array<{path:string;line?:number;endLine?:number}>};
    Object.assign(window,{__readOnlyFileSearchState:state});
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
        state.reads.push({...request});
        return {
          name:"App.tsx",relativePath:"src/App.tsx",
          text:Array.from({length:80},(_,index)=>`source line ${index+1}`).join("\n"),
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

  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await expect(preview).toBeVisible();
  const editor=preview.locator(".cm-editor:visible");
  const content=editor.locator(".cm-content");
  await expect(content).toHaveAttribute("contenteditable","false");

  // Mod-f is the source editor's file Find command, not the thread-wide Find.
  await content.click();
  await content.press("Control+f");
  const searchPanel=editor.locator(".cm-text-file-search-panel");
  const input=searchPanel.locator('input[aria-label="Find"]');
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill("source line 2");
  await expect(searchPanel.getByRole("status")).toHaveText("1 / 11 results");
  await expect(editor.locator(".cm-searchMatch").first()).toBeVisible();
  await expect(searchPanel.locator('input[aria-label="Replace"]')).toHaveCount(0);

  await input.press("Enter");
  await expect(searchPanel.getByRole("status")).toHaveText("2 / 11 results");
  await expect.poll(async()=>editor.locator(".cm-searchMatch-selected")
    .evaluate(element=>element.closest(".cm-line")?.textContent?.trim()??null))
    .toBe("source line 20");

  await content.press("Shift+F3");
  await expect(searchPanel.getByRole("status")).toHaveText("1 / 11 results");
  await content.press("Control+g");
  await expect(searchPanel.getByRole("status")).toHaveText("2 / 11 results");

  await searchPanel.getByRole("button",{name:"Previous match"}).click();
  await expect(searchPanel.getByRole("status")).toHaveText("1 / 11 results");
  await expect.poll(async()=>editor.locator(".cm-searchMatch-selected")
    .evaluate(element=>element.closest(".cm-line")?.textContent?.trim()??null))
    .toBe("source line 2");

  await input.focus();
  await input.press("Escape");
  await expect(searchPanel).toHaveCount(0);
  await expect(content).toHaveAttribute("contenteditable","false");
  await expect(editor.locator(".cm-searchMatch")).toHaveCount(0);

  // Reopening preserves the current query; F3 advances through matches.
  await content.press("Control+f");
  await expect(searchPanel.locator('input[aria-label="Find"]')).toHaveValue("source line 2");
  await content.press("F3");
  await expect(searchPanel.getByRole("status")).toHaveText("2 / 11 results");
  await expect(content).toHaveAttribute("contenteditable","false");

  const state=await page.evaluate(()=>{
    const target=window as unknown as {__readOnlyFileSearchState:{
      selects:number;reads:Array<{path:string;line?:number;endLine?:number}>;
    }};
    return target.__readOnlyFileSearchState;
  });
  expect(state.selects).toBe(1);
  expect(state.reads).toHaveLength(1);
});
