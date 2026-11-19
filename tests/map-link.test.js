
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMapLink,parseBaiduSharedPoiMarker} from '../src/map-link.js';
test('a Baidu provider marker matches the requested UID and is not labelled as a viewport',()=>{
 const share='https://j.map.baidu.com/ab/Marker';
 const reference='https://map.baidu.com/?newmap=1&s=inf%26uid%3DMOCK';
 const point={uid:'MOCK',name:'合成百度地图标记',x:12958175,y:4825923};
 const result=parseBaiduSharedPoiMarker(point,reference,share);
 assert.equal(result.name,point.name);assert.equal(result.source,'百度地图地点标记');
 assert.equal(result.verificationUrl,share);assert.equal(result.requiresConfirmation,undefined);
 assert.ok(Math.abs(result.lat-39.9075)<.001);
 assert.ok(Math.abs(result.lng-116.3914)<.001);
 for(const bad of [{...point,uid:'Other'},{...point,x:'12958175'},{...point,y:Infinity},{...point,name:''}])
  assert.throws(()=>parseBaiduSharedPoiMarker(bad,reference,share));
 assert.throws(()=>parseBaiduSharedPoiMarker(point,reference,'https://maps.app.goo.gl/Fake'));
});
test('offline AMap mark and route with explicit datum, longitude first',()=>{
 const r=parseMapLink('https://uri.amap.com/marker?position=116.403714%2C39.910226%2Ctest&coordinate=gaode');
 assert.equal(r.source,'高德地图');assert.equal(r.datum,'gcj02');assert.ok(Math.abs(r.lat-39.908823)<1e-5);
 assert.equal(parseMapLink('https://uri.amap.com/navigation?to=116,39&coordinate=wgs84').lng,116);
});
test('offline Baidu marker and Google coordinate destination',()=>{
 const b=parseMapLink('http://api.map.baidu.com/marker?location=39.9165658,116.4100865&coord_type=bd09ll');
 assert.equal(b.datum,'bd09');assert.ok(Math.abs(b.lng-116.39747)<3e-5);
 const g=parseMapLink('https://www.google.com/maps/dir/?api=1&origin=12,12&destination=-33.8,151.2');
 assert.equal(g.lat,-33.8);assert.equal(g.lng,151.2);
});
test('rejects misleading, ambiguous, short and unsupported URLs',()=>{
 for(const url of [
 'javascript:alert(1)','https://uri.amap.com.evil/marker?position=116,39&coordinate=wgs84',
 'https://user@uri.amap.com/marker?position=116,39&coordinate=wgs84',
 'https://uri.amap.com:8443/marker?position=116,39&coordinate=wgs84',
 'https://uri.amap.com/marker?position=116,39&coordinate=wgs84#hidden',
 'https://uri.amap.com/marker?position=116,39&position=117,40&coordinate=wgs84',
 'https://uri.amap.com/marker?position=116,39',
 'https://uri.amap.com/marker?position=186,39&coordinate=wgs84',
 'https://uri.amap.com/navigation?from=116,39&coordinate=wgs84',
 'https://api.map.baidu.com/marker?location=39,116&coord_type=bd09mc',
 'https://www.google.com/maps/@39,116,16z',
 'https://www.google.com/maps/dir/?api=1&destination=39,116',
 'https://www.google.com/maps/dir/?api=1&destination=-33,151&destination_place_id=id',
 'https://www.google.com/maps/dir/?api=1&origin=-33,151',
 'https://www.google.com/maps/dir/?api=1&destination=London',
 'https://maps.app.goo.gl/id','https://j.map.baidu.com/id','https://surl.amap.com/id'
 ])assert.throws(()=>parseMapLink(url),undefined,url);
});

test('extracts a single provider link from share text and removes short-link tracking',async()=>{
 const {mapLinkFromText,externalMapShortFromText}=await import('../src/map-link.js');
 assert.equal(externalMapShortFromText('地点：https://maps.app.goo.gl/Abc17?g_st=ic。'), 'https://maps.app.goo.gl/Abc17');
 assert.equal(externalMapShortFromText('百度：http://j.map.baidu.com/9a/Example。'), 'https://j.map.baidu.com/9a/Example');
 assert.equal(externalMapShortFromText('https://goo.gl/maps/Example'), 'https://goo.gl/maps/Example');
 assert.equal(externalMapShortFromText('https://goo.gl/Example'),null);
 assert.equal(externalMapShortFromText('https://j.map.baidu.com/9a/Example https://not-a-map.invalid/'),null);
 assert.equal(externalMapShortFromText('https://j.map.baidu.com:443/Example'),null);
 assert.equal(externalMapShortFromText('https://@j.map.baidu.com/Example'),null);
 assert.equal(externalMapShortFromText('https://j.map.baidu.com.evil/Example'),null);
 assert.equal(mapLinkFromText('POI https://j.map.baidu.com/Example'), 'https://j.map.baidu.com/Example');
 assert.equal(mapLinkFromText('https://www.google.com/url?q=https%3A%2F%2Fnot-a-map.invalid'),null);
 assert.equal(mapLinkFromText('[百度地图](https://j.map.baidu.com/4f/Example)'), 'https://j.map.baidu.com/4f/Example');
 assert.equal(externalMapShortFromText('[百度地图](https://j.map.baidu.com/4f/Example)'), 'https://j.map.baidu.com/4f/Example');
 assert.equal(mapLinkFromText('[地图](https://www.google.com/maps/place/Test+(East))'), 'https://www.google.com/maps/place/Test+(East)');
 assert.equal(mapLinkFromText('[地图](https://j.map.baidu.com/Example) [另一个](https://maps.app.goo.gl/Other)'),null);
});

test('accepts documented Baidu marker coordinates and does not fabricate UID-only coordinates',async()=>{
 const {parseExternalMapLocation}=await import('../src/map-link.js');
 const short='https://j.map.baidu.com/4f/Example';
 const ordinary=parseMapLink('https://api.map.baidu.com/marker?location=39,116&title=test');
 assert.equal(ordinary.datum,'bd09');
 assert.equal(ordinary.name,'test');
 const wgs=parseExternalMapLocation('https://api.map.baidu.com/marker?location=39,116&coord_type=wgs84',short);
 assert.deepEqual(wgs.original,{lat:39,lng:116});
 assert.equal(wgs.lat,39);
 const uidOnly='https://map.baidu.com/?newmap=1&s=inf%26uid%3DExamplePoiId&sharecallbackflag=poiDetailPage';
 assert.throws(()=>parseExternalMapLocation(uidOnly,short),/只返回地点编号/);
 assert.throws(()=>parseMapLink(uidOnly),/只返回地点编号/);
 assert.throws(()=>parseExternalMapLocation('https://www.google.com/maps/search/?api=1&query=-33,151',short));
 assert.throws(()=>parseMapLink('https://api.map.baidu.com/marker?location=39,116&coord_type=wgs84&coord_type=gcj02'));
});

test('parses one Google place pin, never the camera, route waypoints, or ambiguous place records',async()=>{
 const {parseExternalMapLocation}=await import('../src/map-link.js');
 const short='https://maps.app.goo.gl/Example';
 const place='https://www.google.com/maps/place/Test+Park/@-33.7,151.0,17z/data=!4m6!3m5!1s0x0:0x1!8m2!3d-33.8!4d151.2!16s%2Fg%2Fexample';
 const pin=parseExternalMapLocation(place,short);
 assert.equal(pin.lat,-33.8);
 assert.equal(pin.lng,151.2);
 assert.equal(pin.name,'Test Park');
 assert.equal(parseMapLink('https://google.com/maps/search/?api=1&query=-33,151').lng,151);
 for(const url of [
  'https://www.google.com/maps/place/Test/@-33.7,151.0,17z',
  'https://www.google.com/maps/place/Test/@-33.7,151.0,17z/data=!1s0x1:0x2',
  place+'!8m2!3d-33.7!4d151.1',
  place+'!1e1',
  place+'?layer=c',
  'https://google.com/maps/dir/Test/Test/@-33,151,12z/data=!1m5!1m1!1sabc!8m2!3d-33!4d151',
  'https://google.com/maps/search/?api=1&query=-33,151&query_place_id=other',
  'https://google.com/maps/search/?api=1&query=39,116',
  'https://google.com/maps/search/?api=1&query=-33,151&query=-32,150',
 ])assert.throws(()=>parseExternalMapLocation(url,short),undefined,url);
});

test('Baidu desktop POI link yields confirmation-only candidate using published BD09MC example',async()=>{
 const {mapLinkFromText,parseExternalMapLocation,isBaiduDesktopPoiLink}=await import('../src/map-link.js');
 const {baiduCandidateMarkerUrl}=await import('../src/data.js');
 // Public Baidu projection documentation uses these rounded Tiananmen values.
 // UID and metadata are entirely synthetic.
 const original='https://map.baidu.com/poi/%E5%A4%A9%E5%AE%89%E9%97%A8/@12958175,4825923,19z?uid=SyntheticExample&foo=fixture';
 const escaped=original.replaceAll('&',String.fromCharCode(92)+'&');
 const markdown='['+escaped+']('+escaped+')';
 assert.equal(mapLinkFromText(markdown),original);
 assert.equal(isBaiduDesktopPoiLink(markdown),true);
 const preview=parseMapLink(mapLinkFromText(markdown));
 assert.equal(preview.name,'天安门');
 assert.equal(preview.requiresConfirmation,true);
 assert.equal(preview.verificationUrl,original);
 assert.equal(preview.datum,'bd09');
 assert.ok(Math.abs(preview.original.lat-39.915)<1e-5);
 assert.ok(Math.abs(preview.original.lng-116.404)<1e-5);
 assert.ok(Math.abs(preview.lat-39.9075)<.001);
 assert.ok(Math.abs(preview.lng-116.3912)<.001);
 assert.deepEqual(parseExternalMapLocation(original,'https://j.map.baidu.com/1/Example'),preview);
 const compare=new URL(baiduCandidateMarkerUrl(preview.original));
 assert.equal(compare.origin,'https://api.map.baidu.com');
 assert.equal(compare.searchParams.get('coord_type'),'bd09ll');
 assert.equal(compare.searchParams.get('location'),'39.914995,116.404000');
 assert.ok(!compare.href.includes('SyntheticExample'));
});

test('Baidu candidate refuses malformed POI paths, projected overflow, missing UID, non-coordinates and unsafe hosts',async()=>{
 const {mapLinkFromText}=await import('../src/map-link.js');
 const good='https://map.baidu.com/poi/Test/@12958175,4825923,19z?uid=Synthetic';
 for(const bad of [
  good.replace('map.baidu.com','map.baidu.com.evil.invalid'),
  good.replace('map.baidu.com','foo@map.baidu.com'),
  good.replace('map.baidu.com','map.baidu.com:443'),
  good+'#fragment',
  good.replace('/poi/Test/','/search/Test/'),
  good.replace('/Test/','/A/B/'),
  good.replace('12958175','12958175e0'),
  good.replace('12958175','20037724000'),
  good.replace('4825923','39'),
  good.replace('19z','99z'),
  good.replace('uid=Synthetic','uid='),
  good+'&uid=duplicate',
  good.split('?')[0],
  'https://map.baidu.com/?s=inf%26uid%3DSynthetic'
 ])assert.throws(()=>parseMapLink(bad),undefined,bad);
 assert.equal(mapLinkFromText(good+' https://example.invalid/'),null);
});
