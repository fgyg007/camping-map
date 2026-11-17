import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePlace,parseBackup,navigationUrl,samples} from '../src/data.js';
test('coordinates must be finite and within WGS-84 range',()=>{for(const [lat,lng] of [[91,10],[10,181],['',10],[null,10],['oops',10]])assert.throws(()=>validatePlace({...samples[0],lat,lng}));assert.equal(validatePlace({...samples[0],lat:0,lng:0}).lat,0)});
test('backup round trip and duplicate protection',()=>{assert.equal(parseBackup(JSON.stringify({version:1,places:samples})).length,3);assert.throws(()=>parseBackup(JSON.stringify({version:2,places:samples})));assert.throws(()=>parseBackup(JSON.stringify({version:1,places:[samples[0],samples[0]]})));});
test('untrusted backup fields validated and unexpected fields removed',()=>{assert.throws(()=>validatePlace({...samples[0],facilities:['fake']}));assert.throws(()=>validatePlace({...samples[0],heightLimit:-1}));assert.equal(validatePlace({...samples[0],injected:'bad'}).injected,undefined);});
test('navigation uses latitude longitude and API flag',()=>{const u=new URL(navigationUrl({...samples[0],lat:-30,lng:120}));assert.equal(u.searchParams.get('api'),'1');assert.equal(u.searchParams.get('destination'),'-30,120');});

import {wgsToGcj,toWgs,amapRoute} from '../src/coordinates.js';
const near=(actual,expected,t=1e-6)=>assert.ok(Math.abs(actual-expected)<t,[actual,expected].join(' != '));
test('known WGS to GCJ fixture and inverse',()=>{
 const w={lat:39.908823,lng:116.39747}, g=wgsToGcj(w);
 near(g.lat,39.9102265); near(g.lng,116.4037136);
 const back=toWgs(g.lat,g.lng,'gcj02'); near(back.lat,w.lat); near(back.lng,w.lng);
});
test('BD-09 lat/lng fixture converts back to WGS',()=>{
 const w=toWgs(39.9165658,116.4100865,'bd09'); near(w.lat,39.908823,0.00003); near(w.lng,116.39747,0.00003);
});
test('reject ambiguous or invalid input and preserve normal GPS abroad',()=>{
 for(const x of ['', ' ', false, null, Infinity, 91])assert.throws(()=>toWgs(x,120));
 assert.throws(()=>toWgs(30,120,'bogus'));assert.throws(()=>toWgs(-33,151,'gcj02'));
 assert.deepEqual(toWgs(-33,151),{lat:-33,lng:151});assert.equal(amapRoute({lat:-33,lng:151}),null);
});
test('AMap HTTPS link uses GCJ longitude first and shares no notes or label',()=>{
 const u=new URL(amapRoute({lat:39.908823,lng:116.39747,name:'private',notes:'private'}));
 assert.equal(u.origin,'https://uri.amap.com');assert.equal(u.pathname,'/navigation');
 assert.equal(u.searchParams.get('to'),'116.403714,39.910226');
 assert.equal(u.searchParams.get('coordinate'),'gaode');assert.ok(!u.href.includes('private'));
});
