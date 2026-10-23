# Live conversation source boundary — integration batch

The new `LiveConversationSource.ts` defines an immutable observable snapshot for a selected conversation. `ConnectedLiveConversationTranscript.tsx` subscribes using `useSyncExternalStore` and passes the current base entries and projection settings into the existing transcript composition. It intentionally does not invent the private `Df` implementation or subscribe directly to the Codex app-server.

Includes guarded cross-thread revision acceptance, dispose/unsubscribe behavior and empty-state injection points. Tested with five pure Node tests. This is an integration interface rather than recovered original TSX; no live host, React runtime mount, Electron or pixel-parity verification has been completed.
