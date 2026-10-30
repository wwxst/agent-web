import {test,expect} from "@playwright/test";

test("source ur boolean and integer/number primitive controls retain typed drafts across thread switch",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-mixed-form-elicitation-request").click();
 const card=page.locator('[data-demo-turn-id^="mixed-form-elicitation-"]')
   .last().locator("[data-source-text-form-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("Configure project settings (synthetic)");
 const consent=card.getByRole("checkbox",{name:"Allow processing"});
 await expect(consent).not.toBeChecked();
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card.getByRole("alert")).toContainText("required");
 await consent.check();
 await consent.uncheck(); // explicit false is a real JSON boolean answer
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card).toContainText("2 of 3");
 const quantity=card.getByRole("spinbutton",{name:"Retry count"});
 await expect(quantity).toHaveAttribute("step","1");
 await expect(quantity).toHaveAttribute("min","1");
 await expect(quantity).toHaveAttribute("max","5");
 await quantity.fill("6");
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card.getByRole("alert")).toContainText("whole number");
 await quantity.fill("3");
 await card.getByRole("button",{name:"Next",exact:true}).last().click();
 await expect(card).toContainText("3 of 3");
 const ratio=card.getByRole("spinbutton",{name:"Scale ratio"});
 await expect(ratio).toHaveAttribute("step","any");
 await ratio.fill("1.75");
 await expect(card.getByRole("button",{name:"Continue"})).toBeDisabled();
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-mixed-form-numeric.png"),
   animations:"disabled"});
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole("button",{name:"Home"}).click();
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("3 of 3");
 await expect(card.getByRole("spinbutton",{name:"Scale ratio"})).toHaveValue("1.75");
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("spinbutton",{name:"Retry count"})).toHaveValue("3");
 await card.getByRole("button",{name:"Previous question"}).click();
 await expect(card.getByRole("checkbox",{name:"Allow processing"})).not.toBeChecked();
 await expect(card).toContainText("Form submission is unavailable in this host.");
});
