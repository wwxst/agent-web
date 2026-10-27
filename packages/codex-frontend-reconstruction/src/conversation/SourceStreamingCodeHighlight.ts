import {
  highlightSourceCodeWithLezer,
  fallbackSourceCodeSegments,
  type SourceCodeHighlightSegment,
  type SourceCodeHighlightOutput,
} from "./SourceLezerCodeHighlight.js";

/** Compiled chatgpt-code-block Bt uses Lt=500ms for append-only streaming. */
export const SOURCE_STREAMING_CODE_HIGHLIGHT_DELAY_MS=500;

export interface SourceStreamingCodeHighlightSnapshot {
  /** Last *processed* code; the current input may have an unstyled tail. */
  code:string;
  language:string|null;
  highlightedSegments:readonly SourceCodeHighlightSegment[];
  highlighted:boolean;
  pending:boolean;
}
export interface SourceStreamingCodeHighlightVisible {
  segments:readonly SourceCodeHighlightSegment[];
  pending:boolean;
}
export interface SourceStreamingCodeHighlightController {
  getSnapshot():SourceStreamingCodeHighlightSnapshot;
  subscribe(listener:()=>void):()=>void;
  setInput(code:string,language:string|null,streaming:boolean):void;
  dispose():void;
}
export type SourceStreamingCodeHighlightScheduler={
  schedule(callback:()=>void,delay:number):unknown;
  cancel(handle:unknown):void;
};
const nativeScheduler:SourceStreamingCodeHighlightScheduler={
  schedule:(fn,delay)=>setTimeout(fn,delay),
  cancel:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>),
};
export type SourceStreamingCodeHighlightParser=(
  code:string,language:string|null,
)=>Promise<SourceCodeHighlightOutput>;

/** Original Ht keeps a highlighted prefix and appends raw pending text. */
export function projectSourceStreamingCodeHighlight(
  currentCode:string,
  state:SourceStreamingCodeHighlightSnapshot,
):SourceStreamingCodeHighlightVisible {
  const canReuse=currentCode.startsWith(state.code);
  const prefix=canReuse?state.highlightedSegments:[];
  const rawTail=canReuse?currentCode.slice(state.code.length):currentCode;
  const segments=[...prefix.map(p=>({...p}))];
  if(rawTail){
    const last=segments.at(-1);
    if(last?.className===null)last.text+=rawTail;
    else segments.push({text:rawTail,className:null});
  }
  return {segments,pending:state.pending||state.code!==currentCode};
}
function mergeSegment(
  output:SourceCodeHighlightSegment[],segment:SourceCodeHighlightSegment,
){
  if(!segment.text)return;
  const last=output.at(-1);
  if(last?.className===segment.className)last.text+=segment.text;
  else output.push({...segment});
}
/** Reuses the original prefix classification while taking fresh Lezer
 * suffix runs starting at the already-rendered UTF-16 source offset.
 * This mirrors the Bt+It streaming path, not full DOM replacement. */
function appendStyledSuffix(
  prefix:readonly SourceCodeHighlightSegment[],
  fresh:readonly SourceCodeHighlightSegment[],
  prefixLength:number,
):SourceCodeHighlightSegment[]{
  const output=prefix.map(part=>({...part}));
  let cursor=0;
  for(const segment of fresh){
    const end=cursor+segment.text.length;
    if(end>prefixLength){
      mergeSegment(output,{
        className:segment.className,
        text:segment.text.slice(Math.max(0,prefixLength-cursor)),
      });
    }
    cursor=end;
  }
  return output;
}

export function createSourceStreamingCodeHighlightController(options:{
  highlight?:SourceStreamingCodeHighlightParser;
  scheduler?:SourceStreamingCodeHighlightScheduler;
}={}):SourceStreamingCodeHighlightController {
  const parse=options.highlight??highlightSourceCodeWithLezer;
  const clock=options.scheduler??nativeScheduler;
  let snapshot:SourceStreamingCodeHighlightSnapshot={
    code:"",language:null,highlightedSegments:[],highlighted:false,pending:true,
  };
  let inputCode="",inputLanguage:string|null=null,streaming=false;
  let timer:unknown=null,disposed=false,revision=0;
  const listeners=new Set<()=>void>();
  const notify=()=>{for(const listener of [...listeners])listener();};
  const cancelTimer=()=>{
    if(timer!==null){clock.cancel(timer);timer=null;}
  };
  function publish(
    code:string,language:string|null,
    output:SourceCodeHighlightOutput,pending=false,
  ){
    snapshot={
      code,language,highlightedSegments:output.segments,
      highlighted:output.highlighted,pending,
    };
    notify();
  }
  function highlightNow(){
    cancelTimer();
    if(disposed)return;
    const code=inputCode,language=inputLanguage,request=++revision;
    const previous=snapshot;
    // Do not leave incorrect styled content when the raw code is replaced
    // or its language changes. Ht then draws a plain unparsed tail.
    void parse(code,language).then(result=>{
      if(disposed||request!==revision)return;
      const appendOnly=streaming&&previous.code.length>0&&
        previous.language===language&&code.startsWith(previous.code)&&
        result.highlighted&&previous.highlighted;
      const segments=appendOnly
        ? appendStyledSuffix(previous.highlightedSegments,result.segments,previous.code.length)
        : result.segments.map(part=>({...part}));
      // Source fallback/segment limits must not accidentally reuse stale
      // colored prefix when the complete new parser output is unstyled.
      publish(code,language,{
        segments:result.highlighted?segments:result.segments,
        highlighted:result.highlighted,
      });
    }).catch(()=>{
      if(disposed||request!==revision)return;
      publish(code,language,fallbackSourceCodeSegments(code));
    });
  }
  return {
    getSnapshot:()=>snapshot,
    subscribe(listener){
      if(disposed)return ()=>{};
      listeners.add(listener);
      return ()=>{
        listeners.delete(listener);
        if(listeners.size===0){
          cancelTimer();
          revision++;
        }
      };
    },
    setInput(code,language,isStreaming){
      if(disposed)return;
      const previousCode=inputCode,previousLanguage=inputLanguage;
      const wasStreaming=streaming;
      inputCode=code;inputLanguage=language;streaming=isStreaming;
      const changed=code!==previousCode||language!==previousLanguage;
      if(!changed&&wasStreaming===isStreaming)return;
      // Original Bt only schedules append-only streaming when a previous
      // processed prefix exists. Non-append edits, language changes and the
      // transition to completed status require immediate complete parsing.
      const appended=language===previousLanguage&&isStreaming&&
        code.startsWith(snapshot.code)&&snapshot.code.length>0&&
        code.startsWith(previousCode)&&code!==snapshot.code;
      if(!changed||!appended){
        revision++;
        highlightNow();
        return;
      }
      if(timer===null){
        timer=clock.schedule(()=>{
          timer=null;
          highlightNow();
        },SOURCE_STREAMING_CODE_HIGHLIGHT_DELAY_MS);
      }
    },
    dispose(){
      if(disposed)return;
      disposed=true;revision++;cancelTimer();listeners.clear();
    },
  };
}
