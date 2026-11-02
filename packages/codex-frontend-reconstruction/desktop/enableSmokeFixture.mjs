// The stand-alone desktop smoke suite explicitly opts into legacy synthetic
// transcript fixtures. This is an isolated test-runner preload, never imported
// by a normal Windows Electron launch or the user's desktop:dev command.
process.env.AGENT_WEB_DESKTOP_FIXTURE="frontend";
