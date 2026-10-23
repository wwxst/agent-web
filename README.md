# agent-web

Codex-style frontend **semantic reconstruction** and incremental integration experiments. The project is based on observable behavior in the user's local desktop frontend build; it is **not** official Codex source code or a production-ready clone.

## Run the browser integration preview

Use the `recovery/codex-frontend-through-connected-message-20261021` branch, then:

```bash
cd packages/codex-frontend-reconstruction
npm install
npm run test:core
npm run demo:check-model
npm run demo:build
npm run demo:dev
```

Open **http://127.0.0.1:5173/**. This is a mock-data browser demo, not an Electron executable or live Agent client. To preview the Vite build, run `npm run demo:preview` and visit **http://127.0.0.1:4173/**.

The preview mounts the actual recovered live conversation source, projection, virtualizer, message dispatcher, review and approval components. The missing Codex-private parts (Markdown UI, activity details, scroll host and Composer) are explicitly replaced by **demo-only adapters** so the reconstruction can be integrated and inspected without misrepresenting original internals.

See [`packages/codex-frontend-reconstruction/demo/README.md`](packages/codex-frontend-reconstruction/demo/README.md) and [`reports/DEMO_INTEGRATION.md`](packages/codex-frontend-reconstruction/reports/DEMO_INTEGRATION.md) for tests, supported interactions, known gaps and recommended manual checks.

**Important:** `npm run demo:build` verifies TypeScript and bundling. Neither it nor `test:core` proves pixel parity, real Electron integration, or any backend connectivity. Test against a legitimate local Codex installation before claiming UI/interaction fidelity.
