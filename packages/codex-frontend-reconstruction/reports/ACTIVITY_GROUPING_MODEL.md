# Activity grouping model recovery

## Source evidence

Reconstructed from the `dr` activity-item classifier and `pr` automatic-approval normalization in:
`frontend/webview/assets/agent-activity-item-1be092f0c744.js`.

## Covered behavior

- Item type → standalone/groupable/hidden classification.
- Empty web-search query filtering.
- Dynamic-tool hidden/standalone flags via an injected renderer adapter.
- Generated-image inclusion flag.
- MCP elicitation completion and legacy-form grouping.
- Automatic-approval-review status grouping.
- Removal of approved-only automatic-approval metadata.

## Explicitly injected behavior

The compiled code depends on private command classification, MCP app detection, dynamic-tool renderer lookup, and legacy-form property predicates. Those remain injected because their implementations must be traced and validated separately.

## Validation

Seven focused tests cover the recovered branch rules. This module does not render React rows and does not establish pixel-level equivalence.
