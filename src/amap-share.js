import {toWgs} from './coordinates.js';
const SHORT=/^https:\/\/surl\.amap\.com\/[A-Za-z0-9]{1,64}$/;
export function amapShortFromText(text){
 if(typeof text!=='string'||text.length>8192)return null;
 const all=text.match(/https?:\/\/[^\s<>"，。！？；、）》」】]+/gu)||[];
 const candidates=[...new Set(all.filter(value=>SHORT.test(value)))];
 return candidates.length===1&&all.every(value=>value===candidates[0])?candidates[0]:null;
}

export function parseAmapLocation(value){
 const error=()=>Error('高德未返回明确的地点坐标，未导入。');
 if(typeof value!=='string'||value.length>8192||!value.startsWith('https://wb.amap.com/')||/[\s\\]/u.test(value))throw error();
 let url;
 try{url=new URL(value);}catch{throw error();}
 if(url.origin!=='https://wb.amap.com'||url.username||url.password||url.pathname!=='/'||url.hash)throw error();
 const q=url.searchParams.getAll('q'),p=url.searchParams.getAll('p');
 if(q.length+p.length!==1)throw error();
 const fields=(q[0]??p[0]).split(',');
 if(p.length&&(!/^B0[A-Z0-9]{8}$/.test(fields.shift())||fields.length<4||!fields[2].trim()))throw error();
 const [lat,lng,...label]=fields;
 const decimal=/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
 if(!decimal.test(lat)||!lng||!decimal.test(lng)||!label.length)throw error();
 if(url.searchParams.has('coordinate')||url.searchParams.has('coord_type'))throw error();
 const name=(p.length?label[0]:label.join(',')).trim();
 if(name.length>80||/[\x00-\x1f\x7f]/u.test(name))throw error();
 // wb shares are not a documented API; use the usual AMap datum only for the preview.
 return {source:'高德地图短链',datum:'gcj02',assumedDatum:true,original:{lat:Number(lat),lng:Number(lng)},name,...toWgs(lat,lng,'gcj02')};
}
