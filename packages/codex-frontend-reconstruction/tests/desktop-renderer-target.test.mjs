import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { APP_ORIGIN,resolveRendererTarget,resolveBundledResource } =
  require("../electron/renderer-target.cjs");
const root=path.resolve("packages/example");
test("bundled desktop renderer lives under a private secure app origin",()=>{
 const target=resolveRendererTarget({packageRoot:root});
 assert.equal(target.kind,"bundled");
 assert.equal(target.allowedOrigin,APP_ORIGIN);
 assert.equal(target.url,APP_ORIGIN+"/index.html?desktopShell=1");
 assert.equal(resolveBundledResource(target.distRoot,APP_ORIGIN+"/assets/main.js"),
  path.resolve(root,"demo-dist/assets/main.js"));
});
test("dev renderer is explicitly restricted to the configured local Vite port",()=>{
 const target=resolveRendererTarget({packageRoot:root,devServerUrl:"http://127.0.0.1:5173/"});
 assert.equal(target.kind,"development");
 assert.ok(target.url.endsWith("?desktopShell=1"));
 for(const url of ["https://evil.example/","http://evil.example:5173/",
   "http://127.0.0.1:5174/","file:///etc/passwd","http://127.0.0.1:5173/malicious",
   "http://user:pass@127.0.0.1:5173/"]){
  assert.throws(()=>resolveRendererTarget({packageRoot:root,devServerUrl:url}));
 }
});
test("no off-origin or traversal renderer resource can be opened",()=>{
 const dist=path.resolve(root,"demo-dist");
 for (const url of [
   "https://evil.example/index.html",
   "agent-web://other/index.html",
   "agent-web://local/%2e%2e/%2e%2e/secret.js",
   "agent-web://local/%00file",
 ]) {
  assert.throws(()=>resolveBundledResource(dist,url));
 }
});
