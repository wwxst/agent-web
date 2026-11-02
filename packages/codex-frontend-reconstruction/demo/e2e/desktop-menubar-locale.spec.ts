import {test,expect} from "@playwright/test";

/** Verify visible desktop menu labels for both locales with a minimal
 * browser-only host fixture. This is not a native menu interaction mock. */
for(const scenario of [
  {locale:"zh-CN",labels:["文件","编辑","视图","帮助"]},
  {locale:"en-US",labels:["File","Edit","View","Help"]},
] as const){
  test(`desktop menu reflects ${scenario.locale} and preserves native menu anchors`,async({page})=>{
    await page.addInitScript((locale:string)=>{
      Object.defineProperty(navigator,"language",{
        configurable:true,get:()=>locale,
      });
      Object.defineProperty(window,"agentWebDesktopHost",{
        configurable:true,value:{
          getHostInfo:async()=>({windowType:"electron",platform:"win32",theme:"light",backendConnected:false}),
          getComposerDrafts:async()=>({}),
          setComposerDraft:async()=>true,
          subscribeHostEvents:()=>()=>{},
          subscribeUiCommands:()=>()=>{},
          openMenu:async()=>true,
        },
      });
    },scenario.locale);
    await page.goto("/");
    const menus=page.locator(".demo-native-application-menus");
    await expect(menus).toBeVisible();
    const buttons=menus.locator("button[data-desktop-menu]");
    await expect(buttons).toHaveText([...scenario.labels]);
    for(const [index,id] of ["file","edit","view","help"].entries()){
      const button=buttons.nth(index);
      await expect(button).toHaveAttribute("data-desktop-menu",id);
      await expect(button).toHaveAttribute("aria-label",`${scenario.labels[index]} 菜单`);
      await expect(button).toBeEnabled();
    }
    await expect(page.locator(".demo-window-buttons")).toBeHidden();
    await expect(page.locator(".demo-menubar-back__svg")).toHaveCount(2);
  });
}
