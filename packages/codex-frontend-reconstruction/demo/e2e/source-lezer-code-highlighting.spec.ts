import {test,expect} from "@playwright/test";

test("real mounted Markdown code blocks use Lezer tags and retain copy + wrap geometry",async({page},testInfo)=>{
  await page.goto("/");
  const originalTs='const greeting: string = "Codex"; // syntax probe';
  const originalPy='def greet():\n    return "hello"';
  const originalToml='[tool]\nname = "plain-fallback"';
  const fence=String.fromCharCode(96).repeat(3);
  const message=[
    "Parser integration uses original CodeMirror syntax categories.",
    "",
    fence+"ts",originalTs,fence,
    "",
    fence+"python",...originalPy.split("\n"),fence,
    "",
    fence+"toml",...originalToml.split("\n"),fence,
  ].join("\n");
  await page.getByRole("textbox",{name:"演示消息输入"}).fill(message);
  await page.getByRole("button",{name:"发送模拟消息"}).click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  const blocks=row.locator('[data-code-block][data-conversation-code-surface="true"]');
  await expect(blocks).toHaveCount(3);
  await expect(blocks.nth(0)).toHaveAttribute("data-source-code-highlight","ready");
  await expect(blocks.nth(1)).toHaveAttribute("data-source-code-highlight","ready");
  await expect(blocks.nth(2)).toHaveAttribute("data-source-code-highlight","fallback");
  const observed=await blocks.evaluateAll(nodes=>nodes.map(node=>{
    const source=node.querySelector<HTMLElement>('[data-code-block-source]')!;
    const code=source.querySelector("code")!;
    const syntax=Array.from(code.querySelectorAll<HTMLElement>(
      'span[class*="text-codex-syntax"]',
    )).map(el=>({classes:el.className,text:el.textContent,
      color:getComputedStyle(el).color}));
    return {
      copiedText:code.textContent?.replace(/\n$/,""),
      syntax,language:node.querySelector(".demo-markdown-code-language")?.textContent,
      wrapButton:node.querySelector(".demo-markdown-code-wrap")?.getAttribute("aria-pressed"),
      overflowX:getComputedStyle(source).overflowX,
    };
  }));
  expect(observed[0]!.copiedText).toBe(originalTs);
  expect(observed[1]!.copiedText).toBe(originalPy);
  expect(observed[2]!.copiedText).toBe(originalToml);
  expect(observed[0]!.syntax.length).toBeGreaterThanOrEqual(2);
  expect(observed[0]!.syntax.some(part=>part.classes.includes("text-codex-syntax-keyword"))).toBe(true);
  expect(observed[0]!.syntax.some(part=>part.classes.includes("text-codex-syntax-string"))).toBe(true);
  expect(observed[1]!.syntax.some(part=>part.classes.includes("text-codex-syntax-keyword"))).toBe(true);
  expect(observed[2]!.syntax).toHaveLength(0);
  expect(observed[0]!.syntax.some(part=>part.color==="rgb(171, 79, 122)")).toBe(true);
  expect(observed[0]!.wrapButton).toBe("false");
  await blocks.first().getByRole("button",{name:"Enable word wrap"}).click();
  await expect(blocks.first()).toHaveAttribute("data-source-code-wrap-lines","true");
  await expect(blocks.nth(1)).toHaveAttribute("data-source-code-wrap-lines","true");
  await expect(blocks.first()).toHaveAttribute("data-source-code-highlight","ready");
  await blocks.first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path:testInfo.outputPath("source-lezer-real-markdown-code-highlight.png"),
    animations:"disabled",
  });
});
