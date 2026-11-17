export const categories = ['湖畔','山野','海边','服务区','其他'];
export const statuses = ['待核实','开放','关闭'];
export const facilities = ['厕所','水源','供电','垃圾点'];
export const samples = [
 {id:'demo-1',name:'湖畔的一个清晨',lat:30.22,lng:120.10,category:'湖畔',status:'待核实',notes:'演示地点，展示湖畔营地的记录方式。位置、设施和通行情况均未实测，请勿据此出行。',facilities:['厕所','水源'],favorite:false,demo:true,verifiedAt:''},
 {id:'demo-2',name:'山间松林停车点',lat:30.57,lng:119.91,category:'山野',status:'待核实',notes:'演示地点。可记录入口路况、驻车环境和限高信息，出行前请自行核实。',facilities:[],favorite:true,demo:true,verifiedAt:''},
 {id:'demo-3',name:'沿途休息的一站',lat:30.38,lng:120.38,category:'服务区',status:'待核实',notes:'演示地点，不代表真实服务区或允许过夜的位置。',facilities:['厕所'],favorite:false,demo:true,verifiedAt:''}
];
export function validatePlace(p) {
 if(!p || typeof p.name!=='string' || !p.name.trim() || p.name.length>80) throw Error('请填写 1–80 字的地点名称');
 if(p.lat==='' || p.lng==='' || p.lat==null || p.lng==null || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng)) || Math.abs(Number(p.lat))>90 || Math.abs(Number(p.lng))>180) throw Error('请输入有效的 WGS-84 纬度（-90～90）与经度（-180～180）');
 if(!categories.includes(p.category)||!statuses.includes(p.status)) throw Error('地点分类或状态无效');
 if(!Array.isArray(p.facilities)||p.facilities.some(x=>!facilities.includes(x))) throw Error('设施信息无效');
 if(p.notes!=null && (typeof p.notes!=='string'||p.notes.length>2000)) throw Error('备注最多 2000 字');
 if(p.heightLimit!=='' && p.heightLimit!=null && (!Number.isFinite(Number(p.heightLimit))||Number(p.heightLimit)<=0||Number(p.heightLimit)>10)) throw Error('限高应大于 0 且不超过 10 米');
 if(p.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(p.verifiedAt)) throw Error('核实日期格式无效');
 return {id:typeof p.id==='string'?p.id:crypto.randomUUID(),name:p.name.trim(),lat:Number(p.lat),lng:Number(p.lng),category:p.category,status:p.status,facilities:[...p.facilities],notes:p.notes||'',heightLimit:p.heightLimit ? Number(p.heightLimit):'',verifiedAt:p.verifiedAt||'',favorite:p.favorite===true,demo:p.demo===true};
}
export function parseBackup(text) {
 const data=JSON.parse(text);
 if(data.version!==1||!Array.isArray(data.places)||data.places.length>5000) throw Error('备份格式不正确或超过 5000 个地点');
 const places=data.places.map(validatePlace);
 if(new Set(places.map(p=>p.id)).size!==places.length) throw Error('备份中存在重复 ID');
 return places;
}
export function navigationUrl(p) {return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:`${p.lat},${p.lng}`,travelmode:'driving'});}
