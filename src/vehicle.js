export const EMPTY_VEHICLE={catalogId:'',model:'',lengthMm:'',widthMm:'',heightMm:''};
export const vehicleDimensions=[
 {key:'lengthMm',label:'车长',max:15000},
 {key:'widthMm',label:'车宽',max:5000},
 {key:'heightMm',label:'车高',max:6500},
];
export function validateVehicle(vehicle){
 if(vehicle==null)return null;
 if(!vehicle||typeof vehicle!=='object'||Array.isArray(vehicle))throw Error('车型数据无效');
 const model=typeof vehicle.model==='string'?vehicle.model.trim():'';
 if(!model||model.length>100)throw Error('请填写 1–100 字的车型名称');
 const clean={model,catalogId:typeof vehicle.catalogId==='string'&&/^[a-z0-9-]{1,80}$/.test(vehicle.catalogId)?vehicle.catalogId:''};
 const brand=typeof vehicle.brand==='string'?vehicle.brand.trim():'';
 if(brand&&brand.length<=40)clean.brand=brand;
 for(const {key,label,max} of vehicleDimensions){
  const value=vehicle[key];
  if(value===''||value==null){clean[key]='';continue;}
  if(!['number','string'].includes(typeof value)||(typeof value==='string'&&!/^\d{3,5}$/.test(value))||!Number.isInteger(Number(value))||Number(value)<500||Number(value)>max)throw Error(label+'请填 500–'+max+' 之间的整数毫米，或留空');
  clean[key]=Number(value);
 }
 return clean;
}
