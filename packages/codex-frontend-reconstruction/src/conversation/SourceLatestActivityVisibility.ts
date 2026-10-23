/**
 * Original inline-followup-markdown-4751fe20f26d.js `qe` (export c).
 * Keeps standalone units and currently active groups, plus the final group
 * only when the real host explicitly allows it.
 *
 * `f` in qe imports F$n from app-initial-5851df3f6cb1.js:
 * nonempty assistant text OR completed OR structured output.
 * `Q` uses original item-type-specific in-progress state.
 */
import {isActiveGroupMember, type GroupActivityItem} from "./AgentActivityGroupPresentation.js";
import type {AgentActivityUnit} from "./AgentActivityProjection.js";

export function isSourceMeaningfulAssistant(item: GroupActivityItem): boolean {
  return (typeof item.content === "string" && item.content.trim().length > 0) ||
    item.completed === true || item.structuredOutput != null;
}

export function filterSourceLatestActivityUnits<T extends GroupActivityItem>(
  units: readonly AgentActivityUnit<T>[],
  allowLatestGroup: boolean,
): AgentActivityUnit<T>[] {
  let finalRelevantIndex = -1;
  for (let index = units.length - 1; index >= 0; index--) {
    const unit = units[index]!;
    if (unit.kind !== "standalone" || unit.item.type !== "assistant-message" ||
        isSourceMeaningfulAssistant(unit.item)) {
      finalRelevantIndex = index;
      break;
    }
  }
  return units.filter((unit, index) =>
    unit.kind !== "group" ||
    (allowLatestGroup && index === finalRelevantIndex) ||
    unit.items.some(isActiveGroupMember));
}
