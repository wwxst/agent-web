import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {compareScreenshots,parseArgs,readPngDimensions} from "./compare-ui-screenshots.mjs";

const WHITE_PNG="iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8////fwYGBgYmBigAAD34BADaOyqcAAAAAElFTkSuQmCC";
const RED_PNG="iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAk+Uzr4AAAAASUVORK5CYII=";

test("same-size screenshots produce overlay, heatmap, side-by-side and metrics",{
  timeout:30000,
},async()=>{
  const directory=await mkdtemp(join(tmpdir(),"codex-visual-compare-"));
  try{
    const referencePath=resolve(directory,"reference.png");
    const actualPath=resolve(directory,"actual.png");
    const outputDir=resolve(directory,"comparison");
    const referenceMetaPath=resolve(directory,"reference.png.json");
    const actualMetaPath=resolve(directory,"actual.png.json");
    const captureMeta={
      schemaVersion:1,scenarioId:"A-shell-empty",theme:"light",
      captureBoundary:"dwm-extended-frame-bounds",
      width:2,height:2,windowDpi:96,windowScaleFactor:1,
      visibleBounds:{x:100,y:80,width:2,height:2},
    };
    await Promise.all([
      writeFile(referencePath,Buffer.from(WHITE_PNG,"base64")),
      writeFile(actualPath,Buffer.from(RED_PNG,"base64")),
      writeFile(referenceMetaPath,JSON.stringify(captureMeta)),
      writeFile(actualMetaPath,JSON.stringify(captureMeta)),
    ]);
    const result=await compareScreenshots({
      referencePath,actualPath,referenceMetaPath,actualMetaPath,outputDir,threshold:24,
    });
    assert.equal(result.exitCode,0);
    assert.equal(result.report.status,"compared");
    assert.equal(result.report.captureMetadata.validation.ok,true);
    assert.equal(result.report.captureMetadata.reference.scenarioId,"A-shell-empty");
    assert.deepEqual(
      {width:result.report.metrics.width,height:result.report.metrics.height},
      {width:2,height:2},
    );
    assert.equal(result.report.metrics.totalPixels,4);
    assert.equal(result.report.metrics.changedPixels,4);
    assert.equal(result.report.metrics.changedPixelRatio,1);
    assert.ok(result.report.metrics.meanAbsoluteError>0);
    for(const name of ["overlay.png","difference.png","side-by-side.png"]){
      const bytes=await readFile(join(outputDir,name));
      assert.deepEqual(readPngDimensions(bytes),{
        width:name==="side-by-side.png"?4:2,height:2,
      });
    }
    const report=JSON.parse(await readFile(join(outputDir,"report.json"),"utf8"));
    assert.equal(report.metrics.changedPixels,4);
  }finally{
    await rm(directory,{recursive:true,force:true});
  }
});


test("metadata mismatch fails closed before creating pixel comparison outputs",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"codex-visual-meta-"));
  try{
    const referencePath=resolve(directory,"reference.png");
    const actualPath=resolve(directory,"actual.png");
    const referenceMetaPath=resolve(directory,"reference.json");
    const actualMetaPath=resolve(directory,"actual.json");
    const outputDir=resolve(directory,"comparison");
    const base={
      schemaVersion:1,scenarioId:"A-shell-empty",theme:"light",
      captureBoundary:"dwm-extended-frame-bounds",
      width:2,height:2,windowDpi:96,windowScaleFactor:1,
      visibleBounds:{x:100,y:80,width:2,height:2},
    };
    await Promise.all([
      writeFile(referencePath,Buffer.from(WHITE_PNG,"base64")),
      writeFile(actualPath,Buffer.from(RED_PNG,"base64")),
      writeFile(referenceMetaPath,JSON.stringify(base)),
      writeFile(actualMetaPath,JSON.stringify({...base,scenarioId:"B-transcript"})),
    ]);
    const result=await compareScreenshots({
      referencePath,actualPath,referenceMetaPath,actualMetaPath,outputDir,
    });
    assert.equal(result.exitCode,3);
    assert.equal(result.report.status,"metadata-mismatch");
    assert.ok(result.report.captureMetadata.validation.errors.some(error=>error.includes("scenarioId")));
    await assert.rejects(readFile(join(outputDir,"overlay.png")));
    assert.equal(JSON.parse(await readFile(join(outputDir,"report.json"),"utf8")).status,
      "metadata-mismatch");
  }finally{
    await rm(directory,{recursive:true,force:true});
  }
});

test("CLI metadata arguments must be supplied as a pair",()=>{
  assert.throws(()=>parseArgs([
    "--reference","original.png","--actual","reconstructed.png",
    "--reference-meta","original.png.json",
  ]),/must be supplied together/);
});
