import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceReviewFileTabId,sourceEmptyLocalReadOnlyTabState,
  sourceOpenLocalReadOnlyFileTab,sourceSelectLocalReadOnlyFileTab,
  sourceCloseLocalReadOnlyFileTab,
  sourceLocalFileTabContextMenu,sourceCloseOtherLocalReadOnlyFileTabs,
  sourceCloseLocalReadOnlyTabsToRight,sourceKeepLocalReadOnlyFileTab,
} from "../build/SourceReviewFileTabModel.js";

test("original app-initial k3o file tab id uses host and environment only when present",()=>{
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts"),"file:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId(null),"file:");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{hostId:"local"}),
    "file:local:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{hostId:"cloud"}),
    "file:cloud:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{
    hostId:"cloud",environmentId:"env-3",
  }),"file:cloud:env-3:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{
    hostId:"cloud",environmentId:"env-3",tabId:"explicit-id",
  }),"explicit-id");
});
test("source IX identity deduplicates file tabs, preserves order and updates range/content when reopened",()=>{
  const first={id:"file:/workspace/a.ts",path:"/workspace/a.ts",
    content:{text:"first",line:3}};
  const other={id:"file:/workspace/b.ts",path:"/workspace/b.ts",
    content:{text:"second",line:4}};
  const empty=sourceEmptyLocalReadOnlyTabState();
  const one=sourceOpenLocalReadOnlyFileTab(empty,first);
  assert.deepEqual(one,{tabs:[first],activeTabId:first.id});
  assert.deepEqual(empty,{tabs:[],activeTabId:null});
  const two=sourceOpenLocalReadOnlyFileTab(one,other);
  assert.deepEqual(two.tabs,[first,other]);
  assert.equal(two.activeTabId,other.id);
  const updated={...first,content:{text:"updated",line:14,endLine:28}};
  const reopened=sourceOpenLocalReadOnlyFileTab(two,updated);
  assert.equal(reopened.tabs.length,2);
  assert.deepEqual(reopened.tabs,[updated,other]);
  assert.equal(reopened.activeTabId,first.id);
  const selected=sourceSelectLocalReadOnlyFileTab(reopened,other.id);
  assert.equal(selected.activeTabId,other.id);
  assert.equal(sourceSelectLocalReadOnlyFileTab(selected,"unknown"),selected);
  assert.equal(sourceSelectLocalReadOnlyFileTab(selected,other.id),selected);
});
test("independent read-only tab strip closes selected tab without losing surviving files",()=>{
  const a={id:"file:a",path:"a",content:"a"};
  const b={id:"file:b",path:"b",content:"b"};
  const c={id:"file:c",path:"c",content:"c"};
  const state=[a,b,c].reduce(sourceOpenLocalReadOnlyFileTab,sourceEmptyLocalReadOnlyTabState());
  const withB=sourceSelectLocalReadOnlyFileTab(state,b.id);
  const closeB=sourceCloseLocalReadOnlyFileTab(withB,b.id);
  assert.equal(closeB.activeTabId,c.id);
  assert.deepEqual(closeB.tabs,[a,c]);
  const closeA=sourceCloseLocalReadOnlyFileTab(closeB,a.id);
  assert.equal(closeA.activeTabId,c.id);
  const closeC=sourceCloseLocalReadOnlyFileTab(closeA,c.id);
  assert.deepEqual(closeC,sourceEmptyLocalReadOnlyTabState());
  assert.equal(sourceCloseLocalReadOnlyFileTab(closeC,"unknown"),closeC);
});

test("late independent file read populates a background tab without stealing a newer selection",()=>{
  const a={id:"file:a.ts",path:"a.ts",content:"first"};
  const b={id:"file:b.ts",path:"b.ts",content:"second"};
  const openB=sourceOpenLocalReadOnlyFileTab(sourceEmptyLocalReadOnlyTabState(),b);
  const lateA=sourceOpenLocalReadOnlyFileTab(openB,a,false);
  assert.deepEqual(lateA.tabs,[b,a]);
  assert.equal(lateA.activeTabId,b.id);
  const updatedA=sourceOpenLocalReadOnlyFileTab(lateA,{...a,content:"newest"},false);
  assert.equal(updatedA.activeTabId,b.id);
  assert.equal(updatedA.tabs.find(tab=>tab.id===a.id)?.content,"newest");
  assert.equal(sourceOpenLocalReadOnlyFileTab(lateA,a,true).activeTabId,a.id);
  // A background read is still usable if it is the first file to finish.
  const first=sourceOpenLocalReadOnlyFileTab(sourceEmptyLocalReadOnlyTabState(),a,false);
  assert.equal(first.activeTabId,a.id);
});

test("original Eqi tab strip menu preserves source action order and disabled-state gates",()=>{
  const a={id:"file:a",path:"a",content:"a"};
  const b={id:"file:b",path:"b",content:"b"};
  const c={id:"file:c",path:"c",content:"c"};
  const state=[a,b,c].reduce(sourceOpenLocalReadOnlyFileTab,sourceEmptyLocalReadOnlyTabState());
  assert.deepEqual(sourceLocalFileTabContextMenu(state,"missing"),[]);
  assert.deepEqual(sourceLocalFileTabContextMenu(state,a.id),[
    {id:"close-tab",message:"Close",enabled:true},
    {id:"close-other-tabs",message:"Close other tabs",enabled:true},
    {id:"close-tabs-to-the-right",message:"Close tabs to the right",enabled:true},
  ]);
  assert.deepEqual(sourceLocalFileTabContextMenu(state,c.id).map(item=>item.enabled),
    [true,true,false]);
  const only=sourceCloseOtherLocalReadOnlyFileTabs(state,b.id);
  assert.deepEqual(only,{tabs:[b],activeTabId:b.id});
  assert.equal(sourceLocalFileTabContextMenu(only,b.id)[1]?.enabled,false);
  assert.equal(sourceLocalFileTabContextMenu(only,b.id)[2]?.enabled,false);
  assert.equal(sourceCloseOtherLocalReadOnlyFileTabs(only,b.id),only);
  assert.equal(sourceCloseOtherLocalReadOnlyFileTabs(state,"missing"),state);
});
test("source close right removes only following tabs and preserves existing left-side selection",()=>{
  const a={id:"file:a",path:"a",content:"a"};
  const b={id:"file:b",path:"b",content:"b"};
  const c={id:"file:c",path:"c",content:"c"};
  const state=[a,b,c].reduce(sourceOpenLocalReadOnlyFileTab,sourceEmptyLocalReadOnlyTabState());
  const selectedA=sourceSelectLocalReadOnlyFileTab(state,a.id);
  const keepSelected=sourceCloseLocalReadOnlyTabsToRight(selectedA,b.id);
  assert.deepEqual(keepSelected,{tabs:[a,b],activeTabId:a.id});
  assert.deepEqual(state.tabs,[a,b,c],"input state must not be modified");
  assert.deepEqual(sourceCloseLocalReadOnlyTabsToRight(state,b.id),{
    tabs:[a,b],activeTabId:b.id,
  },"closing active rightmost tab selects the initiating tab in the independent fallback");
  assert.equal(sourceCloseLocalReadOnlyTabsToRight(state,c.id),state);
  assert.equal(sourceCloseLocalReadOnlyTabsToRight(state,"missing"),state);
});


test("source XL replaces only the previous preview and keeps explicit tabs",()=>{
  const pinned={id:"file:pinned.ts",path:"pinned.ts",content:"pinned"};
  const previewA={id:"file:a.ts",path:"a.ts",content:"a",isPreview:true};
  const previewB={id:"file:b.ts",path:"b.ts",content:"b",isPreview:true};
  const base=sourceOpenLocalReadOnlyFileTab(sourceEmptyLocalReadOnlyTabState(),pinned);
  const withA=sourceOpenLocalReadOnlyFileTab(base,previewA);
  assert.deepEqual(withA.tabs,[pinned,previewA]);
  const withB=sourceOpenLocalReadOnlyFileTab(withA,previewB);
  assert.deepEqual(withB.tabs,[pinned,previewB]);
  assert.equal(withB.activeTabId,previewB.id);
  assert.equal(withB.tabs.some(tab=>tab.id===pinned.id),true);
  assert.equal(withB.tabs.some(tab=>tab.id===previewA.id),false);
});

test("source XL preserves existing pinned status and an explicit open keeps an existing preview",()=>{
  const pinned={id:"file:pinned.ts",path:"pinned.ts",content:"old"};
  const preview={id:"file:preview.ts",path:"preview.ts",content:"preview",isPreview:true};
  const state=sourceOpenLocalReadOnlyFileTab(
    sourceOpenLocalReadOnlyFileTab(sourceEmptyLocalReadOnlyTabState(),pinned),preview);
  const previewReopen=sourceOpenLocalReadOnlyFileTab(state,{
    ...pinned,content:"reopened",isPreview:true,
  });
  assert.equal(previewReopen.tabs.find(tab=>tab.id===pinned.id)?.isPreview,false);
  assert.equal(previewReopen.tabs.find(tab=>tab.id===preview.id)?.isPreview,true);
  const explicitOpen=sourceOpenLocalReadOnlyFileTab(previewReopen,{
    ...preview,content:"explicit open",
  });
  assert.equal(explicitOpen.tabs.find(tab=>tab.id===preview.id)?.isPreview,undefined);
  assert.equal(explicitOpen.activeTabId,preview.id);
  assert.equal(explicitOpen.tabs.length,2);
});

test("source XL pinTab behavior keeps a preview in the strip and adds Keep tab menu action",()=>{
  const pinned={id:"file:pinned.ts",path:"pinned.ts",content:"pinned"};
  const preview={id:"file:preview.ts",path:"preview.ts",content:"preview",isPreview:true};
  const state=sourceOpenLocalReadOnlyFileTab(
    sourceOpenLocalReadOnlyFileTab(sourceEmptyLocalReadOnlyTabState(),pinned),preview);
  assert.deepEqual(sourceLocalFileTabContextMenu(state,preview.id).map(item=>item.id),[
    "keep-tab","close-tab","close-other-tabs","close-tabs-to-the-right",
  ]);
  const kept=sourceKeepLocalReadOnlyFileTab(state,preview.id);
  assert.equal(kept.tabs.find(tab=>tab.id===preview.id)?.isPreview,false);
  assert.equal(kept.activeTabId,state.activeTabId);
  assert.deepEqual(sourceLocalFileTabContextMenu(kept,preview.id).map(item=>item.id),[
    "close-tab","close-other-tabs","close-tabs-to-the-right",
  ]);
  assert.equal(sourceKeepLocalReadOnlyFileTab(kept,preview.id),kept);
  assert.equal(sourceKeepLocalReadOnlyFileTab(kept,"missing"),kept);
});

test("background preview replacement never leaves activeTabId pointing at the disposed preview",()=>{
  const pinned={id:"file:pinned.ts",path:"pinned.ts",content:"pinned"};
  const preview={id:"file:preview.ts",path:"preview.ts",content:"preview",isPreview:true};
  const next={id:"file:next.ts",path:"next.ts",content:"next",isPreview:true};
  const state=sourceOpenLocalReadOnlyFileTab(
    sourceOpenLocalReadOnlyFileTab(sourceEmptyLocalReadOnlyTabState(),pinned),preview);
  const selectedPreview=sourceSelectLocalReadOnlyFileTab(state,preview.id);
  const background=sourceOpenLocalReadOnlyFileTab(selectedPreview,next,false);
  assert.deepEqual(background.tabs,[pinned,next]);
  assert.equal(background.activeTabId,pinned.id);
});
