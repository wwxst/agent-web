import {test,expect} from "@playwright/test";
import type {
  SourceComposerControlsSnapshot,
  SourceComposerModelChangeRequest,
  SourceComposerPermissionChangeRequest,
} from "../../src/conversation/SourceComposerControlsModel.js";

type ComposerHostCall =
  |{kind:"model";conversationId:string;modelId:string;reasoningEffortId?:string}
  |{kind:"permission";conversationId:string;permissionModeId:string;userConfirmed:boolean};

test("Composer model and reasoning choices come from the host and apply only after acknowledgement",async({page})=>{
  await page.addInitScript(()=>{
    const makeBaseHost=()=>({
      subscribeUiCommands:(_listener:(command:string)=>void)=>()=>{},
      openMenu:async(_id:string,_anchor:{x:number;y:number})=>false,
      selectWorkspaceDirectory:async()=>({selected:false}),
      revokeWorkspaceDirectory:async()=>false,
      copyWorkspaceFilePath:async(_path:string)=>false,
      copyWorkspaceFileContents:async(_request:{path:string;line?:number;endLine?:number})=>false,
      readWorkspaceTextFile:async(_request:{path:string;line?:number;endLine?:number})=>{
        throw new Error("Workspace preview is not available in this Composer test.");
      },
      openExternalUrl:async(_url:string)=>false,
      cancelUserVerification:async(_envelope:unknown)=>{
        throw new Error("User verification backend unavailable.");
      },
      replyToUnsupportedForm:async(_envelope:unknown)=>{
        throw new Error("Unsupported form backend unavailable.");
      },
      replyToTextForm:async(_envelope:unknown)=>{
        throw new Error("Text form backend unavailable.");
      },
      replyToMcpApproval:async(_envelope:unknown)=>{
        throw new Error("MCP approval backend unavailable.");
      },
      getHostInfo:async()=>({windowType:"electron" as const,platform:"test",theme:"light",backendConnected:false as const}),
      getComposerDrafts:async()=>({}),
      setComposerDraft:async(_threadId:"frontend"|"review",_text:string)=>true,
      subscribeHostEvents:(_listener:(event:unknown)=>void)=>()=>{},
    });
    let current:SourceComposerControlsSnapshot={
      schemaVersion:1,
      conversationId:"frontend",
      model:{
        selected:{id:"model-a",label:"Model A",reasoningEffortId:"high",reasoningEffortLabel:"High"},
        options:[
          {id:"model-a",label:"Model A",defaultReasoningEffortId:"high",
            reasoningEfforts:[{id:"medium",label:"Medium"},{id:"high",label:"High"}]},
          {id:"model-b",label:"Model B",defaultReasoningEffortId:"medium",
            reasoningEfforts:[{id:"medium",label:"Medium"},{id:"high",label:"High"}]},
        ],
      },
      permissions:{
        selected:{id:"approval",kind:"agent-mode",label:"Ask for approval"},
        options:[
          {id:"approval",kind:"agent-mode",label:"Ask for approval",
            description:"Ask before actions outside the workspace."},
          {id:"full",kind:"agent-mode",label:"Full access",requiresConfirmation:true,
            confirmation:{
              title:"Confirm full access",
              body:"Allow this host to perform actions without asking for each one?",
              riskDescription:"Only continue if you trust this workspace.",
              capabilities:["Read and write workspace files","Run commands"],
              confirmLabel:"Enable full access",cancelLabel:"Cancel",
            }},
        ],
      },
    };
    const calls:ComposerHostCall[]=[];
    const host={...makeBaseHost(),
      subscribeHostEvents:()=>()=>{},
      getHostInfo:async()=>({windowType:"electron",platform:"test",theme:"light",backendConnected:true}),
      getComposerDrafts:async()=>({}),
      setComposerDraft:async()=>true,
      getComposerControls:async (request:{conversationId:string})=>({...current,conversationId:request.conversationId}),
      setComposerModelAndReasoningEffort:async (request:SourceComposerModelChangeRequest)=>{
        calls.push({kind:"model",...request});
        const model=current.model.options.find(item=>item.id===request.modelId);
        if(model==null)throw new Error("Requested model is not in the host snapshot.");
        const effort=request.reasoningEffortId==null?undefined:
          model.reasoningEfforts.find(item=>item.id===request.reasoningEffortId);
        if(request.reasoningEffortId!=null&&effort==null)
          throw new Error("Requested reasoning effort is not in the host snapshot.");
        current={...current,conversationId:request.conversationId,model:{
          ...current.model,
          selected:{id:model.id,label:model.label,reasoningEffortId:effort?.id,
            reasoningEffortLabel:effort?.label},
        }};
        return {ok:true,snapshot:current};
      },
      setComposerPermissionMode:async (request:SourceComposerPermissionChangeRequest)=>{
        calls.push({kind:"permission",...request});
        if(request.permissionModeId==="full"&&!request.userConfirmed)
          return {ok:false,errorMessage:"Confirmation required"};
        const option=current.permissions.options.find(item=>item.id===request.permissionModeId);
        if(option==null)throw new Error("Requested permission mode is not in the host snapshot.");
        current={...current,conversationId:request.conversationId,permissions:{
          ...current.permissions,
          selected:{id:option.id,kind:option.kind,label:option.label},
        }};
        return {ok:true,snapshot:current};
      },
    };
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:host});
    Object.defineProperty(window,"__composerCalls",{configurable:true,get:()=>calls});
  });

  await page.goto("/");
  const model=page.getByTestId("composer-model-control");
  await expect(model).toBeEnabled();
  await expect(model).toContainText("Model A");
  await expect(model).toContainText("High");

  await model.click();
  await page.getByRole("menuitemradio",{name:/Model B/}).click();
  await expect(model).toContainText("Model B");
  await expect(model).toContainText("Medium");

  await model.click();
  await page.getByRole("menuitemradio",{name:"High"}).click();
  await expect(model).toContainText("High");

  const permission=page.getByTestId("composer-permission-control");
  await expect(permission).toContainText("Ask for approval");
  await permission.click();
  await page.getByRole("menuitemradio",{name:/Full access/}).click();
  const dialog=page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Read and write workspace files");
  await expect(permission).toContainText("Ask for approval");
  await dialog.getByRole("button",{name:"Enable full access"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(permission).toContainText("Full access");

  const calls=await page.evaluate(()=>
    (window as Window & {__composerCalls?:unknown}).__composerCalls);
  expect(calls).toEqual([
    {kind:"model",conversationId:"frontend",modelId:"model-b",reasoningEffortId:"medium"},
    {kind:"model",conversationId:"frontend",modelId:"model-b",reasoningEffortId:"high"},
    {kind:"permission",conversationId:"frontend",permissionModeId:"full",userConfirmed:true},
  ]);
});

test("host-rejected permission changes leave the previously selected mode unchanged",async({page})=>{
  await page.addInitScript(()=>{
    const makeBaseHost=()=>({
      subscribeUiCommands:(_listener:(command:string)=>void)=>()=>{},
      openMenu:async(_id:string,_anchor:{x:number;y:number})=>false,
      selectWorkspaceDirectory:async()=>({selected:false}),
      revokeWorkspaceDirectory:async()=>false,
      copyWorkspaceFilePath:async(_path:string)=>false,
      copyWorkspaceFileContents:async(_request:{path:string;line?:number;endLine?:number})=>false,
      readWorkspaceTextFile:async(_request:{path:string;line?:number;endLine?:number})=>{
        throw new Error("Workspace preview is not available in this Composer test.");
      },
      openExternalUrl:async(_url:string)=>false,
      cancelUserVerification:async(_envelope:unknown)=>{
        throw new Error("User verification backend unavailable.");
      },
      replyToUnsupportedForm:async(_envelope:unknown)=>{
        throw new Error("Unsupported form backend unavailable.");
      },
      replyToTextForm:async(_envelope:unknown)=>{
        throw new Error("Text form backend unavailable.");
      },
      replyToMcpApproval:async(_envelope:unknown)=>{
        throw new Error("MCP approval backend unavailable.");
      },
      getHostInfo:async()=>({windowType:"electron" as const,platform:"test",theme:"light",backendConnected:false as const}),
      getComposerDrafts:async()=>({}),
      setComposerDraft:async(_threadId:"frontend"|"review",_text:string)=>true,
      subscribeHostEvents:(_listener:(event:unknown)=>void)=>()=>{},
    });
    const snapshot={
      schemaVersion:1,conversationId:"frontend",
      model:{selected:{id:"m",label:"Model"},options:[
        {id:"m",label:"Model",reasoningEfforts:[]},
      ]},
      permissions:{selected:{id:"approval",kind:"agent-mode",label:"Ask for approval"},
        options:[
          {id:"approval",kind:"agent-mode",label:"Ask for approval"},
          {id:"restricted",kind:"agent-mode",label:"Restricted"},
        ]},
    };
    const host={...makeBaseHost(),
      subscribeHostEvents:()=>()=>{},
      getHostInfo:async()=>({windowType:"electron",platform:"test",theme:"light",backendConnected:true}),
      getComposerDrafts:async()=>({}),setComposerDraft:async()=>true,
      getComposerControls:async (request:{conversationId:string})=>({...snapshot,conversationId:request.conversationId}),
      setComposerPermissionMode:async()=>({ok:false,errorMessage:"Policy rejected the change."}),
    };
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:host});
  });
  await page.goto("/");
  const permission=page.getByTestId("composer-permission-control");
  await expect(permission).toBeEnabled();
  await permission.click();
  await page.getByRole("menuitemradio",{name:"Restricted"}).click();
  await expect(permission).toContainText("Ask for approval");
  const rejection=page.getByRole("status").filter({hasText:"Policy rejected the change."});
  await expect(rejection).toHaveCount(1);
  await expect(rejection).toBeVisible();
});

test("missing host controls render disabled source-positioned placeholders rather than fake defaults",async({page})=>{
  await page.goto("/");
  const model=page.getByTestId("composer-model-control");
  const permission=page.getByTestId("composer-permission-control");
  await expect(model).toBeDisabled();
  await expect(model).toContainText("模型未连接");
  await expect(permission).toBeDisabled();
  await expect(permission).toContainText("权限未连接");
  await expect(page.getByText("Demo Agent")).toHaveCount(0);
  await expect(page.getByText(/Full access.*mock/)).toHaveCount(0);
});

test("late model snapshots from a previous conversation cannot overwrite the active thread controls",async({page})=>{
  await page.addInitScript(()=>{
    const makeBaseHost=()=>({
      subscribeUiCommands:(_listener:(command:string)=>void)=>()=>{},
      openMenu:async(_id:string,_anchor:{x:number;y:number})=>false,
      selectWorkspaceDirectory:async()=>({selected:false}),
      revokeWorkspaceDirectory:async()=>false,
      copyWorkspaceFilePath:async(_path:string)=>false,
      copyWorkspaceFileContents:async(_request:{path:string;line?:number;endLine?:number})=>false,
      readWorkspaceTextFile:async(_request:{path:string;line?:number;endLine?:number})=>{
        throw new Error("Workspace preview is not available in this Composer test.");
      },
      openExternalUrl:async(_url:string)=>false,
      cancelUserVerification:async(_envelope:unknown)=>{
        throw new Error("User verification backend unavailable.");
      },
      replyToUnsupportedForm:async(_envelope:unknown)=>{
        throw new Error("Unsupported form backend unavailable.");
      },
      replyToTextForm:async(_envelope:unknown)=>{
        throw new Error("Text form backend unavailable.");
      },
      replyToMcpApproval:async(_envelope:unknown)=>{
        throw new Error("MCP approval backend unavailable.");
      },
      getHostInfo:async()=>({windowType:"electron" as const,platform:"test",theme:"light",backendConnected:false as const}),
      getComposerDrafts:async()=>({}),
      setComposerDraft:async(_threadId:"frontend"|"review",_text:string)=>true,
      subscribeHostEvents:(_listener:(event:unknown)=>void)=>()=>{},
    });
    const makeSnapshot=(conversationId:string,label:string):SourceComposerControlsSnapshot=>({
      schemaVersion:1,conversationId,
      model:{selected:{id:label,label,reasoningEffortId:"high",reasoningEffortLabel:"High"},
        options:[{id:label,label,defaultReasoningEffortId:"high",
          reasoningEfforts:[{id:"high",label:"High"}]}]},
      permissions:{selected:{id:"approval",kind:"agent-mode",label:"Ask for approval"},
        options:[{id:"approval",kind:"agent-mode",label:"Ask for approval"}]},
    });
    const host={...makeBaseHost(),
      subscribeHostEvents:()=>()=>{},
      getHostInfo:async()=>({windowType:"electron",platform:"test",theme:"light",backendConnected:true}),
      getComposerDrafts:async()=>({}),setComposerDraft:async()=>true,
      getComposerControls:(request:{conversationId:string})=>{
        if(request.conversationId==="frontend"){
          return new Promise(resolve=>{
            (window as Window & {__resolveOldControls?:(value:unknown)=>void})
              .__resolveOldControls=resolve;
          });
        }
        return Promise.resolve(makeSnapshot(request.conversationId,"Review model"));
      },
    };
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:host});
  });
  await page.goto("/");
  await page.waitForFunction(()=>
    typeof (window as Window & {__resolveOldControls?:unknown}).__resolveOldControls==="function");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const model=page.getByTestId("composer-model-control");
  await expect(model).toContainText("Review model");
  await page.evaluate(()=>{
    (window as Window & {__resolveOldControls?:(value:unknown)=>void})
      .__resolveOldControls?.({
        schemaVersion:1,conversationId:"frontend",
        model:{selected:{id:"old",label:"Stale frontend model",reasoningEffortId:"high",
          reasoningEffortLabel:"High"},
          options:[{id:"old",label:"Stale frontend model",defaultReasoningEffortId:"high",
            reasoningEfforts:[{id:"high",label:"High"}]}]},
        permissions:{selected:{id:"approval",kind:"agent-mode",label:"Ask for approval"},
          options:[{id:"approval",kind:"agent-mode",label:"Ask for approval"}]},
      });
  });
  await expect(model).toContainText("Review model");
  await expect(model).not.toContainText("Stale frontend model");
});
