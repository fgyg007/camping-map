import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalTencentShort,isTencentMapLink,parseTencentMapLink} from '../src/tencent-map-link.js';
import {externalMapShortFromText,mapLinkFromText,parseExternalMapLocation,parseMapLink} from '../src/map-link.js';

const uri='https://apis.map.qq.com/uri/v1/marker';
const component='https://apis.map.qq.com/tools/poimarker';
const share='https://mapapi.qq.com/web/mapComponents/locationMarker/v/index.html';
const marker='coord:31.2304,121.4737;title:周末营地;addr:测试地点';
const link=(base,value=marker,tail='')=>base+'?marker='+encodeURIComponent(value)+tail;

test('Tencent documented pin respects latitude first and URI coordinate enum',()=>{
 const gps=parseTencentMapLink(link(uri,marker,'&coord_type=1&referer=test'));
 assert.deepEqual(gps,{source:'腾讯地图',datum:'wgs84',original:{lat:31.2304,lng:121.4737},lat:31.2304,lng:121.4737,name:'周末营地'});
 const gcj=parseTencentMapLink(link(uri,marker,'&coord_type=2'));
 assert.equal(gcj.datum,'gcj02');
 assert.notEqual(gcj.lng,gcj.original.lng);
 assert.deepEqual(parseTencentMapLink(link(uri)),gcj);
});

test('Tencent component and expanded synthetic app share include the exact pin and title',()=>{
 assert.equal(parseTencentMapLink(link(component,marker+';coordtype:3','&type=0')).datum,'bd09');
 assert.equal(parseTencentMapLink(link(component,marker+';coordtype:1','&type=0')).datum,'wgs84');
 const url=link(share,marker,'&referer=wxsharepoi&key=fixture');
 assert.equal(isTencentMapLink(new URL(url)),true);
 assert.deepEqual(parseTencentMapLink(url),parseTencentMapLink(link(uri)));
});

test('Tencent rejects multiple markers, conflicts, non-pins and unsafe URLs',()=>{
 for(const url of [
  link(uri,marker,'&marker=coord:1,2'), link(uri,marker,'&coord_type=1&coord%5Ftype=1'),
  link(uri,marker,'&coord_type=5'), link(component,marker+';coordtype:2','&type=0'),
  link(uri,marker+';coord:32,122'), link(uri,marker+';uid:arbitrary-poi'),
  link(uri,marker+'Icoord:32,122'), link(uri,marker+'|coord:32,122'),
  link(uri,'coord:121.4737,31.2304'), link(uri,'coord:3e1,121.4'),
  link(uri,'coord:31,121;title:a\ncoord:32,122'),
  link(uri,'coord:31,121;title:a\uFFFD'),
  link(uri,marker,'#fragment'), link(uri,marker,'&center=31,121'), link(uri,marker,'&redirect=https://example.com'),
  link(uri.replace('apis.map.qq.com','apis.map.qq.com.evil.example')),
  link(uri.replace('apis.map.qq.com','user@apis.map.qq.com')),
  link(uri.replace('apis.map.qq.com','apis.map.qq.com:443')),
  link(uri.replace('/uri/v1/','/uri/./v1/')),
  uri+'?center=31,121',link(component,marker,'&type=1'),link(share),
  link(uri.replace('/marker','/search')),link(uri.replace('/marker','/routeplan')),
 ]) assert.throws(()=>parseTencentMapLink(url),undefined,url);
});

test('Tencent short safety allowlist is provider endpoint only and has one opaque token',()=>{
 const accepted='https://mmapgwh.map.qq.com/shortlink/short?l=abcdef0123456789abcdef0123456789';
 assert.equal(canonicalTencentShort(new URL(accepted)),accepted);
 for(const url of [accepted+'&url=https://example.net',accepted+'&l=123',accepted.replace('https:','http:'),
  'https://url.cn/abcdef','https://mmapgwh.map.qq.com/shortlink/open?l=abcdef0123456789abcdef0123456789',
  accepted.replace('map.qq.com','map.qq.com.example.net')]) assert.equal(canonicalTencentShort(new URL(url)),null,url);
});


test('Tencent current app POI share imports explicit longitude-first pin, never the camera',()=>{
 const base='https://map.qq.com/m/map-app/share/poi';
 const params=new URLSearchParams({coord:'121.4737,31.2304',centercoord:'122,30',n:'周末营地',fromSource:'fixture'});
 const url=base+'?'+params;
 assert.equal(isTencentMapLink(new URL(url)),true);
 assert.deepEqual(parseTencentMapLink(url),parseTencentMapLink(link(uri)));
 assert.throws(()=>parseTencentMapLink(url+'&coord=121.4,31.4'));
 assert.throws(()=>parseTencentMapLink(url+'&n=Conflicting'));
 params.delete('coord');
 assert.throws(()=>parseTencentMapLink(base+'?'+params));
});

test('combined map importer routes Tencent short and long without crossing providers',()=>{
 const short='https://mmapgwh.map.qq.com/shortlink/short?l=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
 const long='https://map.qq.com/m/map-app/share/poi?coord=121.47%2C31.23&centercoord=120%2C30&n=Synthetic';
 assert.equal(externalMapShortFromText(`[腾讯地图](${short})`),short);
 assert.equal(mapLinkFromText(long),long);
 const point=parseMapLink(long);
 assert.equal(point.name,'Synthetic');
 assert.deepEqual(point.original,{lng:121.47,lat:31.23});
 assert.deepEqual(parseExternalMapLocation(long,short),point);
 assert.throws(()=>parseExternalMapLocation(long,'https://j.map.baidu.com/aa/Example'));
 assert.throws(()=>parseExternalMapLocation('https://www.google.com/maps/search/?api=1&query=-33,151',short));
});
