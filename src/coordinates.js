// Approximate geographic conversion; no network or external inputs.
const PI=Math.PI, A=6378245, E=0.00669342162296594323, X=PI*3000/180;
const outside=({lat,lng})=>lng<72.004||lng>137.8347||lat<0.8293||lat>55.8271;
export function wgsToGcj({lat,lng}){
 if(outside({lat,lng}))return {lat,lng};
 const x=lng-105,y=lat-35;
 const common=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;
 const dy=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x))+common+(20*Math.sin(y*PI)+40*Math.sin(y*PI/3)+160*Math.sin(y*PI/12)+320*Math.sin(y*PI/30))*2/3;
 const dx=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x))+common+(20*Math.sin(x*PI)+40*Math.sin(x*PI/3)+150*Math.sin(x*PI/12)+300*Math.sin(x*PI/30))*2/3;
 const rad=lat*PI/180,m=1-E*Math.sin(rad)**2,s=Math.sqrt(m);
 return {lat:lat+dy*180/(A*(1-E)/m/s*PI),lng:lng+dx*180/(A/s*Math.cos(rad)*PI)};
}
export function toWgs(lat,lng,system='wgs84'){
 if([lat,lng].some(v=>!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v)))||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('请输入有效的纬度和经度');
 lat=Number(lat);lng=Number(lng);
 if(system==='wgs84')return {lat,lng};
 if(!['gcj02','bd09'].includes(system))throw Error('坐标系无效');
 if(system==='bd09'){
  const x=lng-.0065,y=lat-.006,z=Math.hypot(x,y)-.00002*Math.sin(y*X),t=Math.atan2(y,x)-.000003*Math.cos(x*X);
  lat=z*Math.sin(t);lng=z*Math.cos(t);
 }
 if(outside({lat,lng}))throw Error('此坐标超出近似转换范围，请改填 WGS-84');
 let out={lat,lng};
 for(let i=0;i<8;i++){
  const guess=wgsToGcj(out);
  out={lat:out.lat+lat-guess.lat,lng:out.lng+lng-guess.lng};
 }
 const check=wgsToGcj(out);
 if(Math.abs(check.lat-lat)>1e-7||Math.abs(check.lng-lng)>1e-7||outside(out))throw Error('此坐标无法可靠转换，请改填 WGS-84');
 return out;
}
export function amapRoute(p){
 if(outside(p))return null;
 const {lat,lng}=wgsToGcj(p);
 return 'https://uri.amap.com/navigation?'+new URLSearchParams({to:lng.toFixed(6)+','+lat.toFixed(6),mode:'car',coordinate:'gaode',callnative:'1',src:'camping-map'});
}
