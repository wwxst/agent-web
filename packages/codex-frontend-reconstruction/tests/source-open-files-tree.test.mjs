import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceOpenFileTreePaths,sourceInitialOpenFileTreeExpansion,
  sourceOpenFileTreeRows,
} from "../build/SourceOpenFilesTreeModel.js";

const files=[
  {id:"file:/work/src/App.tsx",relativePath:"src/App.tsx"},
  {id:"file:/work/src/index.ts",relativePath:"src\\index.ts"},
  {id:"file:/work/docs/notes.md",relativePath:"docs/notes.md"},
];

test("source Vn open-file projection deduplicates paths without creating or reading host paths",()=>{
  const paths=sourceOpenFileTreePaths([...files,
    {id:"dup",relativePath:"src/App.tsx"},
    {id:"traversal",relativePath:"../secret.ts"},
    {id:"absolute",relativePath:"/outside.ts"},
    {id:"empty",relativePath:""},
    {id:"control",relativePath:"some\u0000thing.txt"},
    {id:"dot",relativePath:"src/./bad.ts"},
  ]);
  assert.deepEqual(paths,[
    {id:files[0].id,path:"src/App.tsx"},
    {id:files[1].id,path:"src/index.ts"},
    {id:files[2].id,path:"docs/notes.md"},
  ]);
});
test("original flattened directory projection keeps stable source tab IDs and selectedPath",()=>{
  const expanded=sourceInitialOpenFileTreeExpansion(files,files[0].id);
  assert.deepEqual([...expanded],["src"]);
  const rows=sourceOpenFileTreeRows(files,expanded,files[0].id);
  assert.deepEqual(rows.map(row=>[row.kind,row.label,row.path,row.depth]),[
    ["folder","docs","docs",1],
    ["folder","src","src",1],
    ["file","App.tsx","src/App.tsx",2],
    ["file","index.ts","src/index.ts",2],
  ]);
  assert.equal(rows[2].tabId,files[0].id);
  assert.equal(rows[2].selected,true);
  assert.equal(rows[3].selected,false);
  assert.equal(rows[0].expanded,false);
  const collapsed=sourceOpenFileTreeRows(files,new Set(),files[0].id);
  assert.equal(collapsed.length,2);
  assert.equal(collapsed[1].expanded,false);
});
test("source file filtering reveals matching ancestors without mutating manually collapsed paths",()=>{
  const expanded=new Set(["docs"]);
  const before=[...expanded];
  const rows=sourceOpenFileTreeRows(files,expanded,files[1].id,"INDEX");
  assert.deepEqual(rows.map(row=>row.label),["src","index.ts"]);
  assert.equal(rows[0].expanded,true);
  assert.equal(rows[1].selected,true);
  assert.deepEqual([...expanded],before);
  assert.deepEqual(sourceOpenFileTreeRows(files,expanded,null,"not-there"),[]);
});
test("source flattenEmptyDirectories compresses singleton folder chains",()=>{
  const nested=[{id:"file:z",relativePath:"root/a/b/c/file.ts"}];
  const expanded=sourceInitialOpenFileTreeExpansion(nested,"file:z");
  assert.deepEqual(sourceOpenFileTreeRows(nested,expanded,"file:z").map(x=>[x.label,x.path]),[
    ["root/a/b/c","root/a/b/c"],["file.ts","root/a/b/c/file.ts"],
  ]);
});
