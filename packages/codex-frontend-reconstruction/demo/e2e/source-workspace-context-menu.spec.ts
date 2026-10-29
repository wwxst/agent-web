import {test,expect} from "@playwright/test";

test("real mounted user file attachment opens source-gated menu; clipboard and consented read work",async({page})=>{
  await page.addInitScript(()=>{
    const state={clipboard:[] as string[],selectCalls:0,readCalls:0,revokeCalls:0};
    Object.assign(window,{__workspaceMenuTest:state});
    Object.defineProperty(navigator,"clipboard",{
      configurable:true,value:{writeText:async(value:string)=>{
        state.clipboard.push(value);
      }},
    });
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      subscribeUiCommands:()=>()=>{},
      subscribeHostEvents:()=>()=>{},
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      openMenu:async()=>false,
      selectWorkspaceDirectory:async()=>{
        state.selectCalls++;
        return {selected:true,name:"fixture-root"};
      },
      revokeWorkspaceDirectory:async()=>{state.revokeCalls++;return true;},
      // Test-host substitutes are explicitly local to this browser test;
      // production uses Electron's native clipboard APIs.
      copyWorkspaceFilePath:async(path:string)=>{
        state.clipboard.push(path);return true;
      },
      copyWorkspaceFileContents:async(request:{path:string})=>{
        state.readCalls++;
        if(request.path!=="/projects/agent-web/src/App.tsx")
          throw Error("WORKSPACE_OUTSIDE_GRANT");
        state.clipboard.push("// fixture content\nexport const real = true;");
        return true;
      },
      readWorkspaceTextFile:async(request:{path:string})=>{
        state.readCalls++;
        if(request.path!=="/projects/agent-web/src/App.tsx")
          throw Error("WORKSPACE_OUTSIDE_GRANT");
        return {name:"App.tsx",relativePath:"src/App.tsx",
          text:"// fixture content\nexport const real = true;",readOnly:true};
      },
    }});
  });
  const read=()=>page.evaluate(()=>{
    const state=(window as unknown as Window & {__workspaceMenuTest:{
      clipboard:string[];selectCalls:number;readCalls:number;
    }}).__workspaceMenuTest;
    return {...state};
  });
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const user=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const pill=user.getByRole("button",{name:/App\.tsx/});
  await expect(pill).toBeEnabled();
  await pill.click({button:"right"});
  const menu=page.getByRole("menu",{name:"Workspace file actions"});
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText(["Copy path","Copy file contents"]);
  await expect(menu.getByText("Open in Explorer")).toHaveCount(0);
  await expect(menu.getByText("Save as")).toHaveCount(0);
  await menu.getByRole("menuitem",{name:"Copy path"}).click();
  await expect(menu).toHaveCount(0);
  await expect.poll(async()=>(await read()).clipboard).toEqual([
    "/projects/agent-web/src/App.tsx",
  ]);
  expect((await read()).readCalls).toBe(0);
  expect((await read()).selectCalls).toBe(0); // copying a path never grants file access
  await pill.click({button:"right"});
  await menu.getByRole("menuitem",{name:"Copy file contents"}).click();
  await expect.poll(async()=>(await read()).clipboard).toEqual([
    "/projects/agent-web/src/App.tsx",
    "// fixture content\nexport const real = true;",
  ]);
  expect((await read()).selectCalls).toBe(1);
  expect((await read()).readCalls).toBe(1);
  await expect(page.getByRole("complementary",{name:"Local file preview"})).toHaveCount(0);
  await pill.click({button:"right"});
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await pill.click({button:"right"});
  await page.getByRole("navigation",{name:"会话"}).getByRole("button").nth(1).click();
  await expect(menu).toHaveCount(0);
});
