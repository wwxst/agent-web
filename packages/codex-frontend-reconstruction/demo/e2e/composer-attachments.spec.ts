import {test,expect} from "@playwright/test";

const TWO_PIXEL_PNG="iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8////fwYGBgYmBigAAD34BADaOyqcAAAAAElFTkSuQmCC";

test("file picker stages image and document tiles, removes them, and sends only non-openable local preview references",async({page})=>{
  await page.goto("/");
  const input=page.getByTestId("composer-file-input");
  await input.setInputFiles([
    {name:"notes.md",mimeType:"text/markdown",buffer:Buffer.from("# local note")},
    {name:"diagram.png",mimeType:"image/png",buffer:Buffer.from(TWO_PIXEL_PNG,"base64")},
  ]);

  const tray=page.locator("[data-composer-attachments]");
  await expect(tray).toBeVisible();
  const tiles=tray.locator("[data-composer-attachment-id]");
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(0)).toHaveAttribute("data-composer-attachment-kind","file");
  await expect(tiles.nth(0)).toHaveAttribute("data-composer-attachment-upload-state","local-only");
  await expect(tiles.nth(0)).toContainText("notes.md");
  await expect(tiles.nth(0)).toContainText("12 B");
  await expect(tiles.nth(1)).toHaveAttribute("data-composer-attachment-kind","image");
  await expect(tiles.nth(1).locator("img")).toBeVisible();
  await expect(page.getByTestId("send-button")).toBeEnabled();

  await tiles.nth(0).getByRole("button",{name:"Remove notes.md"}).click();
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first()).toContainText("diagram.png");
  await expect(tiles.first()).toHaveAttribute("data-composer-attachment-upload-state","local-only");

  // Re-add the document, then send both as label-only references. The
  // transcript renderer must not invent a local path or an uploaded file ID.
  await input.setInputFiles([
    {name:"notes.md",mimeType:"text/markdown",buffer:Buffer.from("# local note")},
  ]);
  await expect(tiles).toHaveCount(2);
  await page.getByTestId("send-button").click();
  await expect(page.locator("[data-composer-attachments]")).toHaveCount(0);
  const userFiles=page.locator("[data-source-user-file-attachments]").last();
  await expect(userFiles).toBeVisible();
  await expect(userFiles.locator('[data-source-user-attachment-kind="none"]')).toHaveCount(2);
  await expect(userFiles.getByRole("button",{name:"notes.md"})).toBeDisabled();
  await expect(userFiles.getByRole("button",{name:"diagram.png"})).toBeDisabled();
  await expect(page.getByText(/尚未上传，也没有发送到真实 Agent 后端/)).toBeVisible();
});

test("ProseMirror file paste and the source outer-form drop path share attachment intake",async({page})=>{
  await page.goto("/");
  const editor=page.getByRole("textbox",{name:"演示消息输入"});
  const pasted=await editor.evaluate(el=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File(["clipboard note"],"pasted.txt",{type:"text/plain"}));
    const event=new ClipboardEvent("paste",{
      bubbles:true,cancelable:true,clipboardData:transfer,
    });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(pasted).toBe(true);
  const tiles=page.locator("[data-composer-attachment-id]");
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first()).toContainText("pasted.txt");

  const form=page.locator("[data-codex-source-composer-form]");
  const dropped=await form.evaluate(element=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File(["dropped note"],"dropped.txt",{type:"text/plain"}));
    const enter=new DragEvent("dragenter",{bubbles:true,cancelable:true,dataTransfer:transfer});
    const over=new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:transfer});
    element.dispatchEvent(enter);
    element.dispatchEvent(over);
    return {enterPrevented:enter.defaultPrevented,overPrevented:over.defaultPrevented};
  });
  expect(dropped.enterPrevented).toBe(true);
  expect(dropped.overPrevented).toBe(true);
  await expect(form).toHaveAttribute("data-composer-file-drag-active","true");
  const dropPrevented=await form.evaluate(element=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File(["dropped note"],"dropped.txt",{type:"text/plain"}));
    const drop=new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:transfer});
    element.dispatchEvent(drop);
    return drop.defaultPrevented;
  });
  expect(dropPrevented).toBe(true);
  await expect(form).toHaveAttribute("data-composer-file-drag-active","false");
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(1)).toContainText("dropped.txt");
});

test("Composer attachment drafts stay with their conversation and reset with that thread",async({page})=>{
  await page.goto("/");
  await page.getByTestId("composer-file-input").setInputFiles([
    {name:"thread-only.txt",mimeType:"text/plain",buffer:Buffer.from("thread local")},
  ]);
  await expect(page.locator("[data-composer-attachment-id]")).toHaveCount(1);
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await expect(page.locator("[data-composer-attachment-id]")).toHaveCount(0);
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  await expect(page.locator("[data-composer-attachment-id]")).toHaveCount(1);
  await page.getByRole("button",{name:"New chat"}).click();
  await expect(page.locator("[data-composer-attachment-id]")).toHaveCount(0);
});


test("source attachment menu exposes photo/file/folder pickers and preserves local-only intake",async({page})=>{
  await page.goto("/");
  const trigger=page.getByRole("button",{name:"添加文件"});
  await trigger.click();
  const menu=page.getByRole("menu",{name:"添加附件"});
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded","true");
  await expect(menu.getByRole("menuitem",{name:"Add photos"})).toBeVisible();
  await expect(menu.getByRole("menuitem",{name:"Add files"})).toBeVisible();
  await expect(menu.getByRole("menuitem",{name:"Add folder"})).toBeVisible();
  await expect(menu).toContainText("Local preview only");
  await expect(page.getByTestId("composer-photo-input")).toHaveAttribute("accept","image/*");
  await expect(page.getByTestId("composer-folder-input")).toHaveAttribute("webkitdirectory","");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await menu.getByRole("menuitem",{name:"Add files"}).click();
  await expect(menu).toHaveCount(0);
  await page.getByTestId("composer-file-input").setInputFiles([
    {name:"source-menu.txt",mimeType:"text/plain",buffer:Buffer.from("local-only")},
  ]);
  const tile=page.locator('[data-composer-attachment-id]').first();
  await expect(tile).toContainText("source-menu.txt");
  await expect(tile).toHaveAttribute("data-composer-attachment-upload-state","local-only");

  await trigger.click();
  await page.locator(".demo-header").click();
  await expect(menu).toHaveCount(0);
});

test("normal New chat can stage local images without attempting an Agent upload",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  const trigger=page.getByRole("button",{name:"添加文件"});
  await trigger.click();
  await expect(page.getByRole("menu",{name:"添加附件"})).toBeVisible();
  await page.getByRole("menuitem",{name:"Add photos"}).click();
  await page.getByTestId("composer-photo-input").setInputFiles([
    {name:"draft-photo.png",mimeType:"image/png",buffer:Buffer.from(TWO_PIXEL_PNG,"base64")},
  ]);
  await expect(page.locator("[data-composer-attachment-id]")).toHaveCount(1);
  await expect(page.locator('[data-composer-attachment-kind="image"]')).toHaveCount(1);
  await expect(page.locator('[data-composer-attachment-upload-state="local-only"]')).toHaveCount(1);
  await expect(page.getByTestId("send-button")).toBeDisabled();
  await expect(page.locator(".demo-row")).toHaveCount(0);
});
