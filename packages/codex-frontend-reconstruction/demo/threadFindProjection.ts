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
    const units=blocks.flatMap(block=>{
      if (block.type==="user-message" || block.type==="assistant-message") {
        const text=typeof block.item.content==="string" ? block.item.content : "";
        const unitKey=typeof block.item.id==="string" ? block.item.id : block.key;
        return text ? [{unitKey,text}] : [];
      }
      if (block.type==="activity-item") {
        const text=itemText(block.item);
        const unitKey=typeof block.item.id==="string" ? block.item.id : block.key;
        return text ? [{unitKey,text}] : [];
      }
      if (block.type==="agent-activity") return block.items.flatMap((item,index)=>{
        const text=itemText(item);
        return text ? [{unitKey:typeof item.id==="string"?item.id:`${block.key}:${index}`,text}] : [];
      });
      return [];
    });
    const text=units.map(unit=>unit.text).join("\n");
    return text.length===0?[]:[{
      turnKey:entry.turnKey??`history-content:turn:${id}`,
      text,units,
    }];
  });
}
