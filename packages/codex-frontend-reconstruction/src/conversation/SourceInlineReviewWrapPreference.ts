/**
 * Original inline-file-diff-review k reads the shared app setting C
 * through useValue (l(C)), and A toggles d.set(C,!current).
 *
 * Host-owned preference interface: no private persistence/account sync is
 * claimed. Instances and virtualized unmount/remount share one snapshot.
 */
export interface SourceInlineReviewWrapPreference {
  getSnapshot():boolean;
  subscribe(listener:()=>void):()=>void;
  setEnabled(value:boolean):void;
}

export function createSourceInlineReviewWrapPreference(initial=false):
  SourceInlineReviewWrapPreference {
  let enabled=initial;
  const listeners=new Set<()=>void>();
  return {
    getSnapshot:()=>enabled,
    subscribe(listener){
      listeners.add(listener);
      return ()=>{listeners.delete(listener);};
    },
    setEnabled(next){
      if(enabled===next)return;
      enabled=next;
      for(const listener of [...listeners])listener();
    },
  };
}
