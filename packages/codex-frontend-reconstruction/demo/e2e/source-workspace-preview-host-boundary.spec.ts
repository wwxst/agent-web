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
