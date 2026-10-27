import {HighlightStyle} from "@codemirror/language";
import {highlightTree, tags} from "@lezer/highlight";

/**
 * The original chatgpt-code-block Vt/Bt uses @lezer/highlight with a
 * source-defined class map, lazily-loaded parser and hard safety caps.
 * This independent viewer uses the same public Lezer grammar/highlighter
 * contracts without copying any proprietary compiled assets.
 *
 * Private source streaming scheduling, off-main-thread parsing and
 * CodeMirror editor state are not reproduced by this static viewer.
 */
export const SOURCE_CODE_HIGHLIGHT_MAX_CHARS=65_536;
export const SOURCE_CODE_HIGHLIGHT_MAX_SEGMENTS=10_000;

export interface SourceCodeHighlightSegment {
  className:string|null;
  text:string;
}
export interface SourceCodeHighlightOutput {
  segments:readonly SourceCodeHighlightSegment[];
  /** True only when a real Lezer parser supplied styled text. */
  highlighted:boolean;
}

const originalTagStyle=HighlightStyle.define([
  {tag:tags.comment,class:"text-codex-syntax-comment"},
  {tag:tags.meta,class:"text-codex-syntax-name"},
  {tag:[tags.keyword,tags.definitionKeyword,tags.modifier,tags.operator],
   class:"text-codex-syntax-keyword"},
  {tag:[tags.heading,tags.contentSeparator],class:"text-codex-syntax-attribute"},
  {tag:tags.deleted,class:"text-codex-syntax-error"},
  {tag:[tags.bool,tags.null,tags.atom,tags.self,tags.number],
   class:"text-codex-syntax-literal"},
  {tag:[tags.string,tags.regexp,tags.special(tags.string)],
   class:"text-codex-syntax-string"},
  {tag:[tags.standard(tags.variableName),tags.standard(tags.propertyName),tags.className],
   class:"text-codex-syntax-literal"},
  {tag:[tags.variableName,tags.special(tags.variableName),tags.typeName,
    tags.function(tags.variableName),tags.definition(tags.variableName)],
   class:"text-codex-syntax-variable"},
  {tag:tags.attributeName,class:"text-codex-syntax-attribute"},
  {tag:[tags.labelName,tags.tagName,tags.definition(tags.tagName),tags.angleBracket],
   class:"text-codex-syntax-name"},
  {tag:[tags.link,tags.url],class:"text-codex-syntax-name underline"},
  {tag:[tags.invalid,tags.escape],class:"text-codex-syntax-error underline"},
]);

export type SourceCodeHighlightLanguage="javascript"|"typescript"|"css"|"html"|"python";

/** Source languages and common aliases. Others intentionally fall back
 * to the actual raw code instead of showing unreliable guessed tokens. */
export function resolveSourceCodeHighlightLanguage(
  value:string|null|undefined,
):SourceCodeHighlightLanguage|null {
  const language=value?.trim().toLowerCase();
  switch(language){
    case "javascript":case "js":case "jsx":case "mjs":case "cjs":return "javascript";
    case "typescript":case "ts":case "tsx":return "typescript";
    case "css":return "css";
    case "html":case "htm":return "html";
    case "python":case "py":return "python";
    default:return null;
  }
}

async function loadLanguageParser(language:SourceCodeHighlightLanguage){
  switch(language){
    case "javascript":{
      const {javascript}=await import("@codemirror/lang-javascript");
      return javascript({jsx:true}).language.parser;
    }
    case "typescript":{
      const {javascript}=await import("@codemirror/lang-javascript");
      return javascript({typescript:true,jsx:true}).language.parser;
    }
    case "css":{
      const {css}=await import("@codemirror/lang-css");
      return css().language.parser;
    }
    case "html":{
      const {html}=await import("@codemirror/lang-html");
      return html().language.parser;
    }
    case "python":{
      const {python}=await import("@codemirror/lang-python");
      return python().language.parser;
    }
  }
}
const parserCache=new Map<SourceCodeHighlightLanguage,ReturnType<typeof loadLanguageParser>>();
function parserFor(language:SourceCodeHighlightLanguage){
  const known=parserCache.get(language);
  if(known!=null)return known;
  const pending=loadLanguageParser(language);
  parserCache.set(language,pending);
  return pending;
}

export function fallbackSourceCodeSegments(code:string):SourceCodeHighlightOutput {
  return {segments:code?[{className:null,text:code}]:[],highlighted:false};
}
function pushSegment(parts:SourceCodeHighlightSegment[],className:string|null,text:string){
  if(!text)return;
  const previous=parts.at(-1);
  if(previous?.className===className){previous.text+=text;return;}
  parts.push({className,text});
}

/**
 * Source Vt/It: coalesce adjacent equal-class pieces from highlightTree.
 * No serialized HTML, no dangerous innerHTML and no regex-token substitute.
 */
export async function highlightSourceCodeWithLezer(
  code:string,
  language:string|null|undefined,
):Promise<SourceCodeHighlightOutput>{
  const kind=resolveSourceCodeHighlightLanguage(language);
  if(kind==null||code.length>SOURCE_CODE_HIGHLIGHT_MAX_CHARS)
    return fallbackSourceCodeSegments(code);
  try{
    const parser=await parserFor(kind);
    const tree=parser.parse(code);
    const segments:SourceCodeHighlightSegment[]=[];
    let cursor=0;
    let exceeded=false;
    highlightTree(tree,originalTagStyle,(from,to,className)=>{
      if(exceeded)return;
      if(from>cursor)pushSegment(segments,null,code.slice(cursor,from));
      if(to>from)pushSegment(segments,className||null,code.slice(from,to));
      cursor=Math.max(cursor,to);
      if(segments.length>SOURCE_CODE_HIGHLIGHT_MAX_SEGMENTS)exceeded=true;
    });
    if(exceeded)return fallbackSourceCodeSegments(code);
    if(cursor<code.length)pushSegment(segments,null,code.slice(cursor));
    if(segments.length>SOURCE_CODE_HIGHLIGHT_MAX_SEGMENTS)
      return fallbackSourceCodeSegments(code);
    // Rendering and clipboard use the same immutable input even if an
    // unsupported parser mode returns unhighlighted sections.
    if(segments.map(part=>part.text).join("")!==code)
      return fallbackSourceCodeSegments(code);
    return {segments,highlighted:segments.some(part=>part.className!=null)};
  }catch{
    // Bad grammar/network chunk error must never blank a conversation row.
    return fallbackSourceCodeSegments(code);
  }
}
