
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMapLink} from '../src/map-link.js';
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
