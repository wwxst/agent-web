/**
 * Original ek -> ok combined-unit trace branch from
 * sites-end-resource-fa77a923096d.js:
 *
 *    o = combinedUnitKey == null ? null : ok(units, combinedUnitKey)
 *    visibleUnits = o == null ? units : [o]
 *
 * The trace key comes only from the host. Do not combine arbitrary adjacent
 * activity groups or infer a trace from matching titles, timestamps or tools.
 */
import type { AgentActivityItem, AgentActivityUnit } from "./AgentActivityProjection.js";

export function combineSourceActivityTrace<T extends AgentActivityItem>(
  units: readonly AgentActivityUnit<T>[],
  combinedUnitKey: string | null | undefined,
): readonly AgentActivityUnit<T>[] {
  if (combinedUnitKey == null) return units;
  const items = units.flatMap(unit =>
    unit.kind === "group" ? [...unit.items] : [unit.item]);
  const first = items[0];
  if (first == null) return units;
  return [{
    kind: "group",
    key: `agent-activity-trace:${combinedUnitKey}`,
    items: [first, ...items.slice(1)],
  }];
}
