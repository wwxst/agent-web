"use strict";
/** Independent narrow Electron URL opener for original URL-action dt.
 * Only trusted primary renderer and external HTTPS URLs may open; no Agent
 * grant, callback or response is sent. This is not Codex's private ue bridge.
 */
const MAX_EXTERNAL_URL_LENGTH=2048;
function sourceSafeExternalHttpsUrl(raw){
  if(typeof raw!=="string"||raw.length>MAX_EXTERNAL_URL_LENGTH||
    /[\u0000-\u001f\u007f]/u.test(raw))return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:"||!url.hostname||url.username||url.password)return null;
    return url.href;
  }catch{return null;}
}
async function handleExternalUrlOpen(
  {isTrustedRenderer,openExternal},event,raw,
){
  if(typeof isTrustedRenderer!=="function"||!isTrustedRenderer(event))
    throw new Error("EXTERNAL_URL_UNTRUSTED_RENDERER");
  const url=sourceSafeExternalHttpsUrl(raw);
  if(url==null)throw new TypeError("EXTERNAL_URL_INVALID");
  if(typeof openExternal!=="function")throw new Error("EXTERNAL_URL_HOST_UNAVAILABLE");
  await openExternal(url);
  return true;
}
module.exports={sourceSafeExternalHttpsUrl,handleExternalUrlOpen,MAX_EXTERNAL_URL_LENGTH};
