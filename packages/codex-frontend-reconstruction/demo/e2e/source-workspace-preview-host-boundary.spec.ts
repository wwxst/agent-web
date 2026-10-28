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
  await expect(preview.locator('[data-workspace-file-selected-range]'))
    .toContainText("source line 14");
  await expect(preview.locator('[data-workspace-file-selected-range]'))
    .toContainText("source line 28");
  await expect(preview.locator('[data-workspace-file-selected-range]'))
    .not.toContainText("source line 29");
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
      selections:0,revocations:0,
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
  const finishRead=async(index:number,text:string)=>{
    await page.evaluate(({index,text})=>{
      const state=(window as unknown as Window & {
        __asyncPreviewTestState:{
          reads:Array<{path:string;resolve:(file:{
            name:string;relativePath:string;text:string;readOnly:true,
          })=>void}>;
        };
      }).__asyncPreviewTestState;
      const pending=state.reads[index];
      if(pending==null)throw new Error("Missing deferred workspace read");
      const isApp=pending.path.endsWith("/App.tsx");
      pending.resolve({
        name:isApp?"App.tsx":"index.ts",
        relativePath:isApp?"src/App.tsx":"src/index.ts",
        text,readOnly:true,
      });
    },{index,text});
  };
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const app=row.getByRole("button",{name:/App\\.tsx/});
  const index=row.getByRole("button",{name:/index\\.ts/});
  const preview=page.getByRole("complementary",{name:"Local file preview"});
  await app.click();
  await expect.poll(readCount).toBe(1);
  // The single folder chooser has finished, so a slower read cannot swallow
  // the next file click even when its Promise has not resolved yet.
  await index.click();
  await expect.poll(readCount).toBe(2);
  await finishRead(1,"newer index body");
  await expect(preview).toBeVisible();
  const tabs=preview.getByRole("tablist",{name:"Open local files"});
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await finishRead(0,"late app body");
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("newer index body");

  // Reopening the same file twice must not let the older IO response replace
  // the content of the newer tab identity.
  await app.click();
  await expect.poll(readCount).toBe(3);
  await app.click();
  await expect.poll(readCount).toBe(4);
  await finishRead(3,"fresh app response");
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveAttribute("aria-selected","true");
  await finishRead(2,"stale app response");
  await expect(preview.locator("[data-workspace-file-text]")).toContainText("fresh app response");
  await expect(preview.locator("[data-workspace-file-text]")).not.toContainText("stale app response");
  await expect(tabs.getByRole("tab")).toHaveCount(2);

  // Closing a tab invalidates its pending request. A late read cannot
  // recreate the just-closed tab or steal focus from the survivor.
  await app.click();
  await expect.poll(readCount).toBe(5);
  await tabs.getByRole("button",{name:"Close App.tsx tab"}).click();
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveCount(0);
  await finishRead(4,"closed tab response");
  await expect(tabs.getByRole("tab",{name:"App.tsx"})).toHaveCount(0);
  await expect(tabs.getByRole("tab",{name:"index.ts"})).toHaveAttribute("aria-selected","true");
  const counters=await page.evaluate(()=>
    (window as unknown as Window & {
      __asyncPreviewTestState:{selections:number};
    }).__asyncPreviewTestState.selections);
  expect(counters).toBe(1,"all reads share one user-selected directory grant");
});
