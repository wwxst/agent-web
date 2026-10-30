import {test,expect} from "@playwright/test";
test("original multi-choice custom editor confirms on Enter, removes tags and restores host-scoped draft",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-multi-custom-suggestion-request").click();
 const card=page.locator('[data-demo-turn-id^="multi-custom-suggestion-form-"]')
  .last().locator("[data-source-text-form-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("Select and add tasks (synthetic)");
 await card.getByRole("checkbox",{name:"Build"}).check();
 const custom=card.getByRole("textbox",{name:"Something else text"});
 await custom.fill("Security review");
 await expect(card.getByRole("checkbox",{name:"Something else"})).toBeChecked();
 await custom.press("Enter");
 await expect(card.getByRole("checkbox",{name:"Remove custom option Security review"})).toBeChecked();
 await expect(custom).toHaveValue("");
 await expect(card).toContainText("1 of 2");
 await custom.fill("Collect metrics");
 await custom.press("Enter");
 await expect(card.getByRole("checkbox",{name:"Remove custom option Collect metrics"})).toBeChecked();
 await expect(card.getByRole("checkbox",{name:"Test"})).toBeDisabled();
 // Removing this Hn custom chip unmounts its checkbox synchronously;
 // uncheck() cannot observe an unchecked state on a removed element.
 await card.getByRole("checkbox",{name:"Remove custom option Security review"}).click();
 await expect(card.getByRole("checkbox",{name:"Remove custom option Security review"})).toHaveCount(0);
 await expect(card.getByRole("checkbox",{name:"Test"})).toBeEnabled();
 // Unconfirmed selected draft remains separate from committed custom chips.
 await custom.fill("Document output");
 await expect(card.getByRole("checkbox",{name:"Something else"})).toBeChecked();
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card).toContainText("2 of 2");
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole("button",{name:"Home"}).click();
 await expect(card).toHaveCount(1);
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("checkbox",{name:"Remove custom option Collect metrics"})).toBeChecked();
 await expect(card.getByRole("textbox",{name:"Something else text"})).toHaveValue("Document output");
 await expect(card.getByRole("checkbox",{name:"Something else"})).toBeChecked();
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-multi-custom-suggestion.png"),
  animations:"disabled"});
});
