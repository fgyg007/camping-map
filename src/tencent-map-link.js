import {toWgs} from './coordinates.js';

// https://lbs.qq.com/webApi/uriV1/uriGuide/uriWebMarker and
// https://lbs.qq.com/webApi/component/componentGuide/componentMarker
const SHARE_PATH='/web/mapComponents/locationMarker/v/index.html';
const SHORT_HOST='mmapgwh.map.qq.com';
const SHORT_PATH='/shortlink/short';
const DECIMAL=/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u;
const invalid=()=>Error('这条腾讯地图链接里没有可确认的单个地点坐标。请打开原地图核对，或手动录入。');

function strictUrl(input){
 if(typeof input!=='string')throw invalid();
 const text=input.trim();
 if(text.length>8192||/[\s\\#\x00-\x1f\x7f]|%(?![0-9a-f]{2})/iu.test(text))throw invalid();
 const origin=/^https?:\/\/([a-z0-9.-]+)(?=\/)/iu.exec(text);
 if(!origin)throw invalid();
 const rawPath=text.slice(origin[0].length).split('?')[0];
 let url;try{url=new URL(text);}catch{throw invalid();}
 if(url.hostname!==origin[1].toLowerCase()||url.pathname!==rawPath)throw invalid();
 return url;
}

function kind(url){
 if(!url||!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||url.hash)return null;
 if(url.hostname==='apis.map.qq.com'&&url.pathname==='/uri/v1/marker')return 'uri';
 if(url.hostname==='apis.map.qq.com'&&url.pathname==='/tools/poimarker')return 'component';
 // The app's shared POI marker is distinct from arbitrary QQ URLs.
 if(url.protocol==='https:'&&url.hostname==='mapapi.qq.com'&&url.pathname===SHARE_PATH)return 'share';
 if(url.protocol==='https:'&&url.hostname==='map.qq.com'&&url.pathname==='/m/map-app/share/poi')return 'app-poi';
 return null;
}

export function isTencentMapLink(url){
 return kind(url)!==null;
}

export function canonicalTencentShort(url){
 if(!url||url.protocol!=='https:'||url.hostname!==SHORT_HOST||url.pathname!==SHORT_PATH||
    url.username||url.password||url.port||url.hash||!/^\?l=[0-9a-f]{32}$/u.test(url.search))return null;
 return `https://${SHORT_HOST}${SHORT_PATH}${url.search}`;
}

const ALLOWED_QUERY={
 uri:new Set(['marker','coord_type','referer','key']),
 component:new Set(['marker','type','referer','key','init_view']),
 share:new Set(['marker','referer','key']),
 'app-poi':new Set(['s','coord','centercoord','m','c','n','pt','a','i','p','fromSource']),
};
const ALLOWED_ATTRIBUTES={
 uri:new Set(['coord','title','addr','tel']),
 component:new Set(['coord','title','addr','coordtype']),
 share:new Set(['coord','title','addr']),
};

function makePoint(pair,datum,title,longitudeFirst=false){
 if(pair?.length!==2||pair.some(x=>!DECIMAL.test(x.trim())))throw invalid();
 const [lat,lng]=(longitudeFirst?[...pair].reverse():pair).map(Number);
 const name=title?.trim();
 return {source:'腾讯地图',datum,original:{lat,lng},...toWgs(lat,lng,datum),...(name&&name.length<=80?{name}:{})};
}

export function parseTencentMapLink(input){
 const url=strictUrl(input);
 const route=kind(url);
 if(!route)throw invalid();
 const query=new Map();
 for(const [key,value] of url.searchParams){
  if(!ALLOWED_QUERY[route].has(key)||query.has(key)||/[\x00-\x1f\x7f\uFFFD]/u.test(value))throw invalid();
  query.set(key,value);
 }
 // Current app POI shares expose an explicit lng,lat pin. The camera
 // centre is separate and never used as a fallback.
 if(route==='app-poi')return makePoint(query.get('coord')?.split(','),'gcj02',query.get('n'),true);
 if(route==='component'&&query.get('type')!=='0')throw invalid();
 if(route==='share'&&query.get('referer')!=='wxsharepoi')throw invalid();
 const marker=query.get('marker');
 if(!marker||marker.includes('|')||/I(?:coord|title|addr|tel|uid|coordtype):/u.test(marker))throw invalid();
 const values=new Map();
 for(const part of marker.replace(/;$/u,'').split(';')){
  const match=/^([a-z]+):(.+)$/u.exec(part);
  if(!match||!ALLOWED_ATTRIBUTES[route].has(match[1])||values.has(match[1]))throw invalid();
  values.set(match[1],match[2]);
 }
 // The Web URI and legacy component use different enum values and scopes.
 const coordType=route==='uri'?query.get('coord_type'):values.get('coordtype');
 const datum=coordType==='1'?'wgs84':coordType===undefined||
  (route==='uri'&&coordType==='2')||(route==='component'&&coordType==='5')?'gcj02':
  route==='component'&&coordType==='3'?'bd09':null;
 if(!datum)throw invalid();
 return makePoint(values.get('coord')?.split(','),datum,values.get('title'));
}
