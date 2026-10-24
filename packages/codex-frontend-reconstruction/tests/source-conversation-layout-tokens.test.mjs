import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_CONVERSATION_ITEM_GAP_PX,
  SOURCE_CONVERSATION_GROUPED_ITEM_GAP_PX,
  SOURCE_DEFAULT_CHAT_FONT_SIZE_PX,
  SOURCE_DEFAULT_CODE_FONT_SIZE_PX,
} from "../build/SourceConversationLayoutTokens.js";

test("pinned app-shared and conversation-gap item/typography defaults",()=>{
  assert.equal(SOURCE_CONVERSATION_ITEM_GAP_PX,16);
  assert.equal(SOURCE_CONVERSATION_GROUPED_ITEM_GAP_PX,4);
  assert.equal(SOURCE_DEFAULT_CHAT_FONT_SIZE_PX,13);
  assert.equal(SOURCE_DEFAULT_CODE_FONT_SIZE_PX,12);
});
