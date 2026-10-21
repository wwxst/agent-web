import test from "node:test";
import assert from "node:assert/strict";
import { projectNavigationDestinations } from "../build/NavigationRailModel.js";

const available = [
  { id: "builtin:home", label: "Home", isCurrentDestination: true },
  { id: "builtin:activity", label: "Activity" },
  { id: "builtin:automations", label: "Scheduled" },
  { id: "builtin:library", label: "Library" },
];
const config = {
  directDestinationIds: ["builtin:home", "builtin:activity", "builtin:home", "missing", "builtin:automations"],
  moreDestinationIds: ["builtin:library", "builtin:activity"],
};

test("source rail-enabled route puts direct navigation in rail only", () => {
  const result = projectNavigationDestinations(available, { ...config, navigationRailEnabled: true });
  assert.deepEqual(result.railDestinations.map((item) => item.id), ["builtin:home", "builtin:activity", "builtin:automations"]);
  assert.deepEqual(result.sidebarDestinations, []);
  assert.deepEqual(result.sidebarMoreDestinations, []);
  assert.equal(result.railDestinations[0]?.isCurrentDestination, true);
});

test("source rail-disabled route keeps navigation in secondary panel", () => {
  const result = projectNavigationDestinations(available, { ...config, navigationRailEnabled: false });
  assert.deepEqual(result.railDestinations, []);
  assert.deepEqual(result.sidebarDestinations.map((item) => item.id), ["builtin:home", "builtin:activity", "builtin:automations"]);
  assert.deepEqual(result.sidebarMoreDestinations.map((item) => item.id), ["builtin:library"]);
});

test("unknown destination IDs are omitted without producing fake routes", () => {
  const result = projectNavigationDestinations(available, {
    navigationRailEnabled: true,
    directDestinationIds: ["does-not-exist", "builtin:home", "builtin:home"],
  });
  assert.deepEqual(result.railDestinations.map((item) => item.id), ["builtin:home"]);
});

test("empty destination lists stay empty in either shell mode", () => {
  assert.deepEqual(projectNavigationDestinations([], { navigationRailEnabled: true, directDestinationIds: [] }).railDestinations, []);
  assert.deepEqual(projectNavigationDestinations([], { navigationRailEnabled: false, directDestinationIds: [] }).sidebarDestinations, []);
});
