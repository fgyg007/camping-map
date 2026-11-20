import {validateVehicle,vehicleDimensions} from './vehicle.js';
import {validatePhotos} from './photos.js';

export const MAX_VISIT_REPORTS=100;
export const visitOutcomes=['到达营位','只到停车场或入口','途中掉头','其他'];
const dims=[...vehicleDimensions,{key:'clearanceMm',label:'离地间隙',max:1200}];
export const compareDimensions=dims;
const field=(value,max)=>{if(value==null)return '';if(typeof value!=='string'||value.length>max)throw Error('实测文字超出长度或格式无效');return value.trim();};
export function validateVisitReport(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.id!=='string'||!(/^[a-zA-Z0-9_-]{1,100}$/).test(raw.id))throw Error('实测记录标识无效');
 const date=raw.date;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('请填写有效的实测日期');
 const v=validateVehicle(raw.vehicle);
 if(!v)throw Error('请填写实测车辆');
 const {model,lengthMm,widthMm,heightMm,clearanceMm=''}=v;
 const outcome=field(raw.outcome,80);
 if(!outcome)throw Error('请选择这次开到了哪里');
 const source=['self','friend'].includes(raw.source)?raw.source:undefined;
 return {id:raw.id,date,vehicle:{model,lengthMm,widthMm,heightMm,clearanceMm},outcome,approach:field(raw.approach,160),conditions:field(raw.conditions,160),notes:field(raw.notes,1000),photos:validatePhotos(raw.photos),...(source?{source}:{})};
}
export function validateVisitReports(raw){
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>MAX_VISIT_REPORTS)throw Error('同一营地最多保存 100 条实测');
 const visits=raw.map(validateVisitReport);
 if(new Set(visits.map(x=>x.id)).size!==visits.length)throw Error('实测记录标识重复');
 return visits;
}
export function compareVehicles(mine,other){
 const words={lengthMm:['长','短'],widthMm:['宽','窄'],heightMm:['高','低'],clearanceMm:['高','低']};
 return dims.map(({key,label})=>{
  const a=mine?.[key],b=other?.[key];
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<=0||b<=0)return {key,label,text:'未知',deltaMm:null};
  const d=a-b;
  return {key,label,deltaMm:d,text:d===0?'相同':words[key][d>0?0:1]+' '+Math.abs(d)/10+' cm'};
 });
}
