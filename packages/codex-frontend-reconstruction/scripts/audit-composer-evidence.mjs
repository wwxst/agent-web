#!/usr/bin/env node
/**
 * Read-only signature/hash audit against the exact supplied Codex build.
 * Usage:
 *   node scripts/audit-composer-evidence.mjs --assets-dir /path/to/frontend/webview/assets
 * The original compiled bundles must stay private and must not be committed.
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
  {
    file: "app-primary-fe8a450b3b04.js",
    sha256: "2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2",
    signatures: [
      "onSubmit:bt,onStop:xt,onUserInput:St",
      "onFilesSelected:at,onPastedText:ot",
      "submitReady:xi&&!nr&&!Ka",
      "onSubmit:e=>to(v.getText(),e)",
      "Ar.getSnapshot().status!==`idle`",
      "Tn.get($4,b)>0",
      "if(Ka){Vi&&!vn&&Ha(`send`)",
      "workHomePolicyAcceptance",
      "onPasteCapture:pd,onDropCapture:hd,onSubmit:gd",
      "Ti=!Xt&&qn==null&&(An&&Zt||bi&&(vi===`streaming`||Yn||Si&&!Jt||!Kt&&!Jt||!qr&&!_i))",
      "Ci=Xt||An&&!Jt||Sn&&(qr||_i)",
      "wi=Yt||An&&!Xt&&!Zt",
      "type:Ti?`button`:`submit`",
      "onClick:jl},Ti?`stop`:`send`",
      "pd=e=>{Vn&&qn==null&&(e.preventDefault(),e.stopPropagation())}",
      "hd=e=>{Vn&&qn==null&&(e.preventDefault(),e.stopPropagation())}",
      "gd=e=>{e.preventDefault(),to(v.getText(),e.timeStamp,e.nativeEvent instanceof SubmitEvent&&e.nativeEvent.submitter!=null)}",
    ],
  },
  {
    file: "app-initial-5851df3f6cb1.js",
    sha256: "c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10",
    signatures: [
      "e.setPlaceholder(n)",
      "e.setInputActive(!0)",
      "e.clearInitialInputFocus()",
      "e.addSubmitHandler(t=>{e.cancelPendingSubmit(),D(t)})",
      "e.setSubmitReady(d)",
      "onInput:p",
      "onCompositionStart:()=>N(!0)",
      "onCompositionEnd:()=>N(!1)",
      "e.view.dom.dataset.virtualkeyboard=`true`",
      "new ResizeObserver(P)",
      "addEventListener(`loadingdone`,P)",
      "function SUu(e,t)",
      "EUu=class{view;eventEmitter;inlineMentionIconRegistry",
      "addSubmitHandler(e)",
      "requestSubmitWhenReady(e,t)",
      "submitPendingWhenReady()",
      "getText(e=this.dictation.document)",
      "destroy()",
      "return new EUu(i,a,n,c,o,s,u,d,l,t?.restoreMarkdownLinksAsTextLinks??!1,t?.restorePathLinksAsFileMentions??!0,t?.plainTextMode??!1,r,f)",
      "function rUu(e=null,{addInitialContentToHistory:t=!1,defaultTextKind:n=`plain`",
      "C=x?.pmu.schema()??kja",
      "plugins:[P.createPlugin(C),KBu(P),g_e(),...B==null?[]:[B],GVu,oIu()",
      "S.listInput,S.codeBlockFenceExit,S.inputRules,S.inputRulesHistoryIsolation",
      "S.typedTable,S.blockquoteBackspace,S.backspace,S.tabIndent,S.codeBlockDeletion",
      "S.codeBlockArrowExit,S.extensionKeymap",
      "...S?.links??[]",
      "\"Shift-Enter\":",
      "\"Alt-Enter\":",
      "Enter:(e,t)=>{if(Ri.getState(e)?.active===!0)return!0",
      "\"Mod-Enter\":",
      "T.emit(`submit`,E)",
      "setSubmitShortcutOverride:e=>{D=e}",
      "handlePaste(e,t)",
      "handleDrop(e,t,n,r)",
      "clipboardTextSerializer(e)",
      "T.emit(`pasted-images`,a)",
      "T.emit(`pasted-files`,{files:i,dataTransfer:r})",
      "T.emit(`pasted-text`,{codeBlockLanguage:h,markdown:g,text:p==null?c:uG(p).content})",
      "T.emit(`pasted-link`,new cUu(c,l??``))",
      "transformPastedText:M.transformPastedText",
      "addPastedImagesHandler(e)",
      "removePastedImagesHandler(e)",
      "addPastedFilesHandler(e)",
      "removePastedFilesHandler(e)",
      "addPastedTextHandler(e)",
      "removePastedTextHandler(e)",
      "subscribePastedLink(e)",
    ],
  },
  {
    file: "use-chatgpt-composer-controller-2d447301fbc7.js",
    sha256: "e39ff89c1c226141bc5f0af4f6ca70cc09e98b26561ff28fd4ab4b17a9becbef",
    signatures: [
      "composerController:s,conversationId:c,draftKey:l,initialPrompt:u,initialPromptKind:d",
      "enableRichText:!0",
      "S=s??v()",
      "!w.view.isDestroyed&&w.destroy()",
    ],
  },
];

let failures = 0;
for (const check of checks) {
  const path = resolve(assetsDir, check.file);
  if (!existsSync(path)) {
    console.error(`MISSING ${path}`);
    failures++;
    continue;
  }
  const bytes = readFileSync(path);
  const sha = createHash("sha256").update(bytes).digest("hex");
  const text = bytes.toString("utf-8");
  const missing = check.signatures.filter((signature) => !text.includes(signature));
  const hashMatches = sha === check.sha256;
  if (!hashMatches) {
    console.error(`HASH MISMATCH ${check.file}: expected ${check.sha256}, got ${sha}`);
    failures++;
  }
  failures += missing.length;
  console.log(`${hashMatches && missing.length === 0 ? "PASS" : "FAIL"} ${check.file} ${sha} (${check.signatures.length - missing.length}/${check.signatures.length} signatures)`);
  for (const signature of missing) console.error(`  NOT FOUND ${signature}`);
}
if (failures) process.exit(1);
console.log("Composer source evidence verified. This confirms signatures for this build, not complete editor or UI parity.");
