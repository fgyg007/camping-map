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

test('Baidu map page storage is isolated, cleared on entry and exit, and does not enable cookies', () => {
  const resolver = read('../android/app/src/main/java/com/jlmac/campingmap/BaiduPoiResolverActivity.java');
  assert.match(resolver, /setDataDirectorySuffix\("baidu_poi_resolver"\)/);
  assert.match(resolver, /setDomStorageEnabled\(true\)/);
  assert.match(resolver, /setAcceptCookie\(false\)/);
  assert.match(resolver, /setAcceptThirdPartyCookies\(web, false\)/);
  assert.match(resolver, /initializeBrowser\(\)[\s\S]*setAcceptCookie\(false\);\s*(?:\/\/[^\n]*\n\s*)?WebStorage\.getInstance\(\)\.deleteAllData\(\)/);
  assert.match(resolver, /void cleanUp\(\)[\s\S]*view\.destroy\(\);\s*WebStorage\.getInstance\(\)\.deleteAllData\(\)/);
  assert.match(resolver, /setBlockNetworkLoads\(true\)/);
  assert.doesNotMatch(resolver, /addJavascriptInterface\s*\(/);
});
