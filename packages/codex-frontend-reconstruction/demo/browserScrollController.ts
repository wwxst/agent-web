import type { VirtualizedTurnScrollController } from "../src/components/VirtualizedTurnList.js";

/** Browser replacement for the private Codex scroll controller. */
export class BrowserScrollController implements VirtualizedTurnScrollController {
  private readonly listeners = new Set<(distanceFromBottomPx: number) => void>();
  private lastDistance = 0;
  private sourceBottomAnimationFrame: number | null = null;
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


  /** Original thread-scroll-layout Ot: 260ms ease-out cubic, computed as
   * remaining distance from the current scrollHeight each animation frame.
   * This remains stable when virtualized content grows during the action;
   * Chromium's native smooth scroll can finish at a stale pixel coordinate. */
  scrollToBottomFromSource(): void {
    const el = this.element();
    if (el == null) return;
    this.cancelSourceScrollToBottomAnimation();
    const distance = this.getLastScrollDistanceFromBottomPx();
    if (distance <= 24 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.scrollToDistanceFromBottomPx(0, "instant");
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      this.sourceBottomAnimationFrame = null;
      if (this.element() !== el) return;
      const progress = Math.min(1, (now - start) / 260);
      const eased = 1 - (1 - progress) ** 3;
      this.scrollToDistanceFromBottomPx(distance * (1 - eased), "instant");
      if (progress < 1 && this.getLastScrollDistanceFromBottomPx() > 24) {
        this.sourceBottomAnimationFrame = window.requestAnimationFrame(tick);
      } else {
        this.scrollToDistanceFromBottomPx(0, "instant");
      }
    };
    this.sourceBottomAnimationFrame = window.requestAnimationFrame(tick);
  }

  /** Source thread-scroll-layout cancels pending bottom animation as soon as
   * the user wheels or switches threads; late frames may not steal focus. */
  cancelSourceScrollToBottomAnimation(): void {
    if (this.sourceBottomAnimationFrame == null) return;
    window.cancelAnimationFrame(this.sourceBottomAnimationFrame);
    this.sourceBottomAnimationFrame = null;
  }

  compensateScrollToDistanceFromBottomPx(distanceFromBottomPx: number): void {
    this.scrollToDistanceFromBottomPx(distanceFromBottomPx, "instant");
  }
}
