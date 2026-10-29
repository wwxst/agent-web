import {test,expect} from "@playwright/test";

test("source language capabilities gate definition/reference menus and open real preview tabs",async({page})=>{
  await page.addInitScript(()=>{
    const state={
      selects:0,
      capabilityRequests:[] as Array<{relativePath:string;languageId:string}>,
      locationRequests:[] as Array<{
        relativePath:string;languageId:string;kind:string;
        position:{line:number;character:number};
      }>,
      reads:[] as Array<{path:string;line?:number;endLine?:number}>,
    };
    Object.assign(window,{__sourceLanguageNavigationState:state});
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
        const isIndex=request.path.endsWith("/index.ts");
        return {
          name:isIndex?"index.ts":"App.tsx",
          relativePath:isIndex?"src/index.ts":"src/App.tsx",
          text:Array.from({length:80},(_,i)=>"source line "+(i+1)).join("\n"),
          line:request.line,endLine:request.endLine,readOnly:true,
        };
      },
      getWorkspaceLanguageCapabilities:async(request:{relativePath:string;languageId:string})=>{
        state.capabilityRequests.push({...request});
        return {
          hover:false,
          locationKinds:["definition","typeDefinition","implementation","references"],
        };
      },
      getWorkspaceLanguageLocations:async(request:{
        relativePath:string;languageId:string;kind:string;
        position:{line:number;character:number};
      })=>{
        state.locationRequests.push({...request,position:{...request.position}});
        const sameKindCalls=state.locationRequests.filter(item=>
          item.relativePath===request.relativePath&&item.kind===request.kind).length;
        if(request.kind==="definition"&&request.relativePath.endsWith("/App.tsx")){
          if(sameKindCalls===1)return [
            {path:"/projects/agent-web/src/index.ts",relativePath:"src/index.ts",
              range:{start:{line:2,character:2},end:{line:2,character:8}}},
            {path:"/projects/agent-web/src/App.tsx",relativePath:"src/App.tsx",
              range:{start:{line:4,character:0},end:{line:4,character:5}}},
          ];
          return [{path:"/projects/agent-web/src/index.ts",relativePath:"src/index.ts",
            range:{start:{line:2,character:2}}}];
        }
        if(request.kind==="references"&&request.relativePath.endsWith("/index.ts"))return [
          {path:"/projects/agent-web/src/App.tsx",relativePath:"src/App.tsx",
            range:{start:{line:6,character:1},end:{line:6,character:5}}},
          {path:"/projects/agent-web/src/index.ts",relativePath:"src/index.ts",
            range:{start:{line:2,character:2}}},
        ];
        return [];
      },
    }});
  });
  const readState=()=>page.evaluate(()=>(
    window as unknown as Window & {__sourceLanguageNavigationState:{
      selects:number;
      capabilityRequests:Array<{relativePath:string;languageId:string}>;
      locationRequests:Array<{
        relativePath:string;languageId:string;kind:string;
        position:{line:number;character:number};
      }>;
      reads:Array<{path:string;line?:number;endLine?:number}>;
    }
  }).__sourceLanguageNavigationState);
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  await row.getByRole("button",{name:/App\.tsx/}).click();

  const panel=page.getByRole("complementary",{name:"Local file preview"});
  const appTab=panel.getByRole("tab",{name:"App.tsx"});
  await expect(appTab).toHaveAttribute("aria-selected","true");
  await expect.poll(async()=>(await readState()).capabilityRequests.some(request=>
    request.relativePath==="src/App.tsx"&&request.languageId==="typescriptreact")).toBe(true);

  await panel.locator(".cm-content:visible .cm-line").nth(2)
    .click({button:"right",position:{x:20,y:8}});
  const menu=panel.getByRole("menu",{name:"Source language navigation"});
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Go to Definition","Go to Type Definition","Go to Implementations","Go to References",
  ]);
  await menu.getByRole("menuitem",{name:"Go to Definition"}).click();

  const definitions=panel.getByRole("dialog",{name:"2 definitions"});
  await expect(definitions).toBeVisible();
  await expect(definitions.getByRole("button",{
    name:"Open src/index.ts, line 3, column 3",
  })).toBeVisible();
  await definitions.getByRole("button",{
    name:"Open src/index.ts, line 3, column 3",
  }).click();

  const indexTab=panel.getByRole("tab",{name:"index.ts"});
  await expect(panel.getByRole("tab")).toHaveCount(2);
  await expect(indexTab).toHaveAttribute("aria-selected","true");
  await expect(panel).toContainText("Line 3");
  await expect(panel.locator(".cm-content:visible [data-workspace-file-selected-range=\"true\"]"))
    .toContainText("source line 3");

  await panel.locator(".cm-content:visible .cm-line").nth(2)
    .click({button:"right",position:{x:20,y:8}});
  const referenceMenu=panel.getByRole("menu",{name:"Source language navigation"});
  await referenceMenu.getByRole("menuitem",{name:"Go to References"}).click();
  const references=panel.getByRole("dialog",{name:"2 references"});
  await expect(references).toBeVisible();
  await references.getByRole("button",{
    name:"Open src/App.tsx, line 7, column 2",
  }).click();
  await expect(appTab).toHaveAttribute("aria-selected","true");
  await expect(panel).toContainText("Line 7");
  await expect(panel.locator(".cm-content:visible [data-workspace-file-selected-range=\"true\"]"))
    .toContainText("source line 7");

  // Original review-file-source-breadcrumb wires Ctrl/Cmd-click to definition.
  // The test host returns one location here so the existing index tab is reused.
  await panel.locator(".cm-content:visible .cm-line").nth(2)
    .click({modifiers:["Control"],position:{x:20,y:8}});
  await expect(indexTab).toHaveAttribute("aria-selected","true");
  await expect(panel).toContainText("Line 3");
  await expect(panel.locator(".cm-content:visible [data-workspace-file-selected-range=\"true\"]"))
    .toContainText("source line 3");

  const state=await readState();
  expect(state.selects).toBe(1);
  expect(state.locationRequests.map(request=>({
    relativePath:request.relativePath,languageId:request.languageId,kind:request.kind,
  }))).toEqual([
    {relativePath:"src/App.tsx",languageId:"typescriptreact",kind:"definition"},
    {relativePath:"src/index.ts",languageId:"typescript",kind:"references"},
    {relativePath:"src/App.tsx",languageId:"typescriptreact",kind:"definition"},
  ]);
  expect(state.reads).toEqual([
    {path:"/projects/agent-web/src/App.tsx",line:14,endLine:28},
    {path:"/projects/agent-web/src/index.ts",line:3},
    {path:"/projects/agent-web/src/App.tsx",line:7},
    {path:"/projects/agent-web/src/index.ts",line:3},
  ]);
});
