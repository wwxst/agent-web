import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, relative, resolve} from 'node:path';
import {readPngDimensions, sha256, validateCaptureMetadata} from './compare-ui-screenshots.mjs';

const baseline = fileURLToPath(new URL('../reports/visual-acceptance/20261031-A-shell-empty/', import.meta.url));
const readJson = async path => JSON.parse(await readFile(join(baseline, path), 'utf8'));

test('published real Windows baseline preserves image hashes, metadata, dimensions, inventory and links', async () => {
  const images = [];
  const metadata = [];
  const originalHashes = [
    '3c6b61a4798b51614fa5dd9b7fe0e512f7d5cae80f56093c033332af17520a3b',
    '2047afb138fe265206a2e9af4f0ff06c96d99fad5bc21c749878b1171e978b26',
  ];
  for (const [index, name] of ['original-shell-empty.png', 'reconstructed-shell-empty.png'].entries()) {
    const bytes = await readFile(join(baseline, name));
    const meta = await readJson(`${name}.json`);
    assert.deepEqual(readPngDimensions(bytes), {width: 1352, height: 760});
    assert.equal(sha256(bytes), originalHashes[index]);
    assert.equal(meta.sha256, sha256(bytes));
    assert.equal(meta.screenshot, name);
    assert.equal(meta.scenarioId, 'A-shell-empty');
    assert.equal(meta.theme, 'light');
    assert.equal(meta.windowDpi, 96);
    assert.equal(meta.windowScaleFactor, 1);
    assert.deepEqual(meta.visibleBounds, {x:284, y:160, width:1352, height:760});
    assert.ok(!('processId' in meta) && !('windowHandle' in meta));
    metadata.push(meta);
    images.push({...readPngDimensions(bytes), sha256: sha256(bytes)});
  }
  assert.deepEqual(validateCaptureMetadata(...metadata, ...images), {ok:true, errors:[]});
  const report = await readJson('comparison/report.json');
  assert.equal(report.status, 'compared');
  assert.deepEqual(report.captureMetadata.validation, {ok:true, errors:[]});
  assert.deepEqual(report.captureMetadata.reference, metadata[0]);
  assert.deepEqual(report.captureMetadata.actual, metadata[1]);
  assert.equal(report.metrics.changedPixels, 27813);
  assert.equal(report.metrics.totalPixels, 1027520);
  assert.equal(report.metrics.threshold, 24);
  assert.equal(report.metrics.meanAbsoluteError, 4.9862143802553724);
  for (const name of ['overlay.png', 'difference.png', 'side-by-side.png']) {
    const bytes = await readFile(join(baseline, 'comparison', name));
    assert.deepEqual(readPngDimensions(bytes), {width: name==='side-by-side.png' ? 2704 : 1352, height:760});
  }
  const inventory = (await readFile(join(baseline, 'FILES.txt'), 'utf8')).trim().split(/\r?\n/);
  const walk = async directory => (await Promise.all((await readdir(directory, {withFileTypes:true})).map(
    item => item.isDirectory() ? walk(join(directory,item.name)) : [relative(baseline,join(directory,item.name)).replaceAll('\\','/')],
  ))).flat();
  assert.deepEqual(inventory, (await walk(baseline)).sort());
  const manifest = (await readFile(join(baseline, 'SHA256SUMS.txt'), 'utf8')).trim().split(/\r?\n/);
  const manifestNames = [];
  for (const line of manifest) {
    const match = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
    assert.ok(match, `Malformed manifest line: ${line}`);
    const [,digest,name] = match;
    assert.ok(inventory.includes(name));
    assert.equal(sha256(await readFile(join(baseline,name))), digest, name);
    manifestNames.push(name);
  }
  assert.deepEqual(manifestNames, inventory.filter(name=>name!=='SHA256SUMS.txt'));
  for (const name of inventory.filter(name=>/\.(md|json|txt)$/.test(name))) {
    const text = await readFile(join(baseline,name),'utf8');
    assert.ok(!/(?<![A-Za-z])[A-Za-z]:[\\/]/.test(text), `Absolute machine path in ${name}`);
    if (name.endsWith('.md')) {
      for (const [,url] of text.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^https?:/.test(url) || url.startsWith('#')) continue;
        await readFile(resolve(baseline,url));
      }
    }
  }
});
