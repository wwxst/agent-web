/**
 * Recovered protocol of regex-search.worker-93adb92b59ce.js.
 *
 * Source-only worker computation: RegExp(query, "giu"), first maxMatches
 * ranges across ordered texts, full totalMatches, invalid-regex, skip empty
 * matches. Math spans expand source LaTeX macro arguments and overlap groups.
 *
 * A potentially expensive user regex MUST execute in a disposable Web Worker
 * with a host timeout. Never call this synchronously from the mounted renderer.
 */
export interface SourceRegexOffset {start:number;end:number}
export interface SourceRegexWorkerRequest {
  texts:readonly string[];
  query:string;
  maxMatches:number;
  mathTexts?:readonly boolean[]|undefined;
}
export interface SourceRegexWorkerResponse {
  offsets:SourceRegexOffset[][];
  totalMatches:number;
  error?:"invalid-regex"|undefined;
}
const TWO_ARGUMENTS=/^\\(?:[dt]?frac|binom|overset|underset)$/;
const ONE_ARGUMENT=/^\\(?:sqrt|mathbf|boldsymbol|bm|mathrm|mathit|mathsf|mathtt|mathcal|mathbb|mathfrak|mathnormal|mathscr|operatorname|text|textrm|textbf|textit|vec|hat|widehat|bar|overline|underline|tilde|widetilde|dot|ddot)$/;

export function expandSourceMathRegexRange(text:string,match:SourceRegexOffset):SourceRegexOffset {
  let start=match.start,end=match.end;
  const commands=[...text.matchAll(/\\(?:[a-zA-Z]+|[^])|[{}]/g)]
    .map(token=>({value:token[0],start:token.index,end:token.index+token[0].length}));
  const braces:SourceRegexOffset[]=[];
  const stack:number[]=[];
  for(const token of commands){
    if(token.value.startsWith("\\")&&token.start<end&&token.end>start){
      start=Math.min(start,token.start);
      end=Math.max(end,token.end);
    } else if(token.value==="{")stack.push(token.start);
    else if(token.value==="}"){
      const opened=stack.pop();
      if(opened!=null)braces.push({start:opened,end:token.end});
    }
  }
  for(const token of commands){
    if(!token.value.startsWith("\\")||token.start>=end||token.end<=start)continue;
    let cursor=token.end;
    let args=TWO_ARGUMENTS.test(token.value)?2:ONE_ARGUMENT.test(token.value)?1:0;
    if(token.value==="\\sqrt"&&text[cursor]==="["){
      const close=text.indexOf("]",cursor);
      if(close>=0)cursor=close+1;
    }
    for(;args>0;args--){
      while(/\s/.test(text[cursor]??"")&&cursor<text.length)cursor++;
      const bracket=braces.find(candidate=>candidate.start===cursor);
      if(bracket!=null)cursor=bracket.end;
      else {
        const atom=text.slice(cursor).match(/^(?:\\[a-zA-Z]+|\\[^]|[^])/u)?.[0];
        cursor+=atom?.length??0;
      }
    }
    end=Math.max(end,cursor);
  }
  for(const group of braces){
    if((start<=group.start&&end>group.start&&end<group.end)||
       (start>group.start&&start<group.end&&end>=group.end)){
      start=Math.min(start,group.start);
      end=Math.max(end,group.end);
    }
  }
  return{start,end};
}

/** Pure protocol implementation. Call inside a worker, not on the UI thread. */
export function runSourceRegexWorkerRequest(request:SourceRegexWorkerRequest):SourceRegexWorkerResponse {
  let regex:RegExp;
  try{regex=new RegExp(request.query,"giu");}
  catch{return{offsets:[],totalMatches:0,error:"invalid-regex"};}
  let totalMatches=0;
  let remaining=Number.isInteger(request.maxMatches)?Math.max(0,request.maxMatches):0;
  const offsets=request.texts.map((text,index)=>{
    regex.lastIndex=0;
    const captured:SourceRegexOffset[]=[];
    const mathRanges:SourceRegexOffset[]=[];
    const record=(range:SourceRegexOffset)=>{
      totalMatches++;
      if(remaining>0){captured.push(range);remaining--;}
    };
    for(const match of text.matchAll(regex)){
      if(match[0].length===0)continue;
      const candidate={start:match.index,end:match.index+match[0].length};
      if(request.mathTexts?.[index])mathRanges.push(expandSourceMathRegexRange(text,candidate));
      else record(candidate);
    }
    // Expanded math matches can overlap: source collapses them to one range.
    if(mathRanges.length>0){
      mathRanges.sort((a,b)=>a.start-b.start);
      let prior:SourceRegexOffset|undefined;
      for(const range of mathRanges){
        if(prior!=null&&range.start<prior.end)prior.end=Math.max(prior.end,range.end);
        else{
          if(prior!=null)record(prior);
          prior={...range};
        }
      }
      if(prior!=null)record(prior);
    }
    return captured;
  });
  return {offsets,totalMatches};
}
