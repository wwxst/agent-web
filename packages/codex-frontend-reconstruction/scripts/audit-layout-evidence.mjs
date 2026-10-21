#!/usr/bin/env node
/**
 * Read-only audit against the actual user-supplied Codex compiled resources.
 * The resources are NOT included in this GitHub repository.
 * Usage:
 *   node scripts/audit-layout-evidence.mjs --assets-dir /path/to/frontend/webview/assets
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const flagIndex = args.indexOf("--assets-dir");
const assetsDir = flagIndex >= 0 ? args[flagIndex + 1] : process.env.CODEX_COMPILED_ASSETS;
if (!assetsDir) {
  console.error("Supply --assets-dir /path/to/frontend/webview/assets (original files only)");
  process.exit(2);
}
const checks = [
  ["app-shared-dc7535e633d7.css", [
    "--height-toolbar:46px",
    "--height-toolbar-sm:36px",
    "--spacing-token-sidebar:clamp(240px, var(--codex-sidebar-preferred-width,275px), min(520px, calc(100vw - 320px)))",
    "--thread-content-max-width:48rem",
  ]],
  ["app-initial-e7c27dd40beb.css", [
    "._ComposerLayoutRoot_5est5_2",
    "[data-composer-density=compact]",
    "[data-composer-density=comfortable]",
    "[data-composer-radius-variant=default]",
    "[data-composer-radius-variant=large]",
    "._ComposerLayoutBody_5est5_2",
    "._ComposerLayoutInput_5est5_2",
    "._ComposerLayoutFooter_5est5_2",
    "[data-composer-rows=stacked]",
    "._ApplicationMenuTopBar_etoz9_2",
  ]],
  ["app-initial-5851df3f6cb1.js", [
    "ComposerLayoutRoot:gcr",
    "ComposerLayoutFooter:_cr",
    "ComposerLayoutBody:bcr",
    "ComposerLayoutInput:Ccr",
    '"data-composer-layout":x',
    '"data-composer-density":C',
    '"data-composer-radius-variant":k',
    '"data-composer-surface-variant":O',
    '"data-composer-rows":c',
    '"data-app-shell-frame":!0',
    '"data-app-shell-sidebar-open":me',
  ]],
];
let failures = 0;
for (const [file, fragments] of checks) {
  const p = resolve(assetsDir, file);
  if (!existsSync(p)) {
    console.error(`MISSING ${p}`);
    failures++;
    continue;
  }
  const content = readFileSync(p);
  const sha = createHash("sha256").update(content).digest("hex");
  const text = content.toString("utf-8");
  const missing = fragments.filter((fragment) => !text.includes(fragment));
  failures += missing.length;
  console.log(`${missing.length ? "FAIL" : "PASS"} ${file} ${sha.slice(0, 16)} (${fragments.length - missing.length}/${fragments.length} signatures)`);
  for (const fragment of missing) console.error(`  NOT FOUND ${fragment}`);
}
if (failures) process.exit(1);
console.log("Source evidence verified against the supplied compiled Codex resources. This does not prove complete UI parity.");
