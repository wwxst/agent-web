import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {
  compareScreenshots,parseArgs,readPngDimensions,sha256,
} from "../scripts/compare-ui-screenshots.mjs";

function pngHeader(width,height){
  const bytes=Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes,0);
  bytes.writeUInt32BE(13,8);
  bytes.write("IHDR",12,"ascii");
  bytes.writeUInt32BE(width,16);
  bytes.writeUInt32BE(height,20);
  return bytes;
}

test("reads PNG dimensions from the IHDR without resampling",()=>{
  assert.deepEqual(readPngDimensions(pngHeader(1211,759)),{width:1211,height:759});
  assert.deepEqual(readPngDimensions(pngHeader(1352,760)),{width:1352,height:760});
});

test("rejects non-PNG inputs before attempting browser decoding",()=>{
  assert.throws(()=>readPngDimensions(Buffer.from("not a png")),/valid PNG/);
});

test("hashes screenshot bytes deterministically",()=>{
  const bytes=pngHeader(10,20);
  assert.equal(sha256(bytes),sha256(Buffer.from(bytes)));
  assert.equal(sha256(bytes).length,64);
});

test("requires reference and actual paths and bounds the diff threshold",()=>{
  assert.throws(()=>parseArgs([]),/--reference and --actual are required/);
  assert.throws(()=>parseArgs(["--reference","a.png","--actual","b.png","--threshold","256"]),/0 to 255/);
  assert.deepEqual(parseArgs(["--help"]),{help:true});
});

test("dimension mismatch writes a diagnostic report and never rescales either screenshot",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"codex-visual-diff-"));
  try{
    const referencePath=resolve(directory,"original.png");
    const actualPath=resolve(directory,"reconstructed.png");
    const outputDir=resolve(directory,"out");
    await Promise.all([
      writeFile(referencePath,pngHeader(1211,759)),
      writeFile(actualPath,pngHeader(1352,760)),
    ]);
    const result=await compareScreenshots({referencePath,actualPath,outputDir});
    assert.equal(result.exitCode,2);
    assert.equal(result.report.status,"dimension-mismatch");
    assert.deepEqual(
      {width:result.report.reference.width,height:result.report.reference.height},
      {width:1211,height:759},
    );
    assert.deepEqual(
      {width:result.report.actual.width,height:result.report.actual.height},
      {width:1352,height:760},
    );
    assert.match(result.report.reason,/No scaling or cropping/);
    const saved=JSON.parse(await readFile(join(outputDir,"report.json"),"utf8"));
    assert.equal(saved.status,"dimension-mismatch");
    assert.equal(saved.reference.sha256,sha256(pngHeader(1211,759)));
    await assert.rejects(readFile(join(outputDir,"overlay.png")));
  }finally{
    await rm(directory,{recursive:true,force:true});
  }
});
