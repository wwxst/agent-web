import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_PINNED_CONTENT_TABS_STORAGE_KEY,
  SOURCE_PINNED_CONTENT_TAB_PRESENTATION_STORAGE_KEY,
  SOURCE_UNIFIED_SIDEBAR_PINNED_ORDER_STORAGE_KEY,
  sourcePinnedContentTabId,
  sourcePinnedContentTabOrderKey,
  sourceEmptyPinnedContentTabsState,
  sourceParsePinnedContentTabs,
  sourceSerializePinnedContentTabs,
  sourcePinContentTab,
  sourceUnpinContentTab,
  sourceSetPinnedContentTabPresentation,
  sourceMarkPinnedContentTabUnavailable,
  sourcePinnedContentTabsInDisplayOrder,
  sourcePinnedContentTabDisplayRow,
} from "../build/SourcePinnedContentTabsModel.js";

function input(overrides={}) {
  return {
    accountId:null,hostId:"local",threadId:"frontend",
    clientThreadId:"frontend",tabId:"file:/workspace/src/App.tsx",
    tabKind:"workspace-file",title:"App.tsx",routePath:"/",
    routeSearch:"",sourceToken:"owner-token-1",...overrides,
  };
}

test("original mqi identity keys a pin by account, host, client thread and exact source tab",()=>{
  const id=sourcePinnedContentTabId(
    null,"local","frontend","file:/workspace/src/App.tsx",
  );
  assert.equal(id,'[null,"local","frontend","file:/workspace/src/App.tsx"]');
  assert.equal(sourcePinnedContentTabOrderKey(id),"content-tab:"+id);
  assert.notEqual(id,sourcePinnedContentTabId(
    null,"local","review","file:/workspace/src/App.tsx",
  ));
  assert.notEqual(id,sourcePinnedContentTabId(
    null,"durable","frontend","file:/workspace/src/App.tsx",
  ));
  assert.equal(SOURCE_PINNED_CONTENT_TABS_STORAGE_KEY,"pinned-content-tabs-v1");
  assert.equal(SOURCE_PINNED_CONTENT_TAB_PRESENTATION_STORAGE_KEY,
    "pinned-content-tab-presentation-v1");
  assert.equal(SOURCE_UNIFIED_SIDEBAR_PINNED_ORDER_STORAGE_KEY,
    "unified-sidebar-pinned-order-v1");
});

test("source uqi records an exact tab reference and a separate live presentation",()=>{
  const empty=sourceEmptyPinnedContentTabsState();
  const result=sourcePinContentTab(empty,input());
  assert.equal(result.created,true);
  assert.equal(result.pin.id,'[null,"local","frontend","file:/workspace/src/App.tsx"]');
  assert.deepEqual(result.pin,{
    id:result.pin.id,accountId:null,hostId:"local",threadId:"frontend",
    clientThreadId:"frontend",tabId:"file:/workspace/src/App.tsx",
    tabKind:"workspace-file",title:"App.tsx",routePath:"/",
    routeSearch:"",order:1,
  });
  assert.deepEqual(result.state.presentationById[result.pin.id],{
    sourceToken:"owner-token-1",title:"App.tsx",kind:"workspace-file",
    chrome:null,available:true,
  });
  assert.deepEqual(result.state.sidebarOrder,[
    "content-tab:"+result.pin.id,
  ]);
  assert.deepEqual(empty,sourceEmptyPinnedContentTabsState(),
    "pinning must not mutate the prior state");
  const duplicate=sourcePinContentTab(result.state,input({
    title:"Changed title",sourceToken:"different-owner",
  }));
  assert.equal(duplicate.created,false);
  assert.equal(duplicate.pin.title,"App.tsx");
  assert.equal(duplicate.state,result.state);
});

test("source f7n removes only the sidebar reference and leaves its source tab owner external",()=>{
  const tabs=[{id:"file:/workspace/src/App.tsx",open:true}];
  const pinned=sourcePinContentTab(
    sourceEmptyPinnedContentTabsState(),input(),
  ).state;
  const pinId=pinned.pins[0].id;
  const unpinned=sourceUnpinContentTab(pinned,pinId);
  assert.deepEqual(unpinned,sourceEmptyPinnedContentTabsState());
  assert.deepEqual(tabs,[{id:"file:/workspace/src/App.tsx",open:true}],
    "the independent source tab is not closed or mutated by unpin");
  assert.equal(sourceUnpinContentTab(unpinned,pinId),unpinned);
});

test("presentation updates track exact live owner and retain an unavailable pin",()=>{
  const pinned=sourcePinContentTab(
    sourceEmptyPinnedContentTabsState(),input(),
  ).state;
  const pinId=pinned.pins[0].id;
  const live=sourcePinnedContentTabDisplayRow(pinned,pinId,{
    tabId:"file:/workspace/src/App.tsx",clientThreadId:"frontend",
    title:"App.tsx",
  },"file:/workspace/src/App.tsx");
  assert.deepEqual({
    title:live.title,unavailable:live.unavailable,isActive:live.isActive,
  },{title:"App.tsx",unavailable:false,isActive:true});
  const unavailable=sourceMarkPinnedContentTabUnavailable(pinned,pinId);
  assert.equal(unavailable.pins.length,1);
  assert.equal(unavailable.presentationById[pinId].available,false);
  const row=sourcePinnedContentTabDisplayRow(unavailable,pinId,null,null);
  assert.deepEqual({
    title:row.title,unavailable:row.unavailable,isActive:row.isActive,
  },{title:"App.tsx",unavailable:true,isActive:false});
  assert.equal(sourceMarkPinnedContentTabUnavailable(unavailable,pinId),
    unavailable);
});

test("a persisted presentation is only a snapshot; a missing or mismatched owner is unavailable",()=>{
  const pinned=sourcePinContentTab(
    sourceEmptyPinnedContentTabsState(),input(),
  ).state;
  const pinId=pinned.pins[0].id;
  const missing=sourcePinnedContentTabDisplayRow(pinned,pinId,null,null);
  assert.equal(missing.unavailable,true);
  const otherThread=sourcePinnedContentTabDisplayRow(pinned,pinId,{
    tabId:"file:/workspace/src/App.tsx",clientThreadId:"review",
    title:"App.tsx",
  },"file:/workspace/src/App.tsx");
  assert.equal(otherThread.unavailable,true);
  const otherTab=sourcePinnedContentTabDisplayRow(pinned,pinId,{
    tabId:"file:/workspace/src/index.ts",clientThreadId:"frontend",
    title:"index.ts",
  },"file:/workspace/src/index.ts");
  assert.equal(otherTab.unavailable,true);
});

test("the three original storage records survive round-trip and sort by sidebar order",()=>{
  let state=sourceEmptyPinnedContentTabsState();
  state=sourcePinContentTab(state,input()).state;
  state=sourcePinContentTab(state,input({
    tabId:"file:/workspace/src/index.ts",title:"index.ts",
    sourceToken:"owner-token-2",
  })).state;
  const first=state.pins[0],second=state.pins[1];
  state={...state,sidebarOrder:[
    "project:other",sourcePinnedContentTabOrderKey(second.id),
    sourcePinnedContentTabOrderKey(first.id),
  ]};
  const serialized=sourceSerializePinnedContentTabs(state);
  const restored=sourceParsePinnedContentTabs(
    serialized.pinsJson,serialized.presentationJson,serialized.orderJson,
  );
  assert.deepEqual(restored,state);
  assert.deepEqual(sourcePinnedContentTabsInDisplayOrder(restored).map(pin=>pin.id),
    [second.id,first.id]);
});

test("invalid persisted records are ignored without discarding valid pins or foreign order keys",()=>{
  const valid=sourcePinContentTab(
    sourceEmptyPinnedContentTabsState(),input(),
  ).state.pins[0];
  const parsed=sourceParsePinnedContentTabs(
    JSON.stringify({
      [valid.id]:valid,
      invalid:{id:"wrong",hostId:"local"},
    }),
    JSON.stringify({
      [valid.id]:{sourceToken:"token",title:"App.tsx",kind:"workspace-file",
        chrome:null,available:true},
      invalid:{sourceToken:"",title:4,kind:"",available:"yes"},
    }),
    JSON.stringify(["project:existing",sourcePinnedContentTabOrderKey(valid.id),4]),
  );
  assert.deepEqual(parsed.pins,[valid]);
  assert.equal(parsed.presentationById[valid.id].available,true);
  assert.deepEqual(parsed.sidebarOrder,[
    "project:existing",sourcePinnedContentTabOrderKey(valid.id),
  ]);
  assert.deepEqual(sourceParsePinnedContentTabs("{broken","null","[]"),
    sourceEmptyPinnedContentTabsState());
});

test("owner reconnection replaces stale presentation token without changing pin identity",()=>{
  let state=sourcePinContentTab(
    sourceEmptyPinnedContentTabsState(),input(),
  ).state;
  const pin=state.pins[0];
  state=sourceMarkPinnedContentTabUnavailable(state,pin.id);
  state=sourceSetPinnedContentTabPresentation(state,pin.id,{
    sourceToken:"owner-token-after-reopen",title:"App.tsx",
    kind:"workspace-file",chrome:null,available:true,
  });
  assert.equal(state.pins[0].id,pin.id);
  assert.equal(state.presentationById[pin.id].sourceToken,
    "owner-token-after-reopen");
  assert.equal(state.presentationById[pin.id].available,true);
});
