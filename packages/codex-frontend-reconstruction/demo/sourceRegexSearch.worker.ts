/**
 * Source-equivalent dedicated regex worker entry point. It is intentionally
 * off the renderer thread: regex patterns can be expensive or non-terminating.
 * The host must own worker lifecycle, error and timeout handling. This is not
 * imported as a plain UI helper.
 */
import {
  runSourceRegexWorkerRequest,
  type SourceRegexWorkerRequest,
} from "../src/conversation/SourceRegexSearchWorkerModel.js";
self.onmessage=(event:MessageEvent<SourceRegexWorkerRequest>)=>{
  self.postMessage(runSourceRegexWorkerRequest(event.data));
};
