"use strict";

const SOURCE_EXTENSIONS=new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs"]);
const LOCATION_KINDS=new Set([
  "definition","typeDefinition","implementation","references",
]);
const MAX_RESULTS=1000;

function languageIdForPath(filename,path){
  const extension=path.extname(filename).toLowerCase();
  switch(extension){
    case ".ts":return "typescript";
    case ".tsx":return "typescriptreact";
    case ".js":case ".mjs":case ".cjs":return "javascript";
    case ".jsx":return "javascriptreact";
    default:return null;
  }
}
function isSourceFile(filename,path){
  return SOURCE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}
function isWithin(root,candidate,path){
  const relative=path.relative(root,candidate);
  return relative===""||(!path.isAbsolute(relative)&&relative!==".."&&
    !relative.startsWith(".."+path.sep));
}
function createWorkspaceTypeScriptLanguageService({
  root,files,typescript,path,platform=process.platform,
}){
  if(typeof root!=="string"||!path||typeof path.resolve!=="function"||
    !(files instanceof Map))throw new TypeError("WORKSPACE_LANGUAGE_SERVICE_INVALID_INPUT");
  const ts=typescript??require("typescript");
  const caseSensitive=platform!=="win32";
  const canonicalKey=filename=>{
    const absolute=path.resolve(filename);
    return caseSensitive?absolute:absolute.toLowerCase();
  };
  const fileRecords=new Map();
  for(const [filename,text] of files){
    if(typeof filename!=="string"||typeof text!=="string")continue;
    const absolute=path.resolve(filename);
    if(!isWithin(root,absolute,path))continue;
    fileRecords.set(canonicalKey(absolute),{path:absolute,text});
  }
  const scriptFiles=[...fileRecords.values()]
    .filter(record=>isSourceFile(record.path,path))
    .map(record=>record.path);
  const options={
    allowJs:true,
    checkJs:false,
    noEmit:true,
    skipLibCheck:true,
    target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.ESNext,
    moduleResolution:ts.ModuleResolutionKind.Bundler,
    jsx:ts.JsxEmit.Preserve,
    allowImportingTsExtensions:true,
    resolveJsonModule:false,
    types:[],
  };
  const libDirectory=path.resolve(path.dirname(ts.getDefaultLibFilePath(options)));
  const libKey=canonicalKey(libDirectory);
  const isTypeScriptLibraryFile=filename=>{
    const absolute=path.resolve(filename);
    const relative=path.relative(libDirectory,absolute);
    return relative!==""&&!path.isAbsolute(relative)&&relative!==".."&&
      !relative.startsWith(".."+path.sep);
  };
  const workspaceDirectoryExists=directory=>{
    const absolute=path.resolve(directory);
    if(absolute===path.resolve(root))return true;
    for(const record of fileRecords.values()){
      if(isWithin(absolute,record.path,path))return true;
    }
    return false;
  };
  const host={
    getScriptFileNames:()=>scriptFiles,
    getScriptVersion:()=> "0",
    getProjectVersion:()=> "1",
    getScriptSnapshot(filename){
      const record=fileRecords.get(canonicalKey(filename));
      if(record!=null)return ts.ScriptSnapshot.fromString(record.text);
      if(isTypeScriptLibraryFile(filename)){
        const text=ts.sys.readFile(filename);
        return text===undefined?undefined:ts.ScriptSnapshot.fromString(text);
      }
      return undefined;
    },
    getCurrentDirectory:()=>path.resolve(root),
    getCompilationSettings:()=>options,
    getDefaultLibFileName:compilerOptions=>ts.getDefaultLibFilePath(compilerOptions),
    fileExists(filename){
      return fileRecords.has(canonicalKey(filename))||
        (isTypeScriptLibraryFile(filename)&&ts.sys.fileExists(filename));
    },
    readFile(filename){
      const record=fileRecords.get(canonicalKey(filename));
      if(record!=null)return record.text;
      return isTypeScriptLibraryFile(filename)?ts.sys.readFile(filename):undefined;
    },
    readDirectory(directory,extensions,excludes,includes,depth){
      const base=path.resolve(directory);
      return [...fileRecords.values()].filter(record=>{
        if(!isWithin(base,record.path,path))return false;
        const relative=path.relative(base,record.path);
        if(depth!=null&&relative.split(path.sep).length-1>depth)return false;
        if(Array.isArray(extensions)&&extensions.length>0&&
          !extensions.some(extension=>record.path.toLowerCase().endsWith(extension.toLowerCase())))
          return false;
        return true;
      }).map(record=>record.path);
    },
    directoryExists(directory){
      return workspaceDirectoryExists(directory)||isWithin(libDirectory,path.resolve(directory),path);
    },
    getDirectories(directory){
      const base=path.resolve(directory);
      const children=new Set();
      for(const record of fileRecords.values()){
        const relative=path.relative(base,record.path);
        if(relative===""||path.isAbsolute(relative)||relative===".."||
          relative.startsWith(".."+path.sep))continue;
        const first=relative.split(path.sep)[0];
        if(first!==relative)children.add(path.join(base,first));
      }
      return [...children];
    },
    realpath(filename){
      const record=fileRecords.get(canonicalKey(filename));
      if(record!=null)return record.path;
      if(isTypeScriptLibraryFile(filename))return ts.sys.realpath?.(filename)??path.resolve(filename);
      return path.resolve(filename);
    },
    useCaseSensitiveFileNames:()=>caseSensitive,
    getNewLine:()=> "\n",
  };
  const languageService=ts.createLanguageService(
    host,ts.createDocumentRegistry(caseSensitive,path.resolve(root)),
  );
  const capabilities=Object.freeze({
    hover:false,
    locationKinds:Object.freeze(["definition","typeDefinition","implementation","references"]),
  });
  function sourceLocation(fileName,textSpan){
    if(typeof fileName!=="string"||textSpan==null||
      !Number.isSafeInteger(textSpan.start)||textSpan.start<0||
      !Number.isSafeInteger(textSpan.length)||textSpan.length<0)return null;
    const record=fileRecords.get(canonicalKey(fileName));
    if(record==null||!isWithin(root,record.path,path)||!isSourceFile(record.path,path))return null;
    const sourceFile=languageService.getProgram()?.getSourceFile(record.path);
    if(sourceFile==null)return null;
    try{
      const start=sourceFile.getLineAndCharacterOfPosition(textSpan.start);
      const end=sourceFile.getLineAndCharacterOfPosition(
        Math.min(sourceFile.end,textSpan.start+textSpan.length));
      return {path:record.path,range:{
        start:{line:start.line,character:start.character},
        end:{line:end.line,character:end.character},
      }};
    }catch{return null;}
  }
  function locations({filename,kind,position}){
    if(!LOCATION_KINDS.has(kind)||position==null||
      !Number.isSafeInteger(position.line)||position.line<0||
      !Number.isSafeInteger(position.character)||position.character<0)return [];
    const record=fileRecords.get(canonicalKey(filename));
    if(record==null||!isSourceFile(record.path,path))return [];
    const program=languageService.getProgram();
    const sourceFile=program?.getSourceFile(record.path);
    if(sourceFile==null)return [];
    let offset;
    try{offset=sourceFile.getPositionOfLineAndCharacter(position.line,position.character);}
    catch{return [];}
    let entries;
    try{
      switch(kind){
        case "definition":entries=languageService.getDefinitionAtPosition(record.path,offset);break;
        case "typeDefinition":entries=languageService.getTypeDefinitionAtPosition(record.path,offset);break;
        case "implementation":entries=languageService.getImplementationAtPosition(record.path,offset);break;
        case "references":entries=languageService.getReferencesAtPosition(record.path,offset);break;
      }
    }catch{return [];}
    const result=[],seen=new Set();
    for(const entry of entries??[]){
      const location=sourceLocation(entry.fileName,entry.textSpan);
      if(location==null)continue;
      const key=canonicalKey(location.path)+":"+location.range.start.line+":"+
        location.range.start.character;
      if(seen.has(key))continue;
      seen.add(key);result.push(location);
      if(result.length>=MAX_RESULTS)break;
    }
    return result;
  }
  return {
    capabilities,
    locations,
    dispose(){languageService.dispose();},
    get indexedSourceFileCount(){return scriptFiles.length;},
    get indexedFileCount(){return fileRecords.size;},
    get indexedTextBytes(){
      let total=0;
      for(const record of fileRecords.values())total+=Buffer.byteLength(record.text,"utf8");
      return total;
    },
  };
}
module.exports={
  SOURCE_EXTENSIONS,LOCATION_KINDS,MAX_RESULTS,languageIdForPath,
  isSourceFile,createWorkspaceTypeScriptLanguageService,
};
