import {test,expect} from "@playwright/test";
test("ei/Yr/Wr/wn text MCP form retains drafts across question navigation and validates without backend",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-text-form-elicitation-request").click();
 const row=page.locator('[data-demo-turn-id^="text-form-elicitation-"]').last();
 const card=row.locator("[data-source-text-form-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("Share project information (synthetic)");
 await expect(card.getByRole("status",{name:""}).first()).toContainText("1 of 2");
 await expect(card.getByRole("textbox",{name:"Project name"})).toHaveValue("");
 await expect(card.getByRole("button",{name:"Next",exact:true}).last()).toBeEnabled();
 await expect(card.getByRole("button",{name:"Continue"})).toHaveCount(0);
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card.getByRole("alert")).toContainText("required");
 await expect(card).toContainText("1 of 2");
 await card.getByRole("textbox",{name:"Project name"}).fill("agent-web");
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card).toContainText("2 of 2");
 await expect(card.getByRole("textbox",{name:"Purpose"})).toBeVisible();
 await expect(card.getByRole("button",{name:"Continue"})).toBeDisabled();
 await card.getByRole("textbox",{name:"Purpose"}).fill("Restore Codex conversation fidelity");
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("textbox",{name:"Project name"})).toHaveValue("agent-web");
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card.getByRole("textbox",{name:"Purpose"})).toHaveValue("Restore Codex conversation fidelity");
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-text-form-two-question-browser.png"),
  animations:"disabled"});
 await expect(card).toContainText("Form submission is unavailable in this host.");
 await expect(card.locator('[data-source-unsupported-form-request-id]')).toHaveCount(0);
});

test("source form draft is owned by host bridge and survives virtual row teardown via thread switch",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-text-form-elicitation-request").click();
 const card=page.locator('[data-demo-turn-id^="text-form-elicitation-"]')
   .last().locator("[data-source-text-form-request-id]");
 await expect(card).toHaveCount(1);
 await card.getByRole("textbox",{name:"Project name"}).fill("persisted by host");
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await card.getByRole("textbox",{name:"Purpose"}).fill("Restored draft");
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole("button",{name:"Home"}).click();
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("2 of 2");
 await expect(card.getByRole("textbox",{name:"Purpose"})).toHaveValue("Restored draft");
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("textbox",{name:"Project name"})).toHaveValue("persisted by host");
});
