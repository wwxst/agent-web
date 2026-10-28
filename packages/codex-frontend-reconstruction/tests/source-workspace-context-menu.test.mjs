import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceWorkspaceFileContextMenuItems,
  sourceWorkspaceFileCopyPath,isSourceWorkspaceAbsoluteCopyPath,
} from "../build/SourceWorkspaceFileContextMenuModel.js";
import {projectSourceUserFileQeRoute} from "../build/SourceUserFileQeRouteModel.js";
const local=projectSourceUserFileQeRoute({path:"/workspace/src/App.tsx",startLine:14});
const panel=projectSourceUserFileQeRoute({path:"/workspace/src/App.tsx",startLine:14},{},{
 isSidePanelPath:()=>true,
});
test("source SXo menu is fail-closed until host supplies clipboard or file-view capabilities",()=>{
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(local),[]);
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(
  {kind:"upload",fileName:"a.pdf"},{copyPath:true,copyContents:true}),[]);
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(
  {kind:"shared-thread",shareId:"abc"},{copyPath:true,copyContents:true}),[]);
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(
  local,{copyPath:true,copyContents:true}),[
    {id:"workspace-file-copy-path",message:"Copy path"},
    {id:"workspace-file-copy-contents",message:"Copy file contents"},
  ]);
});
test("original context-menu order and workspace exclusion retain SXo rules",()=>{
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(panel,{
  viewFile:true,copyPath:true,copyContents:true,
 }),[
  {id:"workspace-file-view-file",message:"Open file"},
  {id:"workspace-file-copy-path",message:"Copy path"},
  {id:"workspace-file-copy-contents",message:"Copy file contents"},
 ]);
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(panel,{
  viewFile:true,copyPath:true,copyContents:true,openMode:"workspace",
 }),[
  {id:"workspace-file-view-file",message:"Open file"},
  {id:"workspace-file-copy-path",message:"Copy path"},
 ]);
 assert.deepEqual(sourceWorkspaceFileContextMenuItems(local,{
  viewFile:true,copyPath:false,copyContents:false,
 }),[]);
});

test("original app-shared VR=q2 path joining is applied to SXo Copy path when cwd exists",()=>{
  const route=(path,cwd)=>projectSourceUserFileQeRoute({path},{cwd});
  assert.equal(sourceWorkspaceFileCopyPath(route("src/App.tsx","/work/repo")),
    "/work/repo/src/App.tsx");
  assert.equal(sourceWorkspaceFileCopyPath(route("/home/user/A.ts","/work/repo")),
    "/home/user/A.ts");
  assert.equal(sourceWorkspaceFileCopyPath(route("src/../file.ts","/work/repo/")),
    "/work/repo/src/../file.ts"); // source does not resolve dot segments
  assert.equal(sourceWorkspaceFileCopyPath(route("src/App.tsx",null)),
    "src/App.tsx"); // SXo does not invoke Va when cwd absent
  assert.equal(sourceWorkspaceFileCopyPath(route("C:\\Users\\Me\\a.ts","D:\\temp")),
    "/C:/Users/Me/a.ts");
  assert.equal(sourceWorkspaceFileCopyPath(route("src\\a.ts","C:\\Users\\Me")),
    "/C:/Users/Me/src/a.ts");
  assert.equal(sourceWorkspaceFileCopyPath(route("C:\\Users\\Me\\a.ts",null)),
    "C:\\Users\\Me\\a.ts");
  assert.equal(sourceWorkspaceFileCopyPath(route("src/a.ts","")),
    "src/a.ts");
  assert.equal(sourceWorkspaceFileCopyPath(route("\\\\server\\share\\a.ts","C:\\repo")),
    "//server/share/a.ts");
  assert.equal(sourceWorkspaceFileCopyPath({kind:"upload",fileName:"one.pdf"}),null);
});
test("independent native context menu fails closed on unresolved relative file paths",()=>{
  const route=(path,cwd)=>projectSourceUserFileQeRoute({path},{cwd});
  const native={copyPath:true,copyContents:true,
    requiresAbsoluteCopyPath:true,requiresAbsoluteReadPath:true};
  assert.equal(isSourceWorkspaceAbsoluteCopyPath("src/a.ts"),false);
  assert.equal(isSourceWorkspaceAbsoluteCopyPath("/repo/a.ts"),true);
  assert.equal(isSourceWorkspaceAbsoluteCopyPath("C:\\repo\\a.ts"),true);
  assert.deepEqual(sourceWorkspaceFileContextMenuItems(route("src/a.ts"),native),[]);
  assert.deepEqual(sourceWorkspaceFileContextMenuItems(route("src/a.ts","/repo"),native),[
    {id:"workspace-file-copy-path",message:"Copy path"},
  ]);
  assert.deepEqual(sourceWorkspaceFileContextMenuItems(route("/repo/a.ts"),native),[
    {id:"workspace-file-copy-path",message:"Copy path"},
    {id:"workspace-file-copy-contents",message:"Copy file contents"},
  ]);
  // Source SXo's private clipboard supports unresolved paths; only the
  // independent OS-host capability is constrained.
  assert.deepEqual(sourceWorkspaceFileContextMenuItems(route("src/a.ts"),{
    copyPath:true,copyContents:true,
  }),[
    {id:"workspace-file-copy-path",message:"Copy path"},
    {id:"workspace-file-copy-contents",message:"Copy file contents"},
  ]);
});
