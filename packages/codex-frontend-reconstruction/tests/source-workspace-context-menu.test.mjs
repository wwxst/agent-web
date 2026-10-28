import test from "node:test";
import assert from "node:assert/strict";
import {sourceWorkspaceFileContextMenuItems} from "../build/SourceWorkspaceFileContextMenuModel.js";
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
