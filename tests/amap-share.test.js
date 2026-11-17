import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amapShortFromText,parseAmapLocation} from '../src/amap-share.js';
test('extracts exactly one high-confidence short-link from shared text',()=>{
 assert.equal(amapShortFromText('示例（https://surl.amap.com/Test123）'), 'https://surl.amap.com/Test123');
 for(const value of ['https://surl.amap.com/Test?x=1','https://surl.amap.com.evil/Test','https://surl.amap.com/Test https://surl.amap.com/Other','https://surl.amap.com/Test https://evil.test/','http://surl.amap.com/Test','https://surl.amap.com/Test%2f','https://surl.amap.com:443/Test'])assert.equal(amapShortFromText(value),null);
});
test('uses only the explicit destination and ignores tracking metadata',()=>{
 const r=parseAmapLocation('https://wb.amap.com/?q=39.910226%2C116.403714%2C%E5%90%88%E6%88%90%E7%82%B9&src=fixture');
 assert.equal(r.name,'合成点');assert.equal(r.assumedDatum,true);assert.equal(r.original.lng,116.403714);
 assert.ok(Math.abs(r.lat-39.908823)<1e-5);
});
test('refuses lookalikes, ambiguous fields, bad coordinates and address-only redirects',()=>{
 for(const value of ['https://evil.test/?q=39,116,a','http://wb.amap.com/?q=39,116,a','https://wb.amap.com:8443/?q=39,116,a','https://wb.amap.com/a?q=39,116,a','https://wb.amap.com/?q=39,116,a&q=30,120,b','https://wb.amap.com/?q=39,116,a&coordinate=wgs84','https://wb.amap.com/?q=91,116,a','https://wb.amap.com/?q=Name','https://wb.amap.com/?q=39,116,a#b'])assert.throws(()=>parseAmapLocation(value));
});

test('imports documented-by-observation POI p fields without treating address as label',()=>{
 const r=parseAmapLocation('https://wb.amap.com/?p=B0TEST1234,30.1234,114.5678,测试码头,测试地址,多段地址');
 assert.equal(r.name,'测试码头');assert.deepEqual(r.original,{lat:30.1234,lng:114.5678});
 for(const u of ['?p=bad,30,114,name,address','?p=B0TEST1234,30,114,,address','?p=B0TEST1234,30,114,name,address&q=30,114,name','?p=B0TEST1234,30,114,name'])assert.throws(()=>parseAmapLocation('https://wb.amap.com/'+u));
});
