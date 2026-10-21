import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";
import "./codexDesktopShell.css";

const container = document.getElementById("root");
if (container == null) throw new Error("#root not found");
createRoot(container).render(<App />);
