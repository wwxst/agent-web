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
          text:Array.from({length:80},(_,i)=>`source line ${i+1}`).join("\n"),
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
  await expect(preview.locator(".cm-editor:visible")).toBeVisible();
  await expect(preview.locator(".cm-gutters:visible")).toBeVisible();
  await expect(preview.locator(".cm-content:visible")).toHaveAttribute("contenteditable","false");
  const highlightedLines=preview.locator('[data-workspace-file-selected-range]');
  await expect(highlightedLines.first()).toContainText("source line 14");
  await expect(highlightedLines.last()).toContainText("source line 28");
  await expect(preview.locator(".cm-line:visible", {hasText:"source line 29"}))
    .not.toHaveAttribute("data-workspace-file-selected-range","true");
  // Source hn's attachment route carries the one-based column from Qe into
  // the same mounted CodeMirror selection, not merely into a line highlight.
  await preview.locator(".cm-content:visible").focus();
  await expect.poll(async()=>preview.locator(".cm-content:visible").evaluate(content=>{
    const selection=content.ownerDocument.getSelection();
    const anchor=selection?.anchorNode;
    const line=anchor instanceof Element?anchor.closest(".cm-line"):
      anchor?.parentElement?.closest(".cm-line");
    return {line:line?.textContent?.trim()??null,
      offset:selection?.anchorOffset??null};
  })).toEqual({line:"source line 14",offset:0});
  // Reopening the same source location is a new navigation, not a tab switch:
  // its location request must beat the stale bottom-of-file scroll snapshot.
  const scroller=preview.locator(".cm-scroller");
  await scroller.evaluate(element=>{element.scrollTop=element.scrollHeight;});
  await expect.poll(async()=>scroller.evaluate(element=>element.scrollTop))
    .toBeGreaterThan(0);
  const bottomScroll=await scroller.evaluate(element=>element.scrollTop);
  await preview.locator(".cm-editor:visible").evaluate(element=>{
    (window as unknown as {__editorBeforeRepeatedLocation?:Element})
      .__editorBeforeRepeatedLocation=element;
  });
  await attachment.click();
  await expect.poll(async()=>(await inspect()).read).toBe(2);
  expect(await preview.locator(".cm-editor:visible").evaluate(element=>
    element===(window as unknown as {__editorBeforeRepeatedLocation?:Element})
      .__editorBeforeRepeatedLocation
  )).toBe(true);
  await expect.poll(async()=>scroller.evaluate(element=>element.scrollTop))
    .toBeLessThan(bottomScroll);
  await preview.locator(".cm-content:visible").focus();
  await expect.poll(async()=>preview.locator(".cm-content:visible").evaluate(content=>{
    const selection=content.ownerDocument.getSelection();
    const anchor=selection?.anchorNode;
    const line=anchor instanceof Element?anchor.closest(".cm-line"):
      anchor?.parentElement?.closest(".cm-line");
    return {line:line?.textContent?.trim()??null,
      offset:selection?.anchorOffset??null};
  })).toEqual({line:"source line 14",offset:0});
  const immutableBefore=await preview.locator("[data-workspace-file-text]").textContent();
  await preview.locator(".cm-content:visible").focus();
  await page.keyboard.type("NO_WRITE_PERMITTED");
  await expect(preview.locator("[data-workspace-file-text]"))
    .not.toContainText("NO_WRITE_PERMITTED");
  expect(await preview.locator("[data-workspace-file-text]").textContent())
    .toBe(immutableBefore);
  await expect(preview).toContainText("Lines 14-28");
  await expect.poll(async()=>(await inspect()).read).toBe(2);

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
  expect((await inspect()).read).toBe(2);
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
          text:isApp?["app original",...Array.from({length:79},(_,i)=>`app line ${i+2}`)].join("\n")
            :"index original\\nindex second",
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
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("app line 14");
  // Original IX keeps a tab's contentInstance alive. The independent fallback
  // now retains the same CodeMirror DOM/state while another file is selected.
  await preview.locator(".cm-editor:visible").evaluate(element=>{
    (window as unknown as {__persistedAppEditor?:Element}).__persistedAppEditor=element;
  });
  const appScroller=preview.locator(".cm-scroller:visible");
  await appScroller.evaluate(element=>{element.scrollTop=element.scrollHeight;});
  await expect.poll(async()=>appScroller.evaluate(element=>element.scrollTop))
    .toBeGreaterThan(0);
  const appScrollTop=await appScroller.evaluate(element=>element.scrollTop);
  await index.click();
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("index original");
  expect(await page.evaluate(()=>{
    const saved=(window as unknown as {__persistedAppEditor?:Element}).__persistedAppEditor;
    return saved!=null&&saved.isConnected&&
      Array.from(document.querySelectorAll(".cm-editor")).includes(saved);
  })).toBe(true);
  await tabs.getByRole("tab",{name:"App.tsx"}).click();
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("app line 80");
  await expect.poll(async()=>appScroller.evaluate(element=>element.scrollTop))
    .toBe(appScrollTop);
  expect(await preview.locator(".cm-editor:visible").evaluate(element=>
    element===(window as unknown as {__persistedAppEditor?:Element}).__persistedAppEditor
  )).toBe(true);
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

test("mounted source path tree selects real consented CodeMirror tabs, filters and collapses without listing filesystem",async({page})=>{
  await page.addInitScript(()=>{
    const state={selections:0,reads:[] as string[],revocations:0};
    Object.assign(window,{__sourceOpenedTreeHostState:state});
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
        state.reads.push(request.path);
        const app=request.path.endsWith("/App.tsx");
        return {name:app?"App.tsx":"index.ts",
          relativePath:app?"src/App.tsx":"src/index.ts",
          text:app?"real app source":"real index source",
          readOnly:true};
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
  await expect(panel.locator("[data-workspace-file-text]")).toContainText("real index source");
  const toggle=panel.getByRole("button",{name:"Toggle open files tree"});
  await expect(toggle).toHaveAttribute("aria-pressed","false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  const tree=panel.getByRole("tree",{name:"Opened local file paths"});
  await expect(tree).toBeVisible();
  const src=tree.getByRole("treeitem",{name:"src",exact:true});
  const appFile=tree.getByRole("treeitem",{name:"App.tsx"});
  const indexFile=tree.getByRole("treeitem",{name:"index.ts"});
  await expect(src).toHaveAttribute("aria-expanded","true");
  await expect(indexFile).toHaveAttribute("aria-selected","true");
  await expect(appFile).toHaveAttribute("aria-selected","false");
  await appFile.click();
  await expect(panel.locator("[data-workspace-file-text]")).toContainText("real app source");
  await expect(appFile).toHaveAttribute("aria-selected","true");
  await src.click();
  await expect(src).toHaveAttribute("aria-expanded","false");
  await expect(tree.getByRole("treeitem")).toHaveCount(1);
  // The original tree-side pane owns expanded paths outside the visibility
  // toggle. Merely hiding it must not reset explicit user collapse.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed","false");
  await expect(tree).not.toBeVisible();
  await toggle.click();
  await expect(src).toHaveAttribute("aria-expanded","false");

  const filter=panel.getByRole("textbox",{name:"Filter open files"});
  await filter.fill("INDEX");
  await expect(src).toHaveAttribute("aria-expanded","true");
  await expect(indexFile).toBeVisible();
  await expect(appFile).toHaveCount(0);
  await filter.press("Escape");
  await expect(filter).toHaveValue("");
  await expect(src).toHaveAttribute("aria-expanded","false");
  await src.click();
  await appFile.focus();
  await page.keyboard.press("ArrowDown");
  await expect(indexFile).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(panel.locator("[data-workspace-file-text]")).toContainText("real index source");
  await expect(indexFile).toHaveAttribute("aria-selected","true");

  // This must not request a directory listing, perform another read or
  // change the explicit OS chooser authority for the current thread.
  const host=await page.evaluate(()=>
    (window as unknown as Window & {
      __sourceOpenedTreeHostState:{
        reads:string[];selections:number;
      };
    }).__sourceOpenedTreeHostState);
  expect(host.reads).toHaveLength(2);
  expect(host.selections).toBe(1);
  await panel.getByRole("button",{name:"Close App.tsx tab"}).click();
  await expect(tree.getByRole("treeitem",{name:"App.tsx"})).toHaveCount(0);
  const navigation=page.getByRole("navigation",{name:"会话"});
  await navigation.getByRole("button").nth(1).click();
  await expect(panel).toHaveCount(0);
});

test("native granted workspace directory tree opens new CodeMirror tab without root disclosure or extra picker",async({page})=>{
  await page.addInitScript(()=>{
    const state={grant:0,lists:[] as string[],treeReads:[] as string[],
      searches:[] as string[],absoluteReads:0,revokes:0,
      resolveSlow:null as (()=>void)|null,resolveFast:null as (()=>void)|null};
    Object.assign(window,{__nativeTreeBridgeTest:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.grant++;return {selected:true,name:"consented-project"};
      },
      revokeWorkspaceDirectory:async()=>{state.revokes++;return true;},
      readWorkspaceTextFile:async(request:{path:string})=>{
        state.absoluteReads++;
        return {name:"App.tsx",relativePath:"src/App.tsx",
          text:"opened source App",readOnly:true};
      },
      listWorkspaceDirectory:async({relativePath}:{relativePath:string})=>{
        state.lists.push(relativePath);
        if(relativePath==="")return {relativePath,entries:[
          {name:"src",relativePath:"src",kind:"directory"},
          {name:"README.md",relativePath:"README.md",kind:"file"},
        ],truncated:false};
        if(relativePath==="src")return {relativePath,entries:[
          {name:"App.tsx",relativePath:"src/App.tsx",kind:"file"},
          {name:"extra.ts",relativePath:"src/extra.ts",kind:"file"},
          {name:"fast.ts",relativePath:"src/fast.ts",kind:"file"},
          {name:"next.ts",relativePath:"src/next.ts",kind:"file"},
          {name:"slow.ts",relativePath:"src/slow.ts",kind:"file"},
        ],truncated:false};
        throw Error("WORKSPACE_DIRECTORY_UNAVAILABLE");
      },
      searchWorkspaceFiles:async({query}:{query:string})=>{
        state.searches.push(query);
        return {query,files:query.toLowerCase().includes("unopened")?[
          {name:"unopened.ts",relativePath:"src/deep/unopened.ts"},
        ]:[],scannedDirectories:3,truncated:false};
      },
      readWorkspaceTreeTextFile:async({relativePath}:{relativePath:string})=>{
        state.treeReads.push(relativePath);
        if(relativePath==="src/deep/unopened.ts")
          return {name:"unopened.ts",relativePath,
            text:"export const fromNativeSearch = true;",readOnly:true};
        if(relativePath==="src/next.ts")
          return {name:"next.ts",relativePath,
            text:"export const fromNativeNext = true;",readOnly:true};
        if(relativePath==="src/slow.ts")return new Promise(resolve=>{
          state.resolveSlow=()=>resolve({name:"slow.ts",relativePath,
            text:"export const staleSlowPreview = true;",readOnly:true});
        });
        if(relativePath==="src/fast.ts")return new Promise(resolve=>{
          state.resolveFast=()=>resolve({name:"fast.ts",relativePath,
            text:"export const latestFastPreview = true;",readOnly:true});
        });
        if(relativePath==="README.md")
          return {name:"README.md",relativePath,text:"# README preview",readOnly:true};
        if(relativePath!=="src/extra.ts")throw Error("WORKSPACE_FILE_UNAVAILABLE");
        return {name:"extra.ts",relativePath,text:"export const fromNativeTree = true;",
          readOnly:true};
      },
    }});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  await row.getByRole("button",{name:/App\.tsx/}).click();
  const panel=page.getByRole("complementary",{name:"Local file preview"});
  await panel.getByRole("button",{name:"Toggle open files tree"}).click();
  const tree=panel.getByRole("tree",{name:"Granted workspace directories"});
  await expect(tree).toBeVisible();
  const src=tree.getByRole("treeitem",{name:"src",exact:true});
  await expect(src).toBeVisible();
  await src.click();
  const appTree=tree.getByRole("treeitem",{name:"App.tsx"});
  await appTree.click();
  await page.waitForTimeout(300);
  const appReuse=await page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{treeReads:string[];absoluteReads:number};
    }).__nativeTreeBridgeTest);
  expect(appReuse.absoluteReads).toBe(1);
  expect(appReuse.treeReads).toEqual([]);
  await expect(panel.getByRole("tab",{name:"App.tsx"}))
    .toHaveAttribute("data-source-file-tab-preview","false");
  const extra=tree.getByRole("treeitem",{name:"extra.ts"});
  await expect(extra).toBeVisible();
  await extra.click();
  await expect(panel.locator("[data-workspace-file-text]"))
    .toContainText("fromNativeTree = true");
  const extraTab=panel.getByRole("tab",{name:"extra.ts"});
  await expect(extraTab).toHaveAttribute("aria-selected","true");
  await expect(extraTab).toHaveAttribute("data-source-file-tab-preview","true");
  await expect(extra).toHaveAttribute("aria-selected","true");
  await expect(panel.locator(".cm-content:visible"))
    .toHaveAttribute("contenteditable","false");
  // Re-selecting an already open preview selects its existing tab, not a new read.
  await extra.click();
  await page.waitForTimeout(300);
  const afterReselect=await page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{treeReads:string[]};
    }).__nativeTreeBridgeTest.treeReads);
  expect(afterReselect).toEqual(["src/extra.ts"]);
  // Original Un / Ve separates tree expansion and host filename search:
  // find a file which the directory tree has NEVER expanded to.
  const filter=panel.getByRole("searchbox",{name:"Filter workspace files"});
  await filter.fill("unopened");
  const searchResult=tree.getByRole("treeitem",{name:"src/deep/unopened.ts"});
  await expect(searchResult).toBeVisible();
  await searchResult.click();
  await expect(panel.locator("[data-workspace-file-text]"))
    .toContainText("fromNativeSearch = true");
  const unopenedTab=panel.getByRole("tab",{name:"unopened.ts"});
  await expect(unopenedTab).toHaveAttribute("aria-selected","true");
  await expect(unopenedTab).toHaveAttribute("data-source-file-tab-preview","true");
  await expect(panel.getByRole("tab",{name:"extra.ts"})).toHaveCount(0);
  await expect(searchResult).toHaveAttribute("aria-selected","true");
  await filter.fill("not-present");
  await expect(tree).toContainText("No matching files");
  await filter.fill("");
  await expect(extra).toBeVisible();
  // Double-click opens a kept tab, so it does not evict the current preview.
  await extra.dblclick();
  await expect(panel.locator("[data-workspace-file-text]"))
    .toContainText("fromNativeTree = true");
  const keptExtra=panel.getByRole("tab",{name:"extra.ts"});
  await expect(keptExtra).toHaveAttribute("data-source-file-tab-preview","false");
  await expect(unopenedTab).toBeVisible();
  // A subsequent single-click preview replaces the old preview but leaves
  // the kept tab and original attachment tab untouched.
  const next=tree.getByRole("treeitem",{name:"next.ts"});
  await next.click();
  await expect(panel.locator("[data-workspace-file-text]"))
    .toContainText("fromNativeNext = true");
  const nextTab=panel.getByRole("tab",{name:"next.ts"});
  await expect(nextTab).toHaveAttribute("data-source-file-tab-preview","true");
  await expect(panel.getByRole("tab",{name:"unopened.ts"})).toHaveCount(0);
  await expect(panel.getByRole("tab")).toHaveText(["App.tsx","extra.ts","next.ts"]);
  // The accessible Eqi-style menu exposes the local keep-tab action.
  await nextTab.click({button:"right"});
  const tabMenu=page.getByRole("menu",{name:"Local file tab actions"});
  await tabMenu.getByRole("menuitem",{name:"Keep tab"}).click();
  await expect(nextTab).toHaveAttribute("data-source-file-tab-preview","false");
  // Single-click opens a preview; double-clicking the tab itself keeps it.
  await tree.getByRole("treeitem",{name:"README.md"}).click();
  await expect(panel.locator("[data-workspace-file-text]")).toContainText("README");
  const readmeTab=panel.getByRole("tab",{name:"README.md"});
  await expect(readmeTab).toHaveAttribute("data-source-file-tab-preview","true");
  await readmeTab.dblclick();
  await expect(readmeTab).toHaveAttribute("data-source-file-tab-preview","false");
  // An earlier unresolved preview cannot replace a later tree selection.
  await tree.getByRole("treeitem",{name:"slow.ts"}).click();
  await expect.poll(async()=>page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{treeReads:string[]};
    }).__nativeTreeBridgeTest.treeReads.includes("src/slow.ts"))).toBe(true);
  await tree.getByRole("treeitem",{name:"fast.ts"}).click();
  await expect.poll(async()=>page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{treeReads:string[]};
    }).__nativeTreeBridgeTest.treeReads.includes("src/fast.ts"))).toBe(true);
  await page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{resolveFast:(()=>void)|null};
    }).__nativeTreeBridgeTest.resolveFast?.());
  await expect(panel.locator("[data-workspace-file-text]"))
    .toContainText("latestFastPreview = true");
  await page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{resolveSlow:(()=>void)|null};
    }).__nativeTreeBridgeTest.resolveSlow?.());
  await expect(panel.getByRole("tab",{name:"fast.ts"}))
    .toHaveAttribute("data-source-file-tab-preview","true");
  await expect(panel.getByRole("tab",{name:"slow.ts"})).toHaveCount(0);
  const state=await page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{
        grant:number;lists:string[];treeReads:string[];absoluteReads:number;
        searches:string[];
      };
    }).__nativeTreeBridgeTest);
  expect(state.grant).toBe(1);
  expect(state.searches).toEqual(["unopened","not-present"]);
  expect(state.absoluteReads).toBe(1);
  expect(state.treeReads).toEqual([
    "src/extra.ts","src/deep/unopened.ts","src/extra.ts","src/next.ts","README.md",
    "src/slow.ts","src/fast.ts",
  ]);
  expect(state.lists).toEqual(["","src"]);
  // Original an refreshKey invalidates root AND current expanded branches;
  // the independent native fallback must not refresh only the root.
  await panel.getByRole("button",{name:"Refresh workspace directory"}).click();
  await expect.poll(async()=>page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{lists:string[]};
    }).__nativeTreeBridgeTest.lists.length)).toBe(4);
  const refreshed=await page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{lists:string[]};
    }).__nativeTreeBridgeTest.lists);
  expect(refreshed).toEqual(["","src","","src"]);
  const nav=page.getByRole("navigation",{name:"会话"});
  await nav.getByRole("button").nth(1).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(async()=>page.evaluate(()=>
    (window as unknown as Window & {
      __nativeTreeBridgeTest:{revokes:number};
    }).__nativeTreeBridgeTest.revokes)).toBeGreaterThanOrEqual(1);
});


test("source patch file links enter the mounted read-only preview at the first changed line",async({page})=>{
  await page.addInitScript(()=>{
    const state={selects:0,reads:[] as Array<{path:string;line?:number;endLine?:number}>};
    Object.assign(window,{__toolActivityWorkspaceState:state});
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
        return {name:"ToolActivityHistorySource.ts",
          relativePath:"src/conversation/ToolActivityHistorySource.ts",
          text:Array.from({length:80},(_,i)=>"source line "+(i+1)).join("\n"),
          line:request.line,endLine:request.endLine,readOnly:true};
      },
    }});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  const navigation=page.getByRole("navigation",{name:"会话"});
  await navigation.getByRole("button").nth(1).click();
  await expect(page.getByRole("heading",{name:"工具调用与审批交互"})).toBeVisible();
  // The transcript virtualizer only mounts rows around its current viewport.
  // Its own navigation API scrolls to the start; the patch row follows nearby.
  await page.getByRole("button",{name:"跳到开头"}).click();
  const patch=page.locator('[data-demo-turn-id="review-patch"]');
  await expect(patch).toBeAttached();
  // Tool activity is collapsed by default in the transcript; expand this
  // exact row before expecting its source-shaped patch leaf and path button.
  await patch.getByRole("button",{name:/1 项工具活动/}).click();
  // The recovered activity group reveals a separate leaf disclosure before
  // its per-file path controls, matching the source's two-level interaction.
  await patch.getByRole("button",{name:"编辑了文件 · 模拟"}).click();
  const fileLink=patch.getByRole("button",{name:"ToolActivityHistorySource.ts"}).first();
  await expect(fileLink).toBeVisible();
  await fileLink.click();

  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await expect(preview).toBeVisible();
  await expect(preview.locator("[data-workspace-file-text]"))
    .toContainText("source line 2");
  await expect(preview.getByText("source line 2",{exact:true}))
    .toHaveAttribute("data-workspace-file-selected-range","true");
  await preview.locator(".cm-content:visible").focus();
  await expect.poll(async()=>preview.locator(".cm-content:visible").evaluate(content=>{
    const selection=content.ownerDocument.getSelection();
    const anchor=selection?.anchorNode;
    const line=anchor instanceof Element?anchor.closest(".cm-line"):
      anchor?.parentElement?.closest(".cm-line");
    return {line:line?.textContent?.trim()??null,offset:selection?.anchorOffset??null};
  })).toEqual({line:"source line 2",offset:0});
  const state=await page.evaluate(()=>
    (window as unknown as Window & {
      __toolActivityWorkspaceState:{selects:number;reads:Array<{path:string;line?:number;endLine?:number}>};
    }).__toolActivityWorkspaceState);
  expect(state.selects).toBe(1);
  expect(state.reads).toEqual([{
    path:"/projects/agent-web/src/conversation/ToolActivityHistorySource.ts",
    line:2,
  }]);
});
