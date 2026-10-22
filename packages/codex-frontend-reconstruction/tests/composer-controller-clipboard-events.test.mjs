import { test } from "node:test";
import assert from "node:assert/strict";
import { connectComposerControllerClipboardEvents } from "../build/ComposerControllerClipboardEvents.js";

function createFakeController() {
  const images = new Set();
  const files = new Set();
  const texts = new Set();
  const links = new Set();
  return {
    images, files, texts, links,
    addPastedImagesHandler(handler) { images.add(handler); },
    removePastedImagesHandler(handler) { images.delete(handler); },
    addPastedFilesHandler(handler) { files.add(handler); },
    removePastedFilesHandler(handler) { files.delete(handler); },
    addPastedTextHandler(handler) { texts.add(handler); },
    removePastedTextHandler(handler) { texts.delete(handler); },
    subscribePastedLink(handler) {
      links.add(handler);
      return () => links.delete(handler);
    },
  };
}

test("clipboard bridge registers only callbacks supplied by the host", () => {
  const controller = createFakeController();
  const cleanup = connectComposerControllerClipboardEvents(controller, {
    onPastedFiles() {},
    onPastedText() { return false; },
  });
  assert.equal(controller.images.size, 0);
  assert.equal(controller.files.size, 1);
  assert.equal(controller.texts.size, 1);
  assert.equal(controller.links.size, 0);
  cleanup();
  assert.equal(controller.files.size, 0);
  assert.equal(controller.texts.size, 0);
});

test("clipboard bridge forwards file payloads and preserves DataTransfer", () => {
  const controller = createFakeController();
  const files = [{ name: "readme.txt" }];
  const transfer = { types: ["Files"] };
  let receivedFiles: readonly File[] | undefined;
  let receivedTransfer: DataTransfer | null | undefined;
  const cleanup = connectComposerControllerClipboardEvents(controller, {
    onPastedFiles(nextFiles, nextTransfer) {
      receivedFiles = nextFiles;
      receivedTransfer = nextTransfer;
    },
  });
  for (const handler of controller.files) handler(files, transfer);
  assert.equal(receivedFiles, files);
  assert.equal(receivedTransfer, transfer);
  cleanup();
});

test("pasted-text false return and pasted-link result pass through unchanged", () => {
  const controller = createFakeController();
  const textPayload = { text: "large paste", markdown: "**large paste**" };
  const linkPayload = { text: "https://example.test", html: "<a>link</a>" };
  const cleanup = connectComposerControllerClipboardEvents(controller, {
    onPastedText(payload) {
      assert.equal(payload, textPayload);
      return false;
    },
    onPastedLink(payload) {
      assert.equal(payload, linkPayload);
      return true;
    },
  });
  assert.equal([...controller.texts][0](textPayload), false);
  assert.equal([...controller.links][0](linkPayload), true);
  cleanup();
});

test("cleanup removes all listeners once, including the link unsubscribe", () => {
  const controller = createFakeController();
  const cleanup = connectComposerControllerClipboardEvents(controller, {
    onPastedImages() {},
    onPastedFiles() {},
    onPastedText() {},
    onPastedLink() {},
  });
  assert.deepEqual([
    controller.images.size, controller.files.size, controller.texts.size, controller.links.size,
  ], [1, 1, 1, 1]);
  cleanup();
  cleanup();
  assert.deepEqual([
    controller.images.size, controller.files.size, controller.texts.size, controller.links.size,
  ], [0, 0, 0, 0]);
});
