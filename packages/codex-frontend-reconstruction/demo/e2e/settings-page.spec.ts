import { test, expect } from "@playwright/test";

test("source settings route opens from the actual rail and returns to the same conversation", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const originalThread = await page.locator(".demo-header-location strong").textContent();

  const railSettings = page.getByTestId("navigation-rail-settings");
  await expect(railSettings).toBeEnabled();
  await railSettings.click();

  const screen = page.locator('[data-codex-settings-page="true"]');
  await expect(screen).toBeVisible();
  await expect(page.getByRole("navigation", {name:"Settings"})).toBeVisible();
  await expect(page.getByRole("heading", {name:"General", exact:true, level:1})).toBeVisible();
  await expect(page.locator("[data-app-navigation-rail]")).toHaveCount(0);
  await expect(page.locator(".demo-composer")).toHaveCount(0);

  const sidebar = page.getByRole("navigation", {name:"Settings"});
  await sidebar.getByRole("button", {name:"General"}).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("heading", {name:"Appearance", exact:true, level:1})).toBeVisible();
  await expect(sidebar.getByRole("button",{name:"Appearance"})).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("button",{name:"Dark"})).toBeDisabled();

  await page.getByRole("button", {name:"Collapse settings navigation"}).click();
  await expect(screen).toHaveAttribute("data-settings-sidebar-collapsed","true");
  await page.getByRole("button", {name:"Expand settings navigation"}).click();
  await expect(screen).toHaveAttribute("data-settings-sidebar-collapsed","false");

  await page.getByRole("button", {name:"Back to app"}).click();
  await expect(screen).toHaveCount(0);
  await expect(page.locator(".demo-header-location strong")).toHaveText(originalThread ?? "");
  await expect(page.locator(".demo-composer")).toBeVisible();
  await expect(errors).toEqual([]);
});

test("settings search, focus shortcut and frontend-owned reduced-motion preference are genuine", async ({page}) => {
  await page.goto("/");
  await page.getByTestId("navigation-rail-settings").click();
  await page.keyboard.press("Control+f");
  const search = page.getByRole("searchbox", {name:"Search settings"});
  await expect(search).toBeFocused();
  await search.fill("reduce motion");

  const nav = page.getByRole("navigation", {name:"Settings"});
  await expect(nav.locator("[data-settings-panel-slug]")).toHaveCount(1);
  await expect(nav.getByRole("button",{name:"General"})).toBeVisible();
  await search.fill("impossible-settings-query");
  await expect(page.getByText("No results found")).toBeVisible();
  await page.getByRole("button",{name:"Clear settings search"}).click();
  await expect(search).toHaveValue("");

  const motion = page.getByRole("switch", {name:"Reduce motion"});
  await expect(motion).toHaveAttribute("aria-checked","false");
  await motion.click();
  await expect(motion).toHaveAttribute("aria-checked","true");
  await expect(page.locator("html")).toHaveAttribute("data-codex-reduce-motion","true");
  await expect(page.getByRole("button",{name:"Light"})).toBeDisabled();

  await page.getByRole("button",{name:"Back to app"}).click();
  await page.getByTestId("navigation-rail-settings").click();
  await expect(page.getByRole("switch", {name:"Reduce motion"})).toHaveAttribute("aria-checked","true");
  await page.getByRole("switch", {name:"Reduce motion"}).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-codex-reduce-motion","true");

  await page.screenshot({path: "test-results/settings-general-reconstruction.png",
    animations:"disabled", fullPage:false});
});
