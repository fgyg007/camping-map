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

test('official 野泊 uses an independent fixed package and non-trial label', () => {
  const gradle = read('../android/app/build.gradle');
  const config = JSON.parse(read('../capacitor.config.json'));
  const labels = read('../android/app/src/main/res/values/strings.xml');
  assert.equal(config.appId,'com.jlmac.yebo');
  assert.equal(config.appName,'野泊');
  assert.match(gradle,/applicationId "com\.jlmac\.yebo"/);
  assert.match(gradle,/namespace = "com\.jlmac\.campingmap"/);
  assert.match(gradle,/versionCode 13\b/);
  assert.match(gradle,/versionName "1\.0\.0"/);
  assert.match(labels,/<string name="app_name">野泊<\/string>/);
  assert.match(labels,/<string name="title_activity_main">野泊<\/string>/);
  assert.match(read('../index.html'),/<title>野泊<\/title>/);
});
