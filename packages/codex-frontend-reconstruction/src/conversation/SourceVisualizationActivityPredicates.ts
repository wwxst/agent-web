/**
 * Exact standalone predicates from
 * skill-exploration-labels-dbc7ec897dab.js, exports l / a / c.
 *
 * Jt is the original execution status gate: null is allowed and only
 * inProgress/completed are accepted among concrete statuses.
 * Kt recognizes command text modifying the visualizations directory.
 * qt recognizes only *visualization* skill definition reads, NOT every
 * meaningful SKILL.md read.
 */
import {
  resolveSourceSkillDefinitionFromRead,
  type HistoryToolItem,
} from "./ToolActivityHistorySourceTransforms.js";

export type SourceVisualizationKind = "create" | "update";

const visualizationsDirectory=/(?:^|[\\/])visualizations(?:[\\/"'\s;]|$)/i;
const modifyingCommand=/(?:^|\s)(?:apply_patch|mkdir|tee|touch|cp|mv|install)(?:\s|$)|(?:^|[^<])>>?/;
const addingVisualization=/\*\*\* Add File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i;
const updatingVisualization=/\*\*\* Update File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i;
const deletingVisualization=/\*\*\* Delete File:[^\r\n]*[\\/]visualizations(?:[\\/"'\s;]|$)/i;

export function isSourceVisualizationExecutionStatus(status: unknown): boolean {
  return status == null || status === "inProgress" || status === "completed";
}
export function classifySourceVisualizationCommand(command: unknown): SourceVisualizationKind|null {
  if(typeof command !== "string")return null;
  if(!visualizationsDirectory.test(command)||!modifyingCommand.test(command))return null;
  if(addingVisualization.test(command))return "create";
  if(updatingVisualization.test(command))return "update";
  if(deletingVisualization.test(command))return null;
  return "create";
}
/**
 * qt(P(read path)). In the source qt accepts metadata from the real skill
 * parser only when the definition belongs to visualize/live/persisted.
 */
export function isSourceVisualizationSkillRead(item: HistoryToolItem): boolean {
  const skill=resolveSourceSkillDefinitionFromRead(item);
  if(skill==null || !skill.isSkillDefinitionFile)return false;
  const skillId=skill.skillId.toLowerCase();
  const pluginId=skill.pluginId?.toLowerCase();
  return skillId==="visualize" || pluginId==="visualize" &&
    (skillId==="live"||skillId==="persisted");
}
