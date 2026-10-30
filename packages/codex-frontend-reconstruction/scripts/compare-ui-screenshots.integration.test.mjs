import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {compareScreenshots,readPngDimensions} from "./compare-ui-screenshots.mjs";

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
    await Promise.all([
      writeFile(referencePath,Buffer.from(WHITE_PNG,"base64")),
      writeFile(actualPath,Buffer.from(RED_PNG,"base64")),
    ]);
    const result=await compareScreenshots({referencePath,actualPath,outputDir,threshold:24});
    assert.equal(result.exitCode,0);
    assert.equal(result.report.status,"compared");
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
