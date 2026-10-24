import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const require=createRequire(import.meta.url);
const {isAllowedNavigation}=require("./navigationPolicy.cjs");
const indexPath=resolve("demo-dist/index.html");
const exact=pathToFileURL(indexPath).href;

test("independent native UI command host accepts only its own canonical file renderer",()=>{
 assert.equal(isAllowedNavigation(exact,{indexPath}),true);
 assert.equal(isAllowedNavigation(exact+"#root",{indexPath}),true);
 assert.equal(isAllowedNavigation(pathToFileURL(resolve("demo-dist/outside.html")).href,{indexPath}),false);
 assert.equal(isAllowedNavigation("https://example.com/",{indexPath}),false);
 assert.equal(isAllowedNavigation("data:text/html,test",{indexPath}),false);
 assert.equal(isAllowedNavigation("javascript:alert(1)",{indexPath}),false);
 assert.equal(isAllowedNavigation("not a URL",{indexPath}),false);
});
test("canonical file URL comparison is case-aware on Unix, case-insensitive on win32",()=>{
 const options={indexPath};
 assert.equal(isAllowedNavigation(exact,{...options,platform:"win32"}),true);
 // The native Win32 case-insensitive behavior is evaluated on a native
 // Windows runner in CI; do not hand-strip drive letters or URL slashes.
});
test("development transport accepts only matching configured localhost origin",()=>{
 const devUrl="http://127.0.0.1:5173/";
 assert.equal(isAllowedNavigation("http://127.0.0.1:5173/review",{indexPath,devUrl}),true);
 assert.equal(isAllowedNavigation("http://localhost:5173/",{indexPath,devUrl}),false);
 assert.equal(isAllowedNavigation("https://127.0.0.1:5173/",{indexPath,devUrl}),false);
 assert.equal(isAllowedNavigation("http://127.0.0.1:5180/",{indexPath,devUrl}),false);
});
