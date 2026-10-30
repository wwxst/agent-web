import {test,expect} from "@playwright/test";

test("original source Hn single radio and multi checkbox in canonical transcript, scoped drafts",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-choice-form-elicitation-request").click();
 const card=page.locator('[data-demo-turn-id^="choice-form-elicitation-"]')
   .last().locator("[data-source-text-form-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("Choose activity options (synthetic)");
 await expect(card).toContainText("1 of 2");
 const radio=card.getByRole("radio",{name:"Development"});
 await expect(radio).not.toBeChecked();
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card.getByRole("alert")).toContainText("required");
 await radio.check();
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card).toContainText("2 of 2");
 const check=card.getByRole("checkbox",{name:"Run tests"});
 await check.check();
 await expect(card.getByRole("checkbox",{name:"Build UI"})).toBeEnabled();
 await card.getByRole("checkbox",{name:"Build UI"}).check();
 await expect(card.getByRole("checkbox",{name:"Visual comparison"})).toBeDisabled();
 await check.uncheck();
 await expect(card.getByRole("checkbox",{name:"Visual comparison"})).toBeEnabled();
 await card.getByRole("checkbox",{name:"Visual comparison"}).check();
 await expect(card.getByRole("button",{name:"Continue"})).toBeDisabled();
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-choice-radio-checkbox.png"),
   animations:"disabled"});
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole("button",{name:"Home"}).click();
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("2 of 2");
 await expect(card.getByRole("checkbox",{name:"Build UI"})).toBeChecked();
 await expect(card.getByRole("checkbox",{name:"Visual comparison"})).toBeChecked();
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("radio",{name:"Development"})).toBeChecked();
 await expect(card.locator("[data-mcp-form-choices]")).toHaveCount(1);
});
