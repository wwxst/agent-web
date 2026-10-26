/** Source app-primary SG/F7e work-status divider.
 *
 * The original Wfe duration formatter is locale-aware. This semantic model
 * deliberately exposes an English demo label; production host localization
 * remains a separate adapter, never a reconstructed private formatter.
 */
export type SourceWorkStatus = "loading" | "unknown" | "paused" | "working" | "worked" | "stopped";

export interface SourceWorkStatusInput {
  status?: unknown;
  startedAtMs?: unknown;
  completedAtMs?: unknown;
}

export interface SourceWorkStatusPresentation {
  status: SourceWorkStatus;
  label: string;
  elapsedMs: number | null;
}

function finiteTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Stable English demo formatting (not an assertion of original Wfe locale output). */
export function formatDemoWorkDuration(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${seconds}s`;
}

export function projectSourceWorkStatus(
  input: SourceWorkStatusInput,
  nowMs: number,
): SourceWorkStatusPresentation | null {
  const status = input.status;
  if (status !== "loading" && status !== "unknown" &&
      status !== "paused" && status !== "working" &&
      status !== "worked" && status !== "stopped") return null;
  if (status === "loading") return {status, label:"Loading activity status",elapsedMs:null};
  if (status === "unknown") return {status, label:"Activity",elapsedMs:null};
  if (status === "paused") return {status, label:"Paused",elapsedMs:null};
  const start=finiteTime(input.startedAtMs);
  const end=finiteTime(input.completedAtMs);
  const now=finiteTime(nowMs);
  if(start==null) return null;
  if(status==="worked" && end==null) return null;
  const elapsedMs=Math.max(0,(end??now??start)-start);
  const duration=formatDemoWorkDuration(elapsedMs);
  switch(status){
    case "working":
      return {status,label:elapsedMs>=1000?`Working for ${duration}`:"Working",elapsedMs};
    case "worked":
      return {status,label:`Worked for ${duration}`,elapsedMs};
    case "stopped":
      return {status,label:`You stopped after ${duration}`,elapsedMs};
  }
}
