"use strict";

const path = require("node:path");

const APP_SCHEME = "agent-web";
const APP_ORIGIN = "agent-web://local";

/** No remote navigation or arbitrary loopback origin is permitted. */
function resolveRendererTarget({ packageRoot, devServerUrl } = {}) {
  if (typeof packageRoot !== "string" || !path.isAbsolute(packageRoot)) {
    throw new Error("An absolute packageRoot is required");
  }
  const raw = typeof devServerUrl === "string" ? devServerUrl.trim() : "";
  if (raw) {
    const url = new URL(raw);
    if (url.protocol !== "http:" ||
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.username || url.password || url.port !== "5173" ||
        (url.pathname !== "/" && url.pathname !== "") ||
        url.search || url.hash) {
      throw new Error("Development renderer must be http://127.0.0.1:5173/");
    }
    url.searchParams.set("desktopShell", "1");
    return { kind:"development", url:url.href, allowedOrigin:url.origin };
  }
  return {
    kind:"bundled",
    url:`${APP_ORIGIN}/index.html?desktopShell=1`,
    allowedOrigin:APP_ORIGIN,
    distRoot:path.join(packageRoot,"demo-dist"),
  };
}

/** Map only resources below the built Vite output root; no filesystem bridge. */
function resolveBundledResource(distRoot, requestUrl) {
  const url = new URL(requestUrl);
  // Node's WHATWG URL reports origin="null" for custom protocols; test
  // scheme + host explicitly rather than treating all opaque origins as equal.
  if (url.protocol !== APP_SCHEME + ":" || url.host !== "local" ||
      url.username || url.password) {
    throw new Error("Untrusted renderer origin");
  }
  // Reject traversal *before* URL normalizes encoded dot segments.
  const rawPath = requestUrl.slice(APP_ORIGIN.length).split(/[?#]/,1)[0];
  const pathname = decodeURIComponent(rawPath);
  if (pathname.includes("\0") || pathname.includes("\\") ||
      pathname.split("/").some(segment=>segment===".." || segment===".")) {
    throw new Error("Invalid resource path");
  }
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolute = path.resolve(distRoot, relativePath);
  const relative = path.relative(distRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Requested resource escaped the renderer directory");
  }
  return absolute;
}

module.exports = { APP_SCHEME, APP_ORIGIN, resolveRendererTarget, resolveBundledResource };
