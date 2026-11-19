import {toWgs} from './coordinates.js';
import {bd09McToBd09} from './baidu-mercator.js';
import {isTencentMapLink,canonicalTencentShort,parseTencentMapLink} from './tencent-map-link.js';

const GOOGLE_HOSTS=new Set(['www.google.com','google.com','maps.google.com']);
const SHORT_HOSTS=new Set(['surl.amap.com','j.map.baidu.com','maps.app.goo.gl','goo.gl','mmapgwh.map.qq.com']);
const DECIMAL=/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u;
const CAPPED_TEXT=8192;
const rejected=()=>Error('链接里没有可确认的地点坐标，或坐标系不明确。请打开原地图核对，或手动录入。');

function strictUrl(value){
 if(typeof value!=='string'||value.length>CAPPED_TEXT||/[\s\\\x00-\x1f\x7f]/u.test(value))throw rejected();
 // Reject credentials (even empty), explicit ports, fragments and disguised hostnames.
 const authority=/^https?:\/\/([a-z0-9.-]+)(?:[/?]|$)/iu.exec(value)?.[1];
 if(!authority||value.includes('#'))throw rejected();
 let url;try{url=new URL(value);}catch{throw rejected();}
 if(url.hostname!==authority.toLowerCase())throw rejected();
 return url;
}

function singleLink(text){
 if(typeof text!=='string'||text.length>CAPPED_TEXT)return null;
 const tokens=text.match(/https?:\/\/[^\s<>"\[\]，。！？；、）》」】]+/giu)??[];
 const links=tokens.map(token=>{
  // A literal Markdown link may end in a closing delimiter; don't strip
  // balanced parentheses that actually appear in a Google place name.
  let balance=0;
  for(const char of token){
   if(char==='(')balance++;
   if(char===')')balance--;
  }
  while(balance<0&&token.endsWith(')')){token=token.slice(0,-1);balance++;}
  // A copied Markdown link can escape the query separator in both copies.
  return token.replace(/\\&/gu,'&');
 });
 const [only,...rest]=[...new Set(links)];
 if(!only||rest.length)return null;
 try{return strictUrl(only);}catch{return null;}
}

function canonicalExternalShort(url){
 const tencent=canonicalTencentShort(url);
 if(tencent)return tencent;
 const path=url.pathname;
 // Old Baidu share links may use HTTP; upgrade to HTTPS before any fetch.
 if(url.hostname==='j.map.baidu.com'&&/^\/[A-Za-z0-9_-]{1,64}(?:\/[A-Za-z0-9_-]{1,64})?$/u.test(path))
  return `https://j.map.baidu.com${path}`;
 if(url.protocol!=='https:')return null;
 if(url.hostname==='maps.app.goo.gl'&&/^\/[A-Za-z0-9]{1,64}$/u.test(path) ||
    url.hostname==='goo.gl'&&/^\/maps\/[A-Za-z0-9]{1,64}$/u.test(path))
  return `https://${url.hostname}${path}`;
 return null;
}

export function externalMapShortFromText(text){
 const url=singleLink(text);
 return url?canonicalExternalShort(url):null;
}

export function mapLinkFromText(text){
 const url=singleLink(text);
 if(!url)return null;
 const short=canonicalExternalShort(url);
 if(short)return short;
 const path=url.pathname;
 if(url.hostname==='uri.amap.com'&&['/marker','/navigation'].includes(path)||
    url.hostname==='api.map.baidu.com'&&path==='/marker'||
    url.hostname==='map.baidu.com'&&['/','/mobile/'].includes(path)||baiduDesktopPath(url)||isTencentMapLink(url)||
    GOOGLE_HOSTS.has(url.hostname)&& (path==='/maps'||path.startsWith('/maps/'))||
    url.hostname==='surl.amap.com'&&/^\/[A-Za-z0-9]{1,64}$/u.test(path))
  return `https://${url.hostname}${url.pathname}${url.search}`;
 return null;
}

function cleanName(value){
 if(typeof value!=='string')return undefined;
 const name=value.trim();
 return name&&name.length<=80&&!/[\x00-\x1f\x7f]/u.test(name)?name:undefined;
}

function isBaiduPoiReference(url){
 const s=url.searchParams.getAll('s');
 return url.hostname==='map.baidu.com'&&['/','/mobile/'].includes(url.pathname)&&
  s.length===1&&/^inf&uid=[A-Za-z0-9_-]{1,128}$/u.test(s[0]);
}

export function isBaiduUidOnlyLocation(value){
 try{return isBaiduPoiReference(strictUrl(value));}catch{return false;}
}

export function parseBaiduSharedPoiMarker(value,reference,shortLink){
 const sourceUrl=strictUrl(reference),originalLink=canonicalExternalShort(strictUrl(shortLink));
 if(!originalLink?.startsWith('https://j.map.baidu.com/')||!isBaiduPoiReference(sourceUrl)||
    !value||value.uid!==sourceUrl.searchParams.get('s').slice('inf&uid='.length)||
    !Number.isFinite(value.x)||!Number.isFinite(value.y))throw rejected();
 const name=cleanName(value.name);
 if(!name)throw rejected();
 const original=bd09McToBd09(value.x,value.y);
 return {source:'百度地图地点标记',datum:'bd09',name,original,...toWgs(original.lat,original.lng,'bd09'),
         verificationUrl:originalLink};
}

function baiduDesktopPath(url){
 return url.protocol==='https:'&&url.hostname==='map.baidu.com'&&url.pathname.startsWith('/poi/');
}

export function isBaiduDesktopPoiLink(text){
 const url=singleLink(text);
 return !!url&&baiduDesktopPath(url);
}

function baiduDesktopCandidate(url){
 const uid=url.searchParams.getAll('uid');
 const match=/^\/poi\/([^/]+)\/@([^/,]+),([^/,]+),(?:[1-9]|1\d|2[01])z\/?$/u.exec(url.pathname);
 if(!match||uid.length!==1||!/^[A-Za-z0-9_-]{1,128}$/u.test(uid[0])||
    !DECIMAL.test(match[2])||!DECIMAL.test(match[3]))throw rejected();
 let name;
 try{
  name=cleanName(decodeURIComponent(match[1]));
 }catch{throw rejected();}
 const original=bd09McToBd09(Number(match[2]),Number(match[3]));
 // The desktop path is a frame centre, not a guaranteed POI pin. Only
 // expose it as a candidate; callers may not fill fields before confirmation.
 return {source:'百度地图桌面地点',datum:'bd09',original,...toWgs(original.lat,original.lng,'bd09'),
         ...(name?{name}:{}),requiresConfirmation:true,verificationUrl:url.href};
}

function googlePlace(url){
 // In /maps/place/, an exact pin pair is distinct from the @lat,lng camera.
 // This shape is a compatibility path, not a documented Maps URL API.
 const parts=url.pathname.split('/').slice(3);
 if(parts.length<2||parts.length>3||!parts[0])throw rejected();
 const name=cleanName(decodeURIComponent(parts[0].replace(/\+/gu,' ')));
 const data=parts.at(-1);
 if(!data?.startsWith('data=')||parts.length===3&&!parts[1].startsWith('@'))throw rejected();
 const payload=decodeURIComponent(data.slice(5));
 const matches=[...payload.matchAll(/!8m2!3d([^!]+)!4d([^!]+)(?=!|$)/gu)];
 // Refuse panorama/Street View, ambiguous records and unrecognized payloads.
 if(matches.length!==1||[...payload.matchAll(/!3d/gu)].length!==1||
    [...payload.matchAll(/!4d/gu)].length!==1||/!1e[12](?:!|$)/u.test(payload)||
    url.searchParams.has('layer')||url.searchParams.has('map_action'))throw rejected();
 return {pair:matches[0].slice(1),name};
}

export function parseMapLink(input){
 const url=strictUrl(typeof input==='string'?input.trim():input);
 if(SHORT_HOSTS.has(url.hostname))throw Error('地图短链接需要在安卓版联网展开，或粘贴包含坐标的完整链接。');
 if(isTencentMapLink(url))return parseTencentMapLink(input);
 if(baiduDesktopPath(url))return baiduDesktopCandidate(url);
 if(isBaiduPoiReference(url))
  throw Error('这条百度地图链接只返回地点编号，未提供可确认的经纬度。请打开原地图，复制包含坐标的电脑网页版长链接再粘贴。');
 const get=(k)=>{if(url.searchParams.getAll(k).length>1)throw rejected();return url.searchParams.get(k);};
 let pair,datum,source,order,name;
 if(url.hostname==='uri.amap.com'&&['/marker','/navigation'].includes(url.pathname)){
  pair=get(url.pathname==='/marker'?'position':'to')?.split(',');
  const embeddedName=pair?.length===3?pair.pop():undefined;
  name=cleanName(get('name')??embeddedName);
  const c=get('coordinate');datum=c==='gaode'?'gcj02':c==='wgs84'?'wgs84':null;
  source='高德地图';order='lng';
 }else if(url.hostname==='api.map.baidu.com'&&url.pathname==='/marker'){
  pair=get('location')?.split(',');
  const c=get('coord_type');
  // The official marker URL defaults to BD09 latitude/longitude if omitted.
  datum=c===null||c==='bd09ll'?'bd09':c==='wgs84'?'wgs84':c==='gcj02'?'gcj02':null;
  name=cleanName(get('title'));source='百度地图';
 }else if(GOOGLE_HOSTS.has(url.hostname)){
  if(url.protocol!=='https:')throw rejected();
  if(/^\/maps\/(?:dir|search)\/?$/u.test(url.pathname)){
   const search=url.pathname.startsWith('/maps/search');
   if(get('api')!=='1'||url.searchParams.has(search?'query_place_id':'destination_place_id'))throw rejected();
   pair=get(search?'query':'destination')?.split(',');
  }else if(url.pathname.startsWith('/maps/place/')){
   try{({pair,name}=googlePlace(url));}catch{throw rejected();}
  }else throw rejected();
  datum='wgs84';source='Google 地图';
 }else throw rejected();
 if(!datum||pair?.length!==2||pair.some(x=>!DECIMAL.test(x.trim())))throw rejected();
 const [lat,lng]=(order==='lng'?[...pair].reverse():pair).map(Number);
 if(source==='Google 地图'&&lat>=0.8293&&lat<=55.8271&&lng>=72.004&&lng<=137.8347)
  throw Error('此 Google 地图坐标的坐标系无法确认。请改用高德、百度，或核对坐标后手动录入。');
 return {source,datum,original:{lat,lng},...(name?{name}:{}),...toWgs(lat,lng,datum)};
}

export function parseExternalMapLocation(location,originalShortUrl){
 const original=canonicalExternalShort(strictUrl(originalShortUrl));
 const target=strictUrl(location);
 if(!original)throw rejected();
 const baidu=original.startsWith('https://j.map.baidu.com/');
 const tencent=original.startsWith('https://mmapgwh.map.qq.com/');
 if(baidu?!['api.map.baidu.com','map.baidu.com'].includes(target.hostname):
    tencent?!isTencentMapLink(target):!GOOGLE_HOSTS.has(target.hostname))throw rejected();
 return parseMapLink(location);
}
