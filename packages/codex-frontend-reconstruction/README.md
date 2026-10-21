# Codex Frontend Semantic Reconstruction

This repository is a staged, independent reconstruction of selected modules inferred from the user-provided compiled Codex desktop frontend. It is not the original Codex source repository and does not claim to recover the original authors' TypeScript/React source verbatim.

## Current modules

- `src/conversation/ActiveToolActivityLabel.ts` — semantic activity-label mapping and safe search-term formatting. Host-specific path/skill helpers are injected.
- `src/conversation/TurnEntriesModel.ts` — transcript-entry filtering hooks, reply-chain indexing, timestamp separators, item-to-turn lookup, virtualization estimates, and memo equality.
- `src/components/TimelineActivityBody.tsx` — reconstructed layout wrapper, preserving observed utility class names and injecting the host class merger.
- `src/components/CollapsedTurnDisclosure.tsx` — reconstructed disclosure UI with injected design-system primitives.

## Verification

```sh
npm run test:core
```

The core build only compiles pure TypeScript modules. React components are intentionally not claimed to be runnable until the original design-system dependencies and Electron host are mapped.

## Fidelity and limitations

- The original readable bundle is retained separately by the user as a reference baseline and is not copied into this package.
- Recovered names are descriptive names chosen during reconstruction, not claimed to be original names.
- The private host predicate, deep-equality utility, design-system components, and Electron bridge require explicit adapters.
- This is not yet a complete standalone frontend and has not undergone Electron visual regression.
