import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ESTIMATED_ROW_HEIGHT_PX,
  buildThreadVirtualizerLayout,
  getVisibleThreadRange,
  reanchorThreadRange,
  adjustDistanceFromBottomForLayoutChange,
  getDistanceToCenterTurn,
  getDistanceToTurn,
  findVisibleMeasuredAnchor,
  captureRenderedWindow,
  isThreadRangeContained,
} from "../build/ThreadVirtualizerModel.js";

function entries(count, height = 100) {
  return Array.from({ length: count }, (_, index) => ({
    turnKey: `t${index}`,
    estimatedHeightPx: height,
  }));
}

test("builds top offsets, bottom offsets and total height from measured/estimated rows", () => {
  const layout = buildThreadVirtualizerLayout({
    entries: entries(3), gapPx: 10, measuredHeightsByKey: { t1: 140 },
  });
  assert.deepEqual(layout.heightsPx, [100, 140, 100]);
  assert.deepEqual(layout.gapsBeforePx, [0, 10, 10]);
  assert.deepEqual(layout.topOffsetsPx, [0, 110, 260]);
  assert.deepEqual(layout.bottomOffsetsPx, [260, 110, 0]);
  assert.equal(layout.totalHeightPx, 360);
  assert.equal(layout.turnIndexByKey.get("t2"), 2);
});

test("uses the 280px fallback and applies pixel-scale rounding", () => {
  const layout = buildThreadVirtualizerLayout({
    entries: [
      { turnKey: "unknown" },
      { turnKey: "fraction", estimatedHeightPx: 12.36, minHeightPx: 12.34 },
    ],
    gapPx: 1.26, pixelScale: 2,
  });
  assert.equal(layout.heightsPx[0], DEFAULT_ESTIMATED_ROW_HEIGHT_PX);
  assert.equal(layout.heightsPx[1], 12.5);
  assert.equal(layout.gapsBeforePx[1], 1.5);
});

test("collapseEmptyRows suppresses gaps before leading zero-height rows", () => {
  const layout = buildThreadVirtualizerLayout({
    collapseEmptyRows: true,
    entries: [
      { turnKey: "empty-a", estimatedHeightPx: 0 },
      { turnKey: "empty-b", estimatedHeightPx: 0 },
      { turnKey: "visible", estimatedHeightPx: 50 },
      { turnKey: "gap", type: "gap", estimatedHeightPx: 0 },
      { turnKey: "next", estimatedHeightPx: 30 },
    ],
    gapPx: 12,
  });
  assert.deepEqual(layout.gapsBeforePx, [0, 0, 0, 0, 12]);
  assert.deepEqual([...layout.gapKeys], ["gap"]);
  assert.equal(layout.totalHeightPx, 92);
});

test("visible range is calculated in distance-from-bottom coordinates", () => {
  const layout = buildThreadVirtualizerLayout({ entries: entries(4), gapPx: 0 });
  assert.deepEqual(getVisibleThreadRange({
    distanceFromBottomPx: 0, layout, overscanCount: 0, viewportHeightPx: 100,
  }), { startIndex: 3, endIndex: 4 });
  assert.deepEqual(getVisibleThreadRange({
    distanceFromBottomPx: 100, layout, overscanCount: 0, viewportHeightPx: 100,
  }), { startIndex: 2, endIndex: 3 });
  assert.deepEqual(getVisibleThreadRange({
    distanceFromBottomPx: 50, layout, overscanCount: 0, viewportHeightPx: 100,
  }), { startIndex: 2, endIndex: 4 });
});

test("visible range clamps distance and applies overscan without exceeding row count", () => {
  const layout = buildThreadVirtualizerLayout({ entries: entries(5), gapPx: 0 });
  assert.deepEqual(getVisibleThreadRange({
    distanceFromBottomPx: 1_000, layout, overscanCount: 2, viewportHeightPx: 200,
  }), { startIndex: 0, endIndex: 3 });
  assert.deepEqual(getVisibleThreadRange({
    distanceFromBottomPx: 100, layout, overscanCount: 1, viewportHeightPx: 100,
  }), { startIndex: 2, endIndex: 5 });
});

test("empty layouts have an empty visible range", () => {
  const layout = buildThreadVirtualizerLayout({ entries: [], gapPx: 8 });
  assert.deepEqual(getVisibleThreadRange({
    distanceFromBottomPx: 0, layout, overscanCount: 2, viewportHeightPx: 500,
  }), { startIndex: 0, endIndex: 0 });
});

test("reanchors a virtualized range and returns null for a missing key", () => {
  const layout = buildThreadVirtualizerLayout({ entries: entries(6), gapPx: 0 });
  assert.deepEqual(reanchorThreadRange({
    anchorKey: "t3", layout, previousRange: { startIndex: 1, endIndex: 4 },
  }), { startIndex: 3, endIndex: 6 });
  assert.equal(reanchorThreadRange({
    anchorKey: "missing", layout, previousRange: { startIndex: 0, endIndex: 2 },
  }), null);
});

test("preserves the anchor row position when a preceding row grows", () => {
  const previousLayout = buildThreadVirtualizerLayout({ entries: entries(4), gapPx: 0 });
  const nextLayout = buildThreadVirtualizerLayout({
    entries: [
      ...entries(3),
      { turnKey: "t3", estimatedHeightPx: 160 },
    ],
    gapPx: 0,
  });
  assert.equal(adjustDistanceFromBottomForLayoutChange({
    anchorKey: "t2", distanceFromBottomPx: 100, previousLayout, nextLayout,
  }), 160);
  assert.equal(adjustDistanceFromBottomForLayoutChange({
    anchorKey: "missing", distanceFromBottomPx: 100, previousLayout, nextLayout,
  }), null);
});

test("computes centered and edge-aligned turn navigation distances", () => {
  const layout = buildThreadVirtualizerLayout({ entries: entries(4), gapPx: 0 });
  assert.equal(getDistanceToCenterTurn({
    layout, turnKey: "t2", viewportHeightPx: 100,
  }), 100);
  assert.equal(getDistanceToTurn({
    align: "top", layout, turnKey: "t2", viewportHeightPx: 100,
  }), 110);
  assert.equal(getDistanceToTurn({
    align: "center", layout, turnKey: "missing", viewportHeightPx: 100,
  }), null);
});

test("selects visible measured non-gap rows that survive into the next layout", () => {
  const layout = buildThreadVirtualizerLayout({
    entries: [
      { turnKey: "old", estimatedHeightPx: 100 },
      { turnKey: "gap", type: "gap", estimatedHeightPx: 0 },
      { turnKey: "middle", estimatedHeightPx: 100 },
      { turnKey: "latest", estimatedHeightPx: 100 },
    ],
    gapPx: 0,
  });
  const nextLayout = buildThreadVirtualizerLayout({
    entries: [
      { turnKey: "old", estimatedHeightPx: 120 },
      { turnKey: "gap", type: "gap", estimatedHeightPx: 0 },
      { turnKey: "middle", estimatedHeightPx: 100 },
      { turnKey: "latest", estimatedHeightPx: 100 },
    ],
    gapPx: 0,
  });
  const common = {
    distanceFromBottomPx: 50, layout,
    measuredHeightsByKey: { old: 100, gap: 0, middle: 100, latest: 100 },
    nextLayout, viewportHeightPx: 200,
  };
  assert.equal(findVisibleMeasuredAnchor({ ...common, preferLatestVisibleRow: false }), "middle");
  assert.equal(findVisibleMeasuredAnchor({ ...common, preferLatestVisibleRow: true }), "latest");
});

test("captures measured heights and the current rendered-window anchor", () => {
  assert.deepEqual(captureRenderedWindow({
    measuredHeightsByKey: { t0: 80, t2: null },
    range: { startIndex: 1, endIndex: 3 },
    turnKeys: ["t0", "t1", "t2"],
  }), {
    renderedWindow: { anchorKey: "t1", count: 2 },
    turnHeightsByKey: { t0: 80 },
  });
  assert.equal(captureRenderedWindow({
    measuredHeightsByKey: {}, range: { startIndex: 0, endIndex: 1 }, turnKeys: ["t0"],
  }), null);
});

test("range containment supports retaining a wider already-rendered window", () => {
  assert.equal(isThreadRangeContained(
    { startIndex: 0, endIndex: 8 }, { startIndex: 2, endIndex: 6 },
  ), true);
  assert.equal(isThreadRangeContained(
    { startIndex: 2, endIndex: 6 }, { startIndex: 0, endIndex: 8 },
  ), false);
});
