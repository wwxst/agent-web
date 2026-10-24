"use strict";
/**
 * Source original main-C4DYk222.js: A9/z9 primary titlebar branch and
 * i3e.getPrimaryMinimumSize. Narrowly recovered native-window options only.
 * This is NOT the private Codex window manager or command menu.
 */
const CHROME_HEIGHT=36;
const PRIMARY_MIN_WIDTH=480;
const PRIMARY_MIN_HEIGHT=600;

function sourcePrimaryChromeOptions(platform,shouldUseDarkColors=false,zoom=1){
 if(platform==="darwin")return {
   titleBarStyle:"hiddenInset",
   trafficLightPosition:{x:16,y:Math.round((44*zoom-14)/2)},
   acceptFirstMouse:true,
 };
 if(platform==="win32"||platform==="linux")return {
   titleBarStyle:"hidden",
   titleBarOverlay:{
     color:"#00000000",
     symbolColor:shouldUseDarkColors?"#ffffff":"#1f1f1f",
     height:Math.round(CHROME_HEIGHT*zoom),
   },
 };
 return {titleBarStyle:"default"};
}
module.exports={
 CHROME_HEIGHT,PRIMARY_MIN_WIDTH,PRIMARY_MIN_HEIGHT,
 sourcePrimaryChromeOptions,
};
