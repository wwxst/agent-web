import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/audit-tool-detail-evidence.mjs", import.meta.url));
const result = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });

assert.equal(
  result.status,
  0,
  "compiled-source evidence audit script must remain syntactically valid:\n" + result.stderr,
);
