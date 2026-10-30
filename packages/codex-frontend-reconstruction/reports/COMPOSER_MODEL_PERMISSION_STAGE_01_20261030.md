# Composer model, reasoning and permission controls — source recovery stage 01 (2026-10-30)

## Original compiled source evidence

Input artifact: user-provided Codex Windows `frontend.zip`, package `openai-codex-electron@26.1013.40934`.

| Source asset | SHA-256 | Relevant source owner |
|---|---|---|
| `frontend/webview/assets/app-primary-fe8a450b3b04.js` | `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2` | Composer footer `i9e` (around offset 853k), model/reasoning picker composition and state path around offsets 748k–835k |
| `frontend/webview/assets/permissions-mode-dropdown-db0636f411ec.js` | `771caa1eaced7a815d5dbb70388a6c45381b827d7419cf85d68dc2252683ae54` | `PermissionsModeDropdown` and host/configuration-resolved policy options |
| `frontend/webview/assets/app-primary-71492d0e9e92.css` | `ec041bcd9be08d800225b53e612771b179d5a8082f1e7a5e225519b33163c80b` | Composer footer labels, dropdown label/value, navigation targets and model-picker presentation |

Source facts confirmed:
- Original `i9e` receives `permissionsHostId`, `permissionsCwdOverride`, `showPermissionsModeDropdown`, `modelPicker`, `serviceTierDefaults`, and the current Composer interaction/submit state. These values are supplied by the app/host, not invented inside the footer.
- The original model picker displays the selected model and reasoning effort together. Its option list and available reasoning efforts are host/model-catalog data; locked models and unavailable effort choices can be disabled. The model picker also has service-tier and loading/error paths.
- The original model trigger carries `data-codex-intelligence-trigger` and `data-composer-navigation-target="reasoning"`. The permission trigger uses `data-composer-navigation-target="permissions"`.
- The original permission dropdown supports host/configuration-resolved default approvals, Auto-review/guardian approvals, full access, custom configuration, and server-default/resolved permissions. Enterprise/configuration requirements and Cloud Work can disable individual choices.
- Original Full Access is a confirmed risk transition, not an ordinary menu selection. The source confirmation warns that Codex can run commands, use the internet, and create/edit files anywhere on the computer without per-action permission; it lists file and network capabilities. The host still owns the final policy mutation.
- Original CSS uses dedicated Composer footer labels and dropdown-label/value components. The reconstruction keeps the source navigation attributes and uses a compact menu surface rather than copying private CSS class names.

## Reconstruction implemented in this stage

- Added `SourceComposerControlsModel.ts`:
  - Parses a versioned host snapshot scoped to the requested conversation.
  - Validates unique model/effort/permission IDs and rejects stale or malformed snapshots.
  - Restricts model/reasoning requests to options supplied by the host.
  - Requires host-provided confirmation details before presenting a high-risk permission transition.
  - Parses mutation acknowledgements; renderer state is not changed optimistically.
- Added `CodexComposerHostControls.tsx`:
  - A source-positioned model + reasoning control and a separate permission-mode control.
  - Menus render only host-provided options.
  - Full Access-style options open a confirmation dialog using the host-provided title, warning, capability list and labels.
  - A selected model/permission only changes after a successful host acknowledgement or a refreshed host snapshot.
  - Stale async responses are ignored when the conversation changes.
- Added optional, typed host methods to the independent Electron renderer contract:
  - `getComposerControls`
  - `setComposerModelAndReasoningEffort`
  - `setComposerPermissionMode`
- Replaced the fake `Demo Agent / Medium` and `Full access · mock` footer labels with these controls.
- When the current host does not expose the new APIs, both controls remain disabled and say `模型未连接` / `权限未连接`. This is intentional: the current Electron host still reports `backendConnected:false` and has no model catalog or permission-policy endpoint.

## Explicit integration boundary

This stage restores the renderer contract and interactive control surface; it does **not** claim model or permission settings are connected to Agent CIL:
- The existing preload/main process does not expose these optional methods yet.
- No static model inventory, default permission mode, reasoning-effort list or Full Access grant is fabricated.
- No renderer-only state can grant permissions. The future main/Agent host must re-resolve the current thread, model catalog, permission policy and organization requirements, and must require its own confirmation for high-risk changes.
- Service-tier selection, account-level Work defaults, custom config editing and full source-specific confirmation copy are not claimed complete in this slice.

## Validation added

- Core tests cover valid/stale/malformed host snapshots, duplicate IDs, host-only model/effort selection, permission confirmation planning and mutation acknowledgement validation.
- Playwright tests cover host-provided model selection, reasoning changes, confirmation-gated permission changes, rejected mutation behavior and disabled no-host placeholders.
- The deterministic empty-shell visual test now asserts that no fake model or permission defaults are displayed.
- CI is pending on this branch. No Agent backend or preload mutation endpoint has been added.
