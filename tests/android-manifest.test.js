import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Android private process names are parseable and the Baidu resolver guard matches', () => {
  const manifest = read('../android/app/src/main/AndroidManifest.xml');
  const resolver = read('../android/app/src/main/java/com/jlmac/campingmap/BaiduPoiResolverActivity.java');
  const suffix = resolver.match(/\bPROCESS_SUFFIX\s*=\s*"([^"]+)"/)?.[1];
  const processNames = [...manifest.matchAll(/\bandroid:process="([^"]+)"/g)].map(match => match[1]);
  assert.ok(processNames.includes(suffix), 'Runtime guard must match the packaged process');
  for (const process of processNames.filter(name => name.startsWith(':'))) {
    assert.match(process, /^:[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*$/);
  }
});
