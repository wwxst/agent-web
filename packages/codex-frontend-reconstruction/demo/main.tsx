// This flag selects native-window chrome only. It exposes no desktop IPC.
if (new URLSearchParams(window.location.search).get("desktopShell") === "1") {
  document.documentElement.dataset.desktopShell = "true";
}
import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";
import "./codexDesktopShell.css";
import "../src/components/codexComposerLayout.css";

const container = document.getElementById("root");
if (container == null) throw new Error("#root not found");
createRoot(container).render(<App />);
