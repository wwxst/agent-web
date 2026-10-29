import test from "node:test";
import assert from "node:assert/strict";
import {projectSourceUserFileQeRoute} from "../build/SourceUserFileQeRouteModel.js";

test("original hn Qe path uses fsPath, cwd, hostId, startLine and column; Et alone carries endLine",()=>{
  const attachment={
    path:"src/App.tsx",fsPath:"/agent/src/App.tsx",
    startLine:14,endLine:28,label:"App.tsx (14-28)",
  };
  const route=projectSourceUserFileQeRoute(attachment,{
    cwd:"/agent",hostId:"native-local",featuredViewerEnabled:false,
  });
  assert.deepEqual(route,{
    kind:"workspace",
    qe:{path:"/agent/src/App.tsx",line:14,column:1,
      cwd:"/agent",hostId:"native-local",
      isAttachmentPreview:false,openInSidePanel:false},
    contextMenu:{path:"/agent/src/App.tsx",line:14,endLine:28,
      cwd:"/agent",hostId:"native-local",
      isAttachmentPreview:false,openInSidePanel:false},
  });
  assert.ok(!Object.hasOwn(route.qe,"endLine"));
});

test("source viewer flags are explicit host predicates; never classify private ze/ut/Ge by filename",()=>{
  const file={path:"/agent/slides/deck.pptx"};
  const noHost=projectSourceUserFileQeRoute(file,{
    featuredViewerEnabled:true,
  });
  assert.equal(noHost.kind,"workspace");
  assert.equal(noHost.qe.isAttachmentPreview,false);
  assert.equal(noHost.qe.openInSidePanel,false);

  const viewer=projectSourceUserFileQeRoute(file,{
    featuredViewerEnabled:true,
  },{previewKind:()=> "pptx"});
  assert.equal(viewer.qe.isAttachmentPreview,true);
  assert.equal(viewer.qe.openInSidePanel,true);
  assert.equal(viewer.qe.attachmentPreviewOrigin,"sent-message");

  const noFeatured=projectSourceUserFileQeRoute(file,{},{
    previewKind:()=> "pptx",
  });
  assert.equal(noFeatured.qe.isAttachmentPreview,false);
  assert.equal(noFeatured.qe.openInSidePanel,true);
  assert.ok(!Object.hasOwn(noFeatured.qe,"attachmentPreviewOrigin"));

  const sourceUt=projectSourceUserFileQeRoute({path:"src/file.ts",startLine:2},{},{
    isSidePanelPath:()=>true,
  });
  assert.equal(sourceUt.qe.openInSidePanel,true);
  assert.equal(sourceUt.qe.isAttachmentPreview,false);

  const sourceGe=projectSourceUserFileQeRoute({path:"src/file.ts"},{},{
    isSidePanelPathWithoutLine:()=>true,
  });
  assert.equal(sourceGe.qe.openInSidePanel,true);
  const withLine=projectSourceUserFileQeRoute({path:"src/file.ts",startLine:2},{},{
    isSidePanelPathWithoutLine:()=>true,
  });
  assert.equal(withLine.qe.openInSidePanel,false);
});

test("original private manager selection takes precedence; pasted text routes to side panel unless manager",()=>{
  const attachment={path:"/agent/file.ts",isPastedText:true,endLine:4};
  const pasted=projectSourceUserFileQeRoute(attachment);
  assert.equal(pasted.qe.openInSidePanel,true);
  const manager=projectSourceUserFileQeRoute(attachment,{
    featuredViewerEnabled:true,
  },{
    isFileManagerAttachment:()=>true,
    previewKind:()=> "pptx",
    isSidePanelPath:()=>true,
  });
  assert.equal(manager.qe.target,"fileManager");
  assert.equal(manager.qe.isAttachmentPreview,false);
  assert.equal(manager.qe.openInSidePanel,false);
  assert.equal(manager.contextMenu.endLine,4);
  assert.equal(manager.qe.column,undefined);
});

test("upload/shared-thread are not Qe native file paths; shared resources require an actual path",()=>{
  assert.deepEqual(projectSourceUserFileQeRoute({
    upload:{fileName:"reference.pdf"},
  }),{kind:"upload",fileName:"reference.pdf"});
  assert.deepEqual(projectSourceUserFileQeRoute({
    sharedThread:{shareId:"some-id"},path:"/source/file.md",
  }),{kind:"shared-thread",shareId:"some-id"});
  assert.deepEqual(projectSourceUserFileQeRoute({
    sharedThread:{shareId:"some-id"},
  }),{kind:"none"});
  assert.deepEqual(projectSourceUserFileQeRoute({label:"detached"}),
    {kind:"none"});
});
