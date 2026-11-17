import {toWgs} from './coordinates.js';
const rejected=()=>Error('无法确认地点坐标或坐标系。请使用受支持的长链接，或手动录入。');
const short=new Set(['surl.amap.com','j.map.baidu.com','maps.app.goo.gl','goo.gl']);
export function parseMapLink(input){
 const text=input.trim();
 if(text.length>8192||!/^(https?):\/\//i.test(text)||/[\s\\\x00-\x1f\x7f]/.test(text))throw rejected();
 let url;try{url=new URL(text);}catch{throw rejected();}
 if(url.username||url.password||url.port||url.hash)throw rejected();
 if(short.has(url.hostname))throw Error('暂不展开短链接，请粘贴完整地图链接。');
 const get=(k)=>{if(url.searchParams.getAll(k).length>1)throw rejected();return url.searchParams.get(k);};
 let pair,datum,source,order;
 if(url.hostname==='uri.amap.com'&&['/marker','/navigation'].includes(url.pathname)){
  pair=get(url.pathname==='/marker'?'position':'to')?.split(',');
  if(pair?.length===3)pair.pop();
  const c=get('coordinate');datum=c==='gaode'?'gcj02':c==='wgs84'?'wgs84':null;
  source='高德地图';order='lng';
 }else if(url.hostname==='api.map.baidu.com'&&url.pathname==='/marker'){
  pair=get('location')?.split(',');
  const c=get('coord_type');datum=c==='bd09ll'?'bd09':c==='wgs84'?'wgs84':c==='gcj02'?'gcj02':null;source='百度地图';
 }else if(['www.google.com','google.com'].includes(url.hostname)&&['/maps/dir','/maps/dir/'].includes(url.pathname)){
  if(get('api')!=='1'||url.searchParams.has('destination_place_id'))throw rejected();
  pair=get('destination')?.split(',');datum='wgs84';source='Google 地图';
 }else throw rejected();
 if(!datum||pair?.length!==2||pair.some(x=>!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(x.trim())))throw rejected();
 const [lat,lng]=(order==='lng'?pair.reverse():pair).map(Number);
 if(source==='Google 地图'&&lat>=0.8293&&lat<=55.8271&&lng>=72.004&&lng<=137.8347)throw rejected();
 return {source,datum,original:{lat,lng},...toWgs(lat,lng,datum)};
}
