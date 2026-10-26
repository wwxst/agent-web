# 2026-10-26 — Repeated tool activity disclosure keyboard safety

## Scope
This work corrects the existing mounted SourceActivityDisclosure,
used by CodexActivityGroupRow for repeated MCP/external-event activities.
It does not add a second tool renderer, fake approvals or permission actions.

## Original relationship
The recovered SourceActivityDisclosure uses the source A_/XO/V_ lazy
child lifecycle and retains outgoing children during its height/opacity
exit transition instead of deleting them immediately.

## Concrete defect and fix
Previously the outgoing body was aria-hidden during its closing phase,
but still-mounted nested buttons remained interactive. A user could tab
inside hidden tool output, or focus could remain on an inaccessible node.

- Add inert when the body is not fully expanded, covering opening and
  closing phases. Persistent summary header remains interactive.
- If focus is inside the outgoing body, move it to the persistent summary
  toggle before making its descendants inert.
- Preserve original lazy children, phase model, source nested scrollport,
  and existing group collapse.

## Verification
Tests use the real review conversation's review-repeated-mcp activity,
not a standalone demo disclosure. A focus-only button inserted into an
already-mounted real tool detail reproduces otherwise unpredictable focus.
Chromium and native Windows/Linux Electron assert focus handoff, aria-hidden
and inert. The existing review timeline also contains separate file diff
and approval fixtures; these components are not modified.

## Remaining
Private motion runtime, approval permission transport, full screenshot
comparison to same-version original Windows Codex and Agent backend
integration remain pending. This is not a completed approval workflow.
