import {test,expect} from "@playwright/test";
test("original or/Hn Something else editor switches suggestion choices and restores custom host draft",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-custom-suggestion-form-request").click();
 const card=page.locator('[data-demo-turn-id^="custom-suggestion-form-"]').last()
  .locator("[data-source-text-form-request-id]");
 await expect(card).toHaveCount(1);
 const editor=card.getByRole("textbox",{name:"Something else text"});
 const other=card.getByRole("radio",{name:"Something else"});
 const build=card.getByRole("radio",{name:"Build"});
 await editor.fill("Custom execution plan");
 await expect(other).toBeChecked();
 await build.check();
 await expect(other).not.toBeChecked();
 await expect(editor).toHaveValue("Custom execution plan");
 await editor.focus();
 await expect(other).toBeChecked();
 await build.focus();
 await build.press("ArrowDown");
 await expect(card.getByRole("radio",{name:"Review"})).toBeChecked();
 await editor.focus();
 await expect(other).toBeChecked();
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card).toContainText("2 of 2");
 await expect(card.getByRole("textbox",{name:"Notes"})).toBeVisible();
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole("button",{name:"Home"}).click();
 await expect(card).toHaveCount(1);
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("textbox",{name:"Something else text"}))
  .toHaveValue("Custom execution plan");
 await expect(card.getByRole("radio",{name:"Something else"})).toBeChecked();
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-custom-suggestion.png"),animations:"disabled"});
});
