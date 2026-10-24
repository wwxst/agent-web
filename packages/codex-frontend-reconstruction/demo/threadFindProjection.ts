import type {ConversationRenderEntry} from "../src/conversation/ConversationRenderEntriesModel.js";
import type {SourceThreadFindRow} from "../src/conversation/SourceThreadFindModel.js";
import {getDemoBlocks} from "./mockConversation.js";

/** Search only what our current demo-host projection actually owns.
 * Y historical records not yet hydrated and private Codex search domains
 * remain outside this standalone adapter; never stringify arbitrary metadata.
 */
function itemText(value: unknown): string {
  if(value==null||typeof value!=="object")return "";
  const item=value as Record<string,unknown>;
  return ["content","heading","command","output","filePath"]
    .map(key=>item[key]).filter((v):v is string=>typeof v==="string").join("\n");
}
export function projectDemoThreadFindRows(entries:readonly ConversationRenderEntry[]):SourceThreadFindRow[] {
  return entries.flatMap(entry=>{
    const id=entry.turnId??entry.turnSearchKey;
    if(!id)return [];
    const blocks=getDemoBlocks(entry);
    const text=blocks.map(block=>{
      const data=block as unknown as Record<string,unknown>;
      if(Array.isArray(data.items))return data.items.map(itemText).join("\n");
      return itemText(data.item);
    }).filter(Boolean).join("\n");
    return text.length===0?[]:[{turnKey:`history-content:turn:${id}`,text}];
  });
}
