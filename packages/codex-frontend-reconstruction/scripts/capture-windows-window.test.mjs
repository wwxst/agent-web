import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('Windows PowerShell 5.1 evaluates all production cursor corners without array subtraction', {
  skip: process.platform !== 'win32',
  timeout: 30000,
}, () => {
  const result = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-File',
    fileURLToPath(new URL('./test-capture-cursor-candidates.ps1', import.meta.url)),
    '-CaptureScriptPath',
    fileURLToPath(new URL('./capture-windows-window.ps1', import.meta.url)),
  ], {encoding: 'utf8', timeout: 25000, windowsHide: true});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const size of ['1920x1080', '640x480', '7680x4320']) {
    assert.ok(result.stdout.includes(`Cursor candidates verified: ${size}.`), result.stdout);
  }
});
