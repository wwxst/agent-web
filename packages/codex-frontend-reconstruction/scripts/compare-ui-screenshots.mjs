#!/usr/bin/env node
import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {chromium} from "playwright";

const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);

export function readPngDimensions(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<24||
    !bytes.subarray(0,8).equals(PNG_SIGNATURE)||
    bytes.toString("ascii",12,16)!=="IHDR"){
    throw new Error("Expected a valid PNG file with an IHDR header.");
  }
  const width=bytes.readUInt32BE(16);
  const height=bytes.readUInt32BE(20);
  if(width<1||height<1)throw new Error("PNG dimensions must be positive.");
  return {width,height};
}

export function sha256(bytes){
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseArgs(argv){
  const values={};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--help"||arg==="-h")return {help:true};
    if(!["--reference","--actual","--out-dir","--threshold"].includes(arg)){
      throw new Error(`Unknown argument: ${arg}`);
    }
    const value=argv[++i];
    if(value==null||value.startsWith("--"))throw new Error(`Missing value for ${arg}`);
    values[arg]=value;
  }
  if(!values["--reference"]||!values["--actual"]){
    throw new Error("--reference and --actual are required.");
  }
  const threshold=values["--threshold"]==null?24:Number(values["--threshold"]);
  if(!Number.isInteger(threshold)||threshold<0||threshold>255){
    throw new Error("--threshold must be an integer from 0 to 255.");
  }
  return {
    help:false,
    referencePath:resolve(values["--reference"]),
    actualPath:resolve(values["--actual"]),
    outputDir:resolve(values["--out-dir"]??"visual-comparison-output"),
    threshold,
  };
}

function imageMeta(filePath,bytes){
  const {width,height}=readPngDimensions(bytes);
  return {path:filePath,width,height,bytes:bytes.length,sha256:sha256(bytes)};
}

export async function compareScreenshots({
  referencePath,actualPath,outputDir,threshold=24,
}){
  if(!Number.isInteger(threshold)||threshold<0||threshold>255){
    throw new Error("threshold must be an integer from 0 to 255.");
  }
  const referenceBytes=await readFile(referencePath);
  const actualBytes=await readFile(actualPath);
  const reference=imageMeta(referencePath,referenceBytes);
  const actual=imageMeta(actualPath,actualBytes);
  await mkdir(outputDir,{recursive:true});

  if(reference.width!==actual.width||reference.height!==actual.height){
    const report={
      schemaVersion:1,status:"dimension-mismatch",
      reason:"Reference and actual screenshots must have identical pixel dimensions. No scaling or cropping was applied.",
      reference,actual,threshold,
      nextAction:"Capture both applications at the same window size, display scale, and device-pixel ratio, then compare again.",
    };
    await writeFile(resolve(outputDir,"report.json"),JSON.stringify(report,null,2)+"\n");
    return {exitCode:2,report};
  }

  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:reference.width,height:reference.height}});
    await page.setContent("<!doctype html><html><body style='margin:0'><canvas id='work'></canvas></body></html>");
    const rendered=await page.evaluate(async({referenceData,actualData,width,height,threshold})=>{
      const load=async(data)=>{
        const image=new Image();
        image.src="data:image/png;base64,"+data;
        await image.decode();
        return image;
      };
      const [referenceImage,actualImage]=await Promise.all([
        load(referenceData),load(actualData),
      ]);
      const canvas=document.querySelector("#work");
      const context=canvas.getContext("2d",{willReadFrequently:true});
      canvas.width=width;canvas.height=height;
      context.drawImage(referenceImage,0,0);
      const referencePixels=context.getImageData(0,0,width,height);
      context.clearRect(0,0,width,height);
      context.drawImage(actualImage,0,0);
      const actualPixels=context.getImageData(0,0,width,height);
      const diff=context.createImageData(width,height);
      let changedPixels=0,totalAbsoluteDifference=0,maxChannelDifference=0;
      for(let offset=0;offset<referencePixels.data.length;offset+=4){
        const dr=Math.abs(referencePixels.data[offset]-actualPixels.data[offset]);
        const dg=Math.abs(referencePixels.data[offset+1]-actualPixels.data[offset+1]);
        const db=Math.abs(referencePixels.data[offset+2]-actualPixels.data[offset+2]);
        const delta=Math.max(dr,dg,db);
        totalAbsoluteDifference+=dr+dg+db;
        if(delta>maxChannelDifference)maxChannelDifference=delta;
        if(delta>threshold){
          changedPixels++;
          diff.data[offset]=255;diff.data[offset+1]=35;diff.data[offset+2]=65;
          diff.data[offset+3]=255;
        }else{
          diff.data[offset]=248;diff.data[offset+1]=248;diff.data[offset+2]=248;
          diff.data[offset+3]=255;
        }
      }
      const toPng=(target)=>{
        const output=document.createElement("canvas");
        output.width=target.width;output.height=target.height;
        output.getContext("2d").drawImage(target,0,0);
        return output.toDataURL("image/png").slice("data:image/png;base64,".length);
      };
      const diffCanvas=document.createElement("canvas");
      diffCanvas.width=width;diffCanvas.height=height;
      diffCanvas.getContext("2d").putImageData(diff,0,0);

      const overlay=document.createElement("canvas");
      overlay.width=width;overlay.height=height;
      const overlayContext=overlay.getContext("2d");
      overlayContext.globalAlpha=.5;overlayContext.drawImage(referenceImage,0,0);
      overlayContext.globalAlpha=.5;overlayContext.drawImage(actualImage,0,0);
      overlayContext.globalAlpha=1;

      const side=document.createElement("canvas");
      side.width=width*2;side.height=height;
      const sideContext=side.getContext("2d");
      sideContext.drawImage(referenceImage,0,0);
      sideContext.drawImage(actualImage,width,0);

      const totalPixels=width*height;
      return {
        metrics:{
          width,height,threshold,totalPixels,changedPixels,
          changedPixelRatio:changedPixels/totalPixels,
          changedPixelPercent:changedPixels/totalPixels*100,
          meanAbsoluteError:totalAbsoluteDifference/(totalPixels*3),
          maxChannelDifference,
        },
        overlay:toPng(overlay),difference:toPng(diffCanvas),sideBySide:toPng(side),
      };
    },{
      referenceData:referenceBytes.toString("base64"),
      actualData:actualBytes.toString("base64"),
      width:reference.width,height:reference.height,threshold,
    });
    const outputFiles={
      overlay:resolve(outputDir,"overlay.png"),
      difference:resolve(outputDir,"difference.png"),
      sideBySide:resolve(outputDir,"side-by-side.png"),
      report:resolve(outputDir,"report.json"),
    };
    await Promise.all([
      writeFile(outputFiles.overlay,Buffer.from(rendered.overlay,"base64")),
      writeFile(outputFiles.difference,Buffer.from(rendered.difference,"base64")),
      writeFile(outputFiles.sideBySide,Buffer.from(rendered.sideBySide,"base64")),
    ]);
    const report={
      schemaVersion:1,status:"compared",
      reference,actual,metrics:rendered.metrics,
      outputs:outputFiles,
      notes:[
        "Pixel comparison is meaningful only when both captures show the same scenario, content, theme, window bounds, display scale, and device-pixel ratio.",
        "Changed-pixel percentage is a diagnostic metric, not an automatic visual acceptance score.",
        "The diff marks pixels whose maximum RGB-channel difference exceeds the configured threshold.",
      ],
    };
    await writeFile(outputFiles.report,JSON.stringify(report,null,2)+"\n");
    return {exitCode:0,report};
  }finally{
    await browser.close();
  }
}

function usage(){
  return [
    "Compare two same-size Codex UI PNG screenshots without resizing either image.",
    "",
    "Usage:",
    "  npm run visual:compare -- --reference <original.png> --actual <reconstructed.png> [--out-dir <dir>] [--threshold 24]",
    "",
    "Outputs: overlay.png, difference.png, side-by-side.png, report.json.",
    "Different dimensions produce report.json and exit code 2; capture both windows at the same size instead of accepting a misleading scaled diff.",
  ].join("\n");
}

async function main(){
  let args;
  try{args=parseArgs(process.argv.slice(2));}
  catch(error){console.error(error.message+"\n\n"+usage());process.exitCode=1;return;}
  if(args.help){console.log(usage());return;}
  try{
    const result=await compareScreenshots(args);
    console.log(JSON.stringify(result.report,null,2));
    if(result.exitCode!==0)process.exitCode=result.exitCode;
  }catch(error){
    console.error(error instanceof Error?error.stack:String(error));
    process.exitCode=1;
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  await main();
}
