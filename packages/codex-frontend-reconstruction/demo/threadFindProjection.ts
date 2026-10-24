import type {ConversationRenderEntry} from "../src/conversation/ConversationRenderEntriesModel.js";
import type {ConversationMessageItem} from "../src/conversation/ConversationMessageRenderPlan.js";
import type {SourceHistoricalTurnSnapshot} from "../src/conversation/SourceHistoricalTurnContentSource.js";
import type {SourceThreadFindRow} from "../src/conversation/SourceThreadFindModel.js";
import {getDemoBlocks} from "./mockConversation.js";

/** Search the same source-Y-projected entries as the mounted virtualizer.
 * History-summary rows MUST come from their own keyed source subscription:
 * raw base turns hold demo fixture items even while their actual React
 * projection has not hydrated them. Never index those private/unloaded items.
 */
function itemText(value: unknown): string {
  if(value==null||typeof value!=="object")return "";
  const item=value as Record<string,unknown>;
  return ["content","heading","command","output","filePath"]
    .map(key=>item[key]).filter((v): v is string=>typeof v==="string").join("\n");
}
export function projectDemoThreadFindRows(
  entries:readonly ConversationRenderEntry[],
  getHistoricalSnapshot?:(entry:ConversationRenderEntry)=>
    SourceHistoricalTurnSnapshot<ConversationMessageItem>|null,
):SourceThreadFindRow[] {
  return entries.flatMap(entry=>{
    const id=entry.turnId??entry.turnSearchKey;
    if(!id)return [];
    const needsHydration=entry.turn==null&&entry.historyEntityKey!=null;
    const historical=needsHydration?getHistoricalSnapshot?.(entry)??null:null;
    if(needsHydration&&historical?.loaded!==true)return [];
    // getDemoBlocks uses the SAME Y historical selection and turnItemIds
    // ordering as ConversationMessageBlocks in the live virtualized row.
    const blocks=getDemoBlocks(entry,historical);
    const text=blocks.map(block=>{
      const data=block as unknown as Record<string,unknown>;
      if(Array.isArray(data.items))return data.items.map(itemText).join("\n");
      return itemText(data.item);
    }).filter(Boolean).join("\n");
    return text.length===0?[]:[{turnKey:entry.turnKey??`history-content:turn:${id}`,text}];
  });
}
