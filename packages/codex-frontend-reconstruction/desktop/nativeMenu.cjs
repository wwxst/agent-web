"use strict";
/**
 * Source evidence:
 *  main-C4DYk222.js w0e native Edit roles,
 *  D0e File close/quit, View Zoom ±/Actual Size/Full Screen, Help Documentation.
 * The private Codex command keymap and run-command handlers are NOT part
 * of this standalone renderer. Exclude unconnected items (New Task, Search,
 * project commands etc), rather than pretending they work.
 */
const MENU_IDS=Object.freeze(["file","edit","view","help"]);
function buildSourceNativeMenus({platform="win32",actions}){
  const isMac=platform==="darwin";
  const edit=[
    {label:"Undo",role:"undo"},
    {label:"Redo",role:"redo"},
    {type:"separator"},
    {label:"Cut",role:"cut"},
    {label:"Copy",role:"copy"},
    {label:"Paste",role:"paste"},
    ...(isMac?[{label:"Paste and Match Style",role:"pasteAndMatchStyle",
      accelerator:"Command+Option+Shift+V"}]:[]),
    {label:"Delete",role:"delete"},
    {type:"separator"},
    {label:"Select All",role:"selectAll"},
  ];
  const file=[
    {label:"Close Window",id:"closeWindow",accelerator:isMac?"Command+W":"Ctrl+W",
      click:actions.closeWindow},
    {type:"separator"},
    {label:"Quit",id:"quit",accelerator:isMac?"Command+Q":"Ctrl+Q",
      click:actions.quit},
  ];
  const view=[
    // Original D0e: Ne dispatches toggle-sidebar; st/lt dispatch
    // run-command previousThread/nextThread through its dynamic keymap.
    // The user's keymap is not available, so never invent accelerators.
    {label:"Toggle Sidebar",id:"toggleSidebar",click:actions.toggleSidebar},
    {type:"separator"},
    {label:"Previous Thread",id:"previousThread",click:actions.previousThread},
    {label:"Next Thread",id:"nextThread",click:actions.nextThread},
    {type:"separator"},
    // Original D0e's it/at/ot: primary accelerator is dynamic, so leave
    // it unspecified; only fixed next/previous shortcuts are source-proven.
    {label:"Find in Thread",id:"findInThread",click:actions.findInThread},
    {label:"Find Next",id:"findNextInThread",visible:false,
      accelerator:isMac?"Command+G":"Ctrl+G",acceleratorWorksWhenHidden:true,
      click:actions.findNextInThread},
    {label:"Find Previous",id:"findPreviousInThread",visible:false,
      accelerator:isMac?"Command+Shift+G":"Shift+F3",acceleratorWorksWhenHidden:true,
      click:actions.findPreviousInThread},
    {type:"separator"},
    {label:"Zoom In",id:"zoomIn",accelerator:"CmdOrCtrl+Plus",
      click:actions.zoomIn},
    // Original D0e includes this Windows-only Ctrl+= hidden accelerator.
    ...(!isMac?[{label:"Zoom In (alternative)",visible:false,
      accelerator:"Ctrl+=",acceleratorWorksWhenHidden:true,
      click:actions.zoomIn}]:[]),
    {label:"Zoom Out",id:"zoomOut",accelerator:"CmdOrCtrl+-",
      click:actions.zoomOut},
    {label:"Actual Size",id:"actualSize",accelerator:"CmdOrCtrl+0",
      click:actions.actualSize},
    {type:"separator"},
    {label:"Toggle Full Screen",id:"toggleFullScreen",
      accelerator:isMac?"Command+Control+F":"F11",
      click:actions.toggleFullScreen},
  ];
  const help=[
    {label:"Documentation",id:"documentation",click:actions.documentation},
  ];
  const menus=[
    {id:"file",label:"File",submenu:file},
    {id:"edit",label:"Edit",role:"editMenu",submenu:edit},
    {id:"view",label:"View",submenu:view},
    {id:"help",label:"Help",role:"help",submenu:help},
  ];
  return isMac?[
    {label:"agent-web",role:"appMenu",submenu:[{role:"about"},{type:"separator"},{role:"quit"}]},
    ...menus.slice(0,3),
    {label:"Window",role:"windowMenu"},
    menus[3],
  ]:menus;
}
function isAllowedMenuId(value){return typeof value==="string"&&MENU_IDS.includes(value);}
function sanitizeMenuAnchor(anchor){
 if(anchor==null||typeof anchor!=="object"||
    !Number.isFinite(anchor.x)||!Number.isFinite(anchor.y))return null;
 return {x:Math.max(0,Math.min(4096,Math.round(anchor.x))),
         y:Math.max(0,Math.min(4096,Math.round(anchor.y)))};
}
module.exports={MENU_IDS,buildSourceNativeMenus,isAllowedMenuId,sanitizeMenuAnchor};
