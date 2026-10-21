import type { VirtualizedTurnScrollController } from "../src/components/VirtualizedTurnList.js";

/** Browser replacement for the private Codex scroll controller. */
export class BrowserScrollController implements VirtualizedTurnScrollController {
  private readonly listeners = new Set<(distanceFromBottomPx: number) => void>();
  private lastDistance = 0;
  constructor(private readonly element: () => HTMLElement | null) {}

  getScrollElement(): HTMLElement | null { return this.element(); }

  getLastScrollDistanceFromBottomPx(): number {
    const el = this.element();
    if (el == null) return this.lastDistance;
    this.lastDistance = Math.max(0, el.scrollHeight - el.clientHeight - el.scrollTop);
    return this.lastDistance;
  }

  subscribeScroll(listener: (distanceFromBottomPx: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyScroll(): void {
    const distance = this.getLastScrollDistanceFromBottomPx();
    for (const listener of this.listeners) listener(distance);
  }

  scrollToDistanceFromBottomPx(distanceFromBottomPx: number, behavior: ScrollBehavior = "instant"): void {
    const el = this.element();
    const distance = Math.max(0, distanceFromBottomPx);
    this.lastDistance = distance;
    if (el == null) return;
    const top = Math.max(0, el.scrollHeight - el.clientHeight - distance);
    el.scrollTo({ top, behavior: behavior === "smooth" ? "smooth" : "instant" });
    if (behavior !== "smooth") this.notifyScroll();
  }

  compensateScrollToDistanceFromBottomPx(distanceFromBottomPx: number): void {
    this.scrollToDistanceFromBottomPx(distanceFromBottomPx, "instant");
  }
}
