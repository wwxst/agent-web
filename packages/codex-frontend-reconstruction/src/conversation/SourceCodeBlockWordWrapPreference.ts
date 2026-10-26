/** Original code snippet Jrd / ChatGptCodeBlock Fn reads a shared
 * user-controlled word-wrap preference, not independent per-block states.
 *
 * The private app preference store (Ce / ord) is unavailable in this
 * independent host. This is a session-scoped adapter for a real mounted
 * React host, deliberately without claiming original persistence or account
 * synchronization. Every code block shares the same observable preference.
 */
export type SourceCodeBlockWordWrapPolicy="always"|"never"|"user-controlled";
export interface SourceCodeBlockWordWrapPreference {
  getSnapshot():boolean;
  subscribe(listener:()=>void):()=>void;
  setEnabled(value:boolean):void;
}
export function sourceCodeBlockWrapState(input:{
  policy:SourceCodeBlockWordWrapPolicy;
  preference:boolean;
}):{wrapLines:boolean;canToggle:boolean}{
  switch(input.policy){
    case "always":return {wrapLines:true,canToggle:false};
    case "never":return {wrapLines:false,canToggle:false};
    case "user-controlled":return {
      wrapLines:input.preference,canToggle:true,
    };
  }
}
export function createSourceCodeBlockWordWrapPreference(
  initialValue=false,
):SourceCodeBlockWordWrapPreference {
  let current=initialValue;
  const listeners=new Set<()=>void>();
  return {
    getSnapshot:()=>current,
    subscribe(listener){
      listeners.add(listener);
      return ()=>{listeners.delete(listener);};
    },
    setEnabled(value){
      if(current===value)return;
      current=value;
      for(const listener of [...listeners])listener();
    },
  };
}
