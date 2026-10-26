/** Conservative Markdown-source to rendered-Find occurrence adapter.
 *
 * Original re/te indexes source search units, while Y highlights visible
 * [data-content-search-unit-key] DOM. The original private text walker and
 * Markdown-aware parser are not available to the independent frontend.
 *
 * Do NOT rewrite source match counts. Only map an existing literal source hit
 * to a rendered occurrence when supported link syntax makes that mapping
 * unambiguous. All other syntax continues through the current conservative
 * rendered-range-count guard in the host.
 */
interface SourceSpan {start:number;end:number}

function closingBracket(text:string, from:number):number {
  let nesting=1;
  for(let i=from;i<text.length;i++){
    if(text[i]==="\\"){i++;continue;}
    if(text[i]==="[")nesting++;
    else if(text[i]==="]" && --nesting===0)return i;
  }
  return -1;
}
function closingParenthesis(text:string, from:number):number {
  let nesting=1;
  for(let i=from;i<text.length;i++){
    if(text[i]==="\\"){i++;continue;}
    if(text[i]==="(")nesting++;
    else if(text[i]===")" && --nesting===0)return i;
  }
  return -1;
}
function skipBackticks(text:string,index:number):number {
  let end=index+1;
  while(text[end]==="`")end++;
  const marker=text.slice(index,end);
  const close=text.indexOf(marker,end);
  return close<0?end:close+marker.length;
}

/** Only handles inline [label](destination) / ![alt](destination);
 * balanced link destinations and backtick-escaped link-like literals.
 * Returns ranges to exclude from the rendered-text occurrence ordinal. */
export function sourceMarkdownNonRenderedLinkRanges(text:string):SourceSpan[] {
  const spans:SourceSpan[]=[];
  let fence:string|null=null;
  let lineStart=true;
  for(let i=0;i<text.length;){
    if(lineStart){
      const line=text.slice(i).match(/^[ \t]{0,3}(`{3,}|~{3,})/);
      if(line){
        const run=line[1]!;
        if(fence==null)fence=run;
        else if(run[0]===fence[0] && run.length>=fence.length)fence=null;
      }
      lineStart=false;
    }
    const ch=text[i];
    if(ch==="\n"){lineStart=true;i++;continue;}
    if(fence!=null){i++;continue;}
    if(ch==="\\"){i+=2;continue;}
    if(ch==="`"){i=skipBackticks(text,i);continue;}
    const image=ch==="!"&&text[i+1]==="[";
    if(ch!=="["&&!image){i++;continue;}
    const open=image?i+1:i;
    const close=closingBracket(text,open+1);
    if(close<0||text[close+1]!=="("){i++;continue;}
    const destinationEnd=closingParenthesis(text,close+2);
    if(destinationEnd<0){i++;continue;}
    // Link text is visible but the destination and punctuation are not.
    // Image alt is an accessibility attribute, not a visible DOM text node.
    if(image)spans.push({start:i,end:destinationEnd+1});
    else {
      spans.push({start:open,end:open+1});
      spans.push({start:close,end:destinationEnd+1});
    }
    i=destinationEnd+1;
  }
  return spans;
}
export interface SourceVisibleFindOrdinal {
  /** Zero-based DOM occurrence within the selected Markdown unit. */
  ordinal:number;
  /** Number of unambiguously visible raw-text occurrences in this unit. */
  visibleMatches:number;
}

/** Null means: not a real raw source hit, hidden link destination/image alt,
 * or another unsupported cross-syntax hit. Never highlight a different one. */
export function sourceMarkdownVisibleFindOrdinal(input:{
  text:string;query:string;offset:number;length:number;
}):SourceVisibleFindOrdinal|null {
  const {text,query,offset,length}=input;
  if(!query || !Number.isInteger(offset)||offset<0 ||
    length!==query.length || offset+length>text.length)return null;
  const needle=query.toLocaleLowerCase();
  if(text.slice(offset,offset+length).toLocaleLowerCase()!==needle)return null;
  const excluded=sourceMarkdownNonRenderedLinkRanges(text);
  const hidden=(start:number,end:number)=>
    excluded.some(span=>start<span.end&&end>span.start);
  const folded=text.toLocaleLowerCase();
  let ordinal=-1,visibleMatches=0;
  for(let cursor=0;cursor<=folded.length-needle.length;){
    const at=folded.indexOf(needle,cursor);
    if(at<0)break;
    const end=at+length;
    // Reject case folds that change UTF-16 offsets rather than guessing.
    if(text.slice(at,end).toLocaleLowerCase()===needle && !hidden(at,end)){
      if(at===offset)ordinal=visibleMatches;
      visibleMatches++;
    }
    cursor=at+Math.max(needle.length,1);
  }
  return ordinal<0?null:{ordinal,visibleMatches};
}
