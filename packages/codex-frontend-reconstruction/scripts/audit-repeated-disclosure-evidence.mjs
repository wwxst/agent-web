import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";

const root=process.argv[2];
if (!root) {
  console.error("Usage: node scripts/audit-repeated-disclosure-evidence.mjs <extracted-frontend/webview/assets>");
  process.exit(2);
}
const inputs=[
  {
    file:"sites-end-resource-fa77a923096d.js",
    sha:"a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708",
    signatures:[
      "function A_(e)", "function V_(e)", "function XO(e)", "function nk(e)",
      "g===`opening`||g===`expanded`", "onAnimationComplete:()=>{_(j_)}",
      "requestAnimationFrame(()=>{_(M_)})",
      "shouldAnimateInitialCollapse:!1",
      "data:", "vertical-scroll-fade-mask -ms-2 flex max-h-56",
      "children:()=>t.map(e)", "summaryTransition:ae",
    ],
  },
  {
    file:"inline-followup-markdown-4751fe20f26d.js",
    sha:"b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b",
    signatures:["function Je(", "groupable", "mcp-tool-call", "external-event"],
  },
];
let checked=0;
for(const input of inputs){
  const contents=readFileSync(join(root,input.file));
  const digest=createHash("sha256").update(contents).digest("hex");
  if(digest!==input.sha)throw new Error(`${input.file} SHA-256 mismatch: ${digest}`);
  const source=contents.toString("utf8");
  for(const needle of input.signatures){
    if(!source.includes(needle))throw new Error(`${input.file} missing source signature ${needle}`);
    checked++;
  }
  console.log(`${input.file}: SHA-256 and ${input.signatures.length} signatures verified`);
}
console.log(`A_/XO/V_/Je source audit: ${checked}/${checked} signatures`);
