#!/usr/bin/env node
/**
 * Optional read-only evidence audit for the user's private original frontend.
 * No original compiled resource is committed, printed or distributed.
 * Usage: node scripts/audit-navigation-rail-evidence.mjs /path/to/app-initial-5851df3f6cb1.js /path/to/app-shared-dc7535e633d7.css
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const [compiledJs, compiledCss] = process.argv.slice(2);
if (!compiledJs || !compiledCss) {
  console.error("Usage: node scripts/audit-navigation-rail-evidence.mjs <app-initial-js> <app-shared-css>");
  process.exit(2);
}

const evidence = [
  {
    name: "app-initial compiled JSX",
    path: compiledJs,
    sha256: "c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10",
    markers: [
      "function dWc(",
      "data-app-navigation-rail",
      "sidebarElectron.appNavigation",
      "App navigation",
      "group/sidebar-rail",
      "browser:w-13",
      "data-sidebar-destination",
      "navigationRailEnabled",
      "directDestinationIds",
      "moreDestinationIds",
      "--app-shell-navigation-rail-width",
      "clientWidth",
      "data-app-shell-feature-navigation",
      "data-app-shell-sidebar-open",
      "onSelect",
      "sidebarElectron.rail.settings",
    ],
  },
  {
    name: "app-shared compiled CSS",
    path: compiledCss,
    sha256: "282dd3546bccfba48212a186641a73dedb27af6af7962dad40b3f5db6a9a08f2",
    markers: [
      "--spacing-token-sidebar:clamp(240px",
      "--height-toolbar:46px",
      "--height-toolbar-sm:36px",
    ],
  },
];
let total = 0;
for (const group of evidence) {
  const bytes = readFileSync(group.path);
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash, group.sha256, `${group.name} differs from the audited original bundle`);
  const source = bytes.toString("utf8");
  for (const marker of group.markers) {
    assert.ok(source.includes(marker), `${group.name} missing evidence marker: ${marker}`);
    total++;
  }
  console.log(`${group.name}: SHA-256 verified, ${group.markers.length} signatures present`);
}
console.log(`Navigation rail compiled-source audit: ${total}/${total} signatures matched. This does not prove complete behavioral or visual parity.`);
