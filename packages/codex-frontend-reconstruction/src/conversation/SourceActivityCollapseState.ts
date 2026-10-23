/**
 * Host-owned Rk/Hk collapse state keyed by stable conversation/turn/block IDs.
 *
 * The original local-conversation-turn passes isCollapsed/onSetCollapsed to Rk;
 * Rk falls back to local state only when the host has not supplied a value.
 * This is an in-memory adapter, not persisted Codex settings or Electron IPC.
 */
export interface SourceActivityCollapseState {
  subscribe(listener: () => void): () => void;
  getSnapshot(key: string): boolean | null;
  setCollapsed(key: string, collapsed: boolean): void;
  clear(): void;
  dispose(): void;
}

export function createSourceActivityCollapseState(): SourceActivityCollapseState {
  const values = new Map<string, boolean>();
  const listeners = new Set<() => void>();
  let disposed = false;
  const emit = () => { for (const listener of [...listeners]) listener(); };
  return {
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot(key) { return values.get(key) ?? null; },
    setCollapsed(key, collapsed) {
      if (disposed || values.get(key) === collapsed) return;
      values.set(key, collapsed);
      emit();
    },
    clear() {
      if (disposed || values.size === 0) return;
      values.clear();
      emit();
    },
    dispose() {
      disposed = true;
      listeners.clear();
      values.clear();
    },
  };
}
