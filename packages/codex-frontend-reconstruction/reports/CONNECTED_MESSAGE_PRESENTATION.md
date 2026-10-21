# Message presentation host composition — migration continuation

## Actual change

The recovered `ConversationMessageBlocks` dispatch is now consumable via `createConnectedConversationMessageRenderers(host)` without each host reimplementing the entire role/activity switch. It joins the existing `InlineFileReview`, `AutomaticApprovalReviewList`, and `ActivityStatusLabel` components to the recovered `ConversationMessageRenderers` contract. Plain message text goes through a **required host Markdown renderer**; structured message bodies and tool details go to a required host details renderer instead of JSON serialization. Image, thinking, in-progress, full FileDiff and activity-result components remain explicit host dependencies.

Pure `ConversationPresentationAdapterModel` selects content by host-provided projections. No unknown Codex private item fields are inferred. File-review edit/accept permissions default to **false** even if the original leaf component has permissive defaults, while any action still goes through `onFileReviewAction`. This is a local integration contract, not a claim that the original Codex private body renderer has been reconstructed.

## Evidence/limitations

Compared against preserved `local-conversation-turn-69783815d57d.js` and `inline-file-diff-review-2b36b4184acf.js` from the uploaded readable source V2; recovered dispatch refers to private Markdown, activity and file diff modules. React/DOM mount and pixel verification still require the host application and actual dependencies. Neither GitHub main nor licensed Codex frontend resources were modified/pushed in this increment.

## Next

1. Provide real Markdown, activity-detail and FileDiff adapters from inspected host implementations, then mount this factory with `createConversationLiveRow` in a React/Electron integration runner.
2. Restore Composer behavior from the original compiled Composer chunks; define host submit/stop/attachment contracts.
3. Screenshot-and-interaction comparison with a legitimate local Codex installation.
