import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_LANGUAGE_LOCATION_KINDS,
  sourceLanguageCapabilities,
  sourceLanguageIdForPath,
  sourceLanguageLocationIsWithinRoot,
  sourceLanguageRelativePathIsSafe,
  sourceLanguageLocations,
  sourceRelativeLanguageLocationPath,
  sourceWorkspaceRootFromPath,
} from "../build/SourceLanguageNavigationModel.js";

test("maps only original TypeScript LSP language IDs",()=>{
  assert.equal(sourceLanguageIdForPath("/repo/src/App.ts"),"typescript");
  assert.equal(sourceLanguageIdForPath("/repo/src/App.tsx"),"typescriptreact");
  assert.equal(sourceLanguageIdForPath("/repo/src/App.js"),"javascript");
  assert.equal(sourceLanguageIdForPath("/repo/src/App.jsx"),"javascriptreact");
  assert.equal(sourceLanguageIdForPath("C:\\repo\\src\\App.mjs"),"javascript");
  assert.equal(sourceLanguageIdForPath("/repo/src/style.css"),null);
});

test("grant-relative language paths accept normal names and reject unsafe traversal",()=>{
  for(const path of ["src/App.tsx","src/index.ts","src/file0.ts",
    "nested/Folder/NewFile.ts","docs/readme.md"]){
    assert.equal(sourceLanguageRelativePathIsSafe(path),true,path);
  }
  for(const path of ["../outside.ts","/root/secret.ts","src//file.ts",
    "src\\file.ts","src/file:name.ts","src/file\u0000.ts",
    "src/./file.ts","src/../file.ts","src/file."]){
    assert.equal(sourceLanguageRelativePathIsSafe(path),false,path);
  }
});

test("capabilities are normalized and unknown location kinds are not exposed",()=>{
  assert.deepEqual(sourceLanguageCapabilities({
    hover:true,
    locationKinds:["definition","references","untrusted","definition",null],
  }),{hover:true,locationKinds:["definition","references"]});
  assert.deepEqual(sourceLanguageCapabilities({
    hover:1,locationKinds:"definition",
  }),{hover:false,locationKinds:[]});
  assert.equal(sourceLanguageCapabilities(null),null);
  assert.deepEqual(SOURCE_LANGUAGE_LOCATION_KINDS,[
    "definition","typeDefinition","implementation","references",
  ]);
});

test("malformed location results are dropped and only bounded LSP positions survive",()=>{
  assert.deepEqual(sourceLanguageLocations([
    {path:"/repo/src/a.ts",range:{start:{line:1,character:2},end:{line:1,character:4}}},
    {path:"/repo/src/b.ts",range:{start:{line:0,character:0}}},
    {path:"",range:{start:{line:0,character:0}}},
    {path:"/repo/src/c.ts",range:{start:{line:-1,character:0}}},
    {path:"/repo/src/d.ts",range:{start:{line:0,character:Infinity}}},
    {path:"/repo/src/e.ts",range:{start:{line:10_000_000,character:0}}},
    {path:"/repo/../outside.ts",range:{start:{line:0,character:0}}},
    {path:"relative.ts",range:{start:{line:0,character:0}}},
    null,
  ]),[
    {path:"/repo/src/a.ts",range:{start:{line:1,character:2},end:{line:1,character:4}}},
    {path:"/repo/src/b.ts",range:{start:{line:0,character:0}}},
  ]);
  assert.deepEqual(sourceLanguageLocations({}),[]);
});

test("workspace display root is derived from the granted file's relative path",()=>{
  assert.equal(sourceWorkspaceRootFromPath(
    "/projects/agent-web/src/App.tsx","src/App.tsx",
  ),"/projects/agent-web");
  assert.equal(sourceWorkspaceRootFromPath(
    "C:\\Projects\\agent-web\\src\\App.tsx","src\\App.tsx",
  ),"C:/Projects/agent-web");
  assert.equal(sourceWorkspaceRootFromPath("/repo/a.ts","src/a.ts"),null);
});

test("location paths are constrained to the active workspace root",()=>{
  assert.equal(sourceLanguageLocationIsWithinRoot(
    "/projects/agent-web/src/index.ts","/projects/agent-web",
  ),true);
  assert.equal(sourceLanguageLocationIsWithinRoot(
    "/projects/agent-web-elsewhere/secret.ts","/projects/agent-web",
  ),false);
  assert.equal(sourceLanguageLocationIsWithinRoot(
    "C:\\PROJECTS\\AGENT-WEB\\src\\index.ts",
    "c:\\projects\\agent-web",
  ),true);
  assert.equal(sourceLanguageLocationIsWithinRoot(
    "/outside/secret.ts","/projects/agent-web",
  ),false);
  assert.equal(sourceLanguageLocationIsWithinRoot(
    "/projects/agent-web/../outside/secret.ts","/projects/agent-web",
  ),false);
  assert.equal(sourceRelativeLanguageLocationPath(
    "/projects/agent-web/src/index.ts","/projects/agent-web",
  ),"src/index.ts");
  assert.equal(sourceRelativeLanguageLocationPath(
    "/outside/secret.ts","/projects/agent-web",
  ),"/outside/secret.ts");
});
