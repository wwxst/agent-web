import {test,expect} from "@playwright/test";

/**
 * Browser-only native-host simulator. The production app never installs this
 * capability; real filesystem authority is verified separately in Electron.
 * This test checks the actual canonical React message + side-panel lifecycle.
 */
test("actual attachment row opens read-only native-host preview, revokes on thread switch and drops late picker replies",async({page})=>{
  await page.addInitScript(()=>{
    const state={
      selectCalls:0,readCalls:0,revokeCalls:0,delayNext:false,
      release:null as null|((result:{selected:boolean;name?:string})=>void),
    };
    Object.assign(window,{__workspaceTestState:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:()=>{
        state.selectCalls++;
        if(state.delayNext){
          state.delayNext=false;
          return new Promise(resolve=>{state.release=resolve;});
        }
        return Promise.resolve({selected:true,name:"fixture-workspace"});
      },
      revokeWorkspaceDirectory:async()=>{state.revokeCalls++;return true;},
      readWorkspaceTextFile:async(request:{path:string;line?:number;endLine?:number})=>{
        state.readCalls++;
        return {name:"App.tsx",relativePath:"src/App.tsx",
          line:request.line,endLine:request.endLine,
          text:Array.from({length:32},(_,i)=>`source line ${i+1}`).join("\n"),
          readOnly:true};
      },
    }});
  });
  const inspect=()=>page.evaluate(()=>{
    const state=(window as unknown as Window & {__workspaceTestState:{
      selectCalls:number;readCalls:number;revokeCalls:number;
    }}).__workspaceTestState;
    return {select:state.selectCalls,read:state.readCalls,revoke:state.revokeCalls};
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const attachment=page.locator('[data-demo-turn-id^="user-file-attachments-"]')
    .last().getByRole("button",{name:/App\.tsx/});
  await expect(attachment).toBeEnabled();
  await attachment.click();
  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await expect(preview).toBeVisible();
  await expect(preview.getByText("src/App.tsx")).toBeVisible();
  await expect(preview.locator('[data-workspace-file-text]')).toContainText("source line 28");
  // Original Kr/Or is a CodeMirror EditorView. The independent host must
  // never enable editing or allow a renderer-originated save.
  await expect(preview.locator('[data-source-workspace-codemirror="read-only"]'))
    .toBeVisible();
  await expect(preview.locator(".cm-editor")).toBeVisible();
  await expect(preview.locator(".cm-gutters")).toBeVisible();
  await expect(preview.locator(".cm-content")).toHaveAttribute("contenteditable","false");
  const highlightedLines=preview.locator('[data-workspace-file-selected-range]');
  await expect(highlightedLines.first()).toContainText("source line 14");
  await expect(highlightedLines.last()).toContainText("source line 28");
  await expect(preview.locator(".cm-line", {hasText:"source line 29"}))
    .not.toHaveAttribute("data-workspace-file-selected-range","true");
  const immutableBefore=await preview.locator("[data-workspace-file-text]").textContent();
  await preview.locator(".cm-content").focus();
  await page.keyboard.type("NO_WRITE_PERMITTED");
  await expect(preview.locator("[data-workspace-file-text]"))
    .not.toContainText("NO_WRITE_PERMITTED");
  expect(await preview.locator("[data-workspace-file-text]").textContent())
    .toBe(immutableBefore);
  await expect(preview).toContainText("Lines 14-28");
  await expect.poll(async()=>(await inspect()).read).toBe(1);

  // Source conversation identity is the authorization lifetime, not the
  // application window: switching must clear the panel and revoke its grant.
  const navigation=page.getByRole("navigation",{name:"会话"});
  await navigation.getByRole("button").nth(1).click();
  await expect(preview).toHaveCount(0);
  await expect.poll(async()=>(await inspect()).revoke).toBeGreaterThanOrEqual(1);
  await navigation.getByRole("button").first().click();
  const back=page.locator('[data-demo-turn-id^="user-file-attachments-"]')
    .last().getByRole("button",{name:/App\.tsx/});
  await expect(back).toBeEnabled();

  // A pending dialog is asynchronous. If the user switches conversations,
  // its late acceptance cannot reopen a different thread's file panel.
  await page.evaluate(()=>{
    (window as unknown as Window & {__workspaceTestState:{delayNext:boolean}}).__workspaceTestState.delayNext=true;
  });
  await back.click();
  await expect.poll(async()=>(await inspect()).select).toBe(2);
  await back.click();
  expect((await inspect()).select).toBe(2); // one native picker in flight
  await navigation.getByRole("button").nth(1).click();
  await page.evaluate(()=>{
    const state=(window as unknown as Window & {__workspaceTestState:{
      release:null|((value:{selected:boolean;name:string})=>void);
    }}).__workspaceTestState;
    state.release?.({selected:true,name:"fixture-workspace"});
  });
  await expect.poll(async()=>(await inspect()).revoke).toBeGreaterThanOrEqual(2);
  await expect(preview).toHaveCount(0);
  expect((await inspect()).read).toBe(1);
});


test("existing canonical user-message files reuse source k3o tabs, switch, close and revoke on conversation change",async({page})=>{
  await page.addInitScript(()=>{
    const state={selects:0,reads:[] as string[],revokes:0};
    Object.assign(window,{__localFileTabTestState:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.selects++;
        return {selected:true,name:"synthetic-workspace"};
      },
      revokeWorkspaceDirectory:async()=>{state.revokes++;return true;},
      readWorkspaceTextFile:async(request:{
        path:string;line?:number;endLine?:number
      })=>{
        state.reads.push(request.path);
        const isApp=request.path.endsWith("/App.tsx");
        return {name:isApp?"App.tsx":"index.ts",
          relativePath:isApp?"src/App.tsx":"src/index.ts",
          text:isApp?"app original\\napp second":"index original\\nindex second",
          line:request.line,endLine:request.endLine,readOnly:true};
      },
    }});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const user=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const app=user.getByRole("button",{name:/App\.tsx/});
  const index=user.getByRole("button",{name:/index\.ts/});
  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await app.click();
  await expect(preview).toBeVisible();
  const tabs=preview.getByRole("tablist",{name:"Open local files"});
  await expect(tabs.getByRole("tab")).toHaveCount(1);
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");
  await index.click();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("index original");
  await tabs.getByRole("tab",{name:"App.tsx"}).click();
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("app original");
  await app.click();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");
  await tabs.getByRole("button",{name:"Close App.tsx tab"}).click();
  await expect(tabs.getByRole("tab")).toHaveCount(1);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("index original");
  await tabs.getByRole("button",{name:"Close index.ts tab"}).click();
  await expect(preview).toHaveCount(0);
  // A closed tab does not revoke the selected workspace grant in the current
  // thread; a genuine thread switch revokes the grant and all tab state.
  await app.click();
  await expect(preview.getByRole("tab")).toHaveCount(1);
  const navigation=page.getByRole("navigation",{name:"会话"});
  await navigation.getByRole("button").nth(1).click();
  await expect(preview).toHaveCount(0);
  await expect.poll(async()=>page.evaluate(()=>
    (window as unknown as Window & {__localFileTabTestState:{revokes:number}})
      .__localFileTabTestState.revokes)).toBeGreaterThanOrEqual(1);
  await navigation.getByRole("button").first().click();
  await expect(preview).toHaveCount(0);
  const result=await page.evaluate(()=>
    (window as unknown as Window & {__localFileTabTestState:{
      selects:number;reads:string[]
    }}).__localFileTabTestState);
  expect(result.selects).toBe(1);
  expect(result.reads).toHaveLength(4);
});


test("authorized file tabs accept overlapping reads, reject stale reopen results and do not resurrect closed tabs",async({page})=>{
  await page.addInitScript(()=>{
    type Preview={name:string;relativePath:string;text:string;readOnly:true};
    const state={
      selections:0,revocations:0,completed:0,
      reads:[] as Array<{path:string;resolve:(value:Preview)=>void}>,
    };
    Object.assign(window,{__asyncPreviewTestState:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.selections++;
        return {selected:true,name:"fixture-workspace"};
      },
      revokeWorkspaceDirectory:async()=>{state.revocations++;return true;},
      readWorkspaceTextFile:(request:{path:string})=>new Promise<Preview>(resolve=>{
        state.reads.push({path:request.path,resolve});
      }),
    }});
  });
  const readCount=()=>page.evaluate(()=>
    (window as unknown as Window & {
      __asyncPreviewTestState:{reads:unknown[]};
    }).__asyncPreviewTestState.reads.length);
  // The page-side deterministic completion plan avoids passing extra
  // arguments through the project's strict Playwright evaluate declaration.
  const finishNextRead=()=>page.evaluate(()=>{
    const state=(window as unknown as Window & {
      __asyncPreviewTestState:{
        completed:number;
        reads:Array<{path:string;resolve:(file:{
          name:string;relativePath:string;text:string;readOnly:true,
        })=>void}>;
      };
    }).__asyncPreviewTestState;
    const plan=[
      {index:1,text:"newer index body"},
      {index:0,text:"late app body"},
      {index:3,text:"fresh app response"},
      {index:2,text:"stale app response"},
      {index:4,text:"closed tab response"},
    ];
    const next=plan[state.completed++];
    if(next==null)throw new Error("Unexpected deferred workspace completion");
    const pending=state.reads[next.index];
    if(pending==null)throw new Error("Missing deferred workspace read");
    const isApp=pending.path.endsWith("/App.tsx");
    pending.resolve({
      name:isApp?"App.tsx":"index.ts",
      relativePath:isApp?"src/App.tsx":"src/index.ts",
      text:next.text,readOnly:true,
    });
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const app=row.getByRole("button",{name:/App\.tsx/});
  const index=row.getByRole("button",{name:/index\.ts/});
  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await app.click();
  await expect.poll(readCount).toBe(1);
  // The single folder chooser has finished, so a slower read cannot swallow
  // the next file click even when its Promise has not resolved yet.
  await index.click();
  await expect.poll(readCount).toBe(2);
  await finishNextRead();
  await expect(preview).toBeVisible();
  const tabs=preview.getByRole("tablist",{name:"Open local files"});
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await finishNextRead();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("newer index body");

  // Reopening the same file twice must not let the older IO response replace
  // the content of the newer tab identity.
  await app.click();
  await expect.poll(readCount).toBe(3);
  await app.click();
  await expect.poll(readCount).toBe(4);
  await finishNextRead();
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");
  await finishNextRead();
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("fresh app response");
  await expect(preview.locator("[data-workspace-file-text]")).not.toContainText("stale app response");
  await expect(tabs.getByRole("tab")).toHaveCount(2);

  // Closing a tab invalidates its pending request. A late read cannot
  // recreate the just-closed tab or steal focus from the survivor.
  await app.click();
  await expect.poll(readCount).toBe(5);
  await tabs.getByRole("button",{name:"Close App.tsx tab"}).click();
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveCount(0);
  await finishNextRead();
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveCount(0);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  const counters=await page.evaluate(()=>
    (window as unknown as Window & {
      __asyncPreviewTestState:{selections:number};
    }).__asyncPreviewTestState.selections);
  // All concurrent reads must share the single explicit native grant.
  expect(counters).toBe(1);
});


test("source Eqi tab strip menu works on canonical local file tabs with guarded close actions",async({page})=>{
  await page.addInitScript(()=>{
    const state={selections:0,reads:0,revocations:0};
    Object.assign(window,{__tabContextActionsTest:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.selections++;return {selected:true,name:"fixture-root"};
      },
      revokeWorkspaceDirectory:async()=>{state.revocations++;return true;},
      readWorkspaceTextFile:async(request:{path:string})=>{
        state.reads++;
        const app=request.path.endsWith("/App.tsx");
        return {name:app?"App.tsx":"index.ts",
          relativePath:app?"src/App.tsx":"src/index.ts",
          text:app?"original app text":"original index text",readOnly:true};
      },
    }});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const app=row.getByRole("button",{name:/App\.tsx/});
  const index=row.getByRole("button",{name:/index\.ts/});
  const panel=page.getByRole("complementary",{name:"Local file preview"});
  await app.click();
  await index.click();
  const tabs=panel.getByRole("tablist",{name:"Open local files"});
  await expect(tabs.getByRole("tab")).toHaveText(["App.tsx","index.ts"]);

  const menu=page.getByRole("menu",{name:"Local file tab actions"});
  const appTab=tabs.getByRole("tab",{name:"App.tsx"});
  const indexTab=tabs.getByRole("tab",{name:"index.ts"});
  await indexTab.focus();
  await page.keyboard.press("Shift+F10");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Close","Close other tabs","Close tabs to the right",
  ]);
  await expect(menu.getByRole("menuitem",{name:"Close tabs to the right"})).toBeDisabled();
  await expect(menu.getByRole("menuitem",{name:"Close",exact:true})).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem",{name:"Close other tabs"})).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menu.getByRole("menuitem",{name:"Close",exact:true})).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(indexTab).toBeFocused();
  await expect(indexTab).toHaveAttribute("aria-expanded","false");

  await appTab.click({button:"right"});
  await expect(menu.getByRole("menuitem",{name:"Close tabs to the right"})).toBeEnabled();
  await menu.getByRole("menuitem",{name:"Close tabs to the right"}).click();
  await expect(menu).toHaveCount(0);
  await expect(tabs.getByRole("tab")).toHaveText(["App.tsx"]);
  await expect(appTab).toHaveAttribute("aria-selected","true");

  await index.click();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await appTab.focus();
  await page.keyboard.press("ContextMenu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem",{name:"Close other tabs"}).click();
  await expect(tabs.getByRole("tab")).toHaveText(["App.tsx"]);
  await expect(appTab).toHaveAttribute("aria-selected","true");
  await expect(appTab).toBeFocused();

  await index.click();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await indexTab.click({button:"right"});
  await menu.getByRole("menuitem",{name:"Close",exact:true}).click();
  await expect(tabs.getByRole("tab")).toHaveText(["App.tsx"]);
  await expect(appTab).toBeFocused();
  await appTab.click({button:"right"});
  await expect(menu.getByRole("menuitem",{name:"Close other tabs"})).toBeDisabled();
  await expect(menu.getByRole("menuitem",{name:"Close tabs to the right"})).toBeDisabled();
  await menu.getByRole("menuitem",{name:"Close",exact:true}).click();
  await expect(panel).toHaveCount(0);
  const host=await page.evaluate(()=>
    (window as unknown as Window & {
      __tabContextActionsTest:{selections:number;reads:number};
    }).__tabContextActionsTest);
  expect(host.selections).toBe(1);
  expect(host.reads).toBe(4);
});
