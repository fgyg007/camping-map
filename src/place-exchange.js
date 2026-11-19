import {makePlaceId,validatePlace} from './data.js';
import {MAX_PLACE_PHOTOS} from './photos.js';
import {validateVehicle} from './vehicle.js';

const MAX_PLACES=5000;
const SHARE_KIND='place-share';
const NEAR_LIMIT_METRES=80;
const FIELDS=['name','lat','lng','category','status','heightLimit','verifiedAt','facilities','notes','photos'];

export function makeSelectedExport(places, selectedIds, {includeNotes=false,includePhotos=false}={}){
 const selected=new Set(selectedIds);
 const chosen=places.filter(p=>selected.has(p.id)&&!p.demo);
 if(!chosen.length)throw Error('请选择至少一个非演示地点。');
 if(chosen.length>MAX_PLACES)throw Error('每个文件最多 5000 个地点。');
 const projected=chosen.map(place=>{
  const p=validatePlace(place);
  return {id:p.id,name:p.name,lat:p.lat,lng:p.lng,category:p.category,status:p.status,
   heightLimit:p.heightLimit,verifiedAt:p.verifiedAt,facilities:p.facilities,
   ...(includeNotes&&p.notes?{notes:p.notes}:{}),
   ...(includePhotos&&p.photos?.length?{photos:p.photos}:{})};
 });
 return JSON.stringify({version:1,kind:SHARE_KIND,places:projected},null,2);
}

// Local storage and original backup parser still require unique IDs. An imported file
// may itself contain repeat entries, so reconciliation validates before resolving them.
export function parsePlaceImportDocument(text){
 const data=JSON.parse(text);
 if(data?.version!==1||!Array.isArray(data.places)||data.places.length>MAX_PLACES)
  throw Error('备份格式不正确或超过 5000 个地点');
 const kind=data.kind===SHARE_KIND?SHARE_KIND:undefined;
 return {kind,places:data.places.map(p=>{
  const validated=validatePlace(p);
  if(kind===SHARE_KIND){
   // The selected-share format has no personal metadata; don't restore forged fields.
   const {id,name,lat,lng,category,status,heightLimit,verifiedAt,facilities,notes,photos}=validated;
   return {id,name,lat,lng,category,status,heightLimit,verifiedAt,facilities,notes,
    favorite:false,demo:false,...(photos?.length?{photos}:{})};
  }
  return validated;
 }),vehicle:kind===SHARE_KIND?null:validateVehicle(data.vehicle)};
}

const nameKey=name=>name.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
const comparable=(field,value)=>{
 if(field==='name')return nameKey(value);
 if(field==='facilities'||field==='photos')return JSON.stringify([...new Set(value||[])].sort());
 return value??'';
};
const diff=(local,incoming,kind)=>FIELDS.filter(field=>{
 if(kind===SHARE_KIND&&((field==='notes'&&!incoming.notes)||(field==='photos'&&!incoming.photos?.length)))return false;
 return comparable(field,local[field])!==comparable(field,incoming[field]);
});
function distance(a,b){
 const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;
 return 12742000*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
const near=(a,b)=>distance(a,b)<=NEAR_LIMIT_METRES;

function mergePlaces(local,incoming){
 const photos=[...new Set([...(local.photos||[]),...(incoming.photos||[])])].slice(0,MAX_PLACE_PHOTOS);
 const hasVerifiedStatus=local.status!=='待核实'||!!local.verifiedAt;
 return {...local,notes:local.notes||incoming.notes||'',heightLimit:local.heightLimit||incoming.heightLimit||'',
  // A foreign status/date is supplemental only if there is no local verification.
  status:hasVerifiedStatus?local.status:(incoming.verifiedAt?incoming.status:local.status),
  verifiedAt:hasVerifiedStatus?local.verifiedAt:(incoming.verifiedAt||''),
  facilities:[...new Set([...local.facilities,...incoming.facilities])],...(photos.length?{photos}:{})};
}

export function planPlaceImport(existing,incoming,{kind}={}){
 if(!Array.isArray(existing)||!Array.isArray(incoming)||incoming.length>MAX_PLACES)throw Error('地点导入格式不正确');
 const idIndex=new Map(),names=new Map(),points=new Map(),seenIncoming=new Set(), additions=[],conflicts=[];
 const pointKey=p=>p.lat.toFixed(5)+','+p.lng.toFixed(5);
 let duplicates=0;
 const index=(p)=>{
  idIndex.set(p.id,p);
  const key=nameKey(p.name),array=names.get(key)||[];
  array.push(p);names.set(key,array);
  const point=pointKey(p),atPoint=points.get(point)||[];
  atPoint.push(p);points.set(point,atPoint);
 };
 existing.forEach(index);
 for(const p of incoming){
  const key=nameKey(p.name);
  const identicalKey=JSON.stringify([p.demo===true,...FIELDS.map(f=>comparable(f,p[f]))]);
  if(seenIncoming.has(identicalKey)){duplicates++;continue;}
  seenIncoming.add(identicalKey);
  const sameId=idIndex.get(p.id);
  const similar=(names.get(key)||[]).filter(x=>(x.demo===true)===(p.demo===true)&&near(x,p));
  const samePin=(points.get(pointKey(p))||[]).filter(x=>(x.demo===true)===(p.demo===true));
  const candidates=[...new Set([...(sameId?[sameId]:[]),...similar,...samePin])];
  if(candidates.some(x=>(x.demo===true)===(p.demo===true)&&diff(x,p,kind).length===0)){duplicates++;continue;}
  if(!candidates.length){additions.push(p);index(p);continue;}
  const target=sameId||candidates[0];
  const canMerge=candidates.length===1&&(target.demo===true)===(p.demo===true)&&near(target,p);
  const reason=candidates.length>1?'ambiguous':!canMerge?'id-collision':sameId?'same-id':similar.length?'nearby-name':'same-pin';
  conflicts.push({key:String(conflicts.length),existing:target,incoming:p,
   reason,canMerge,keeps:target,
   differences:diff(target,p,kind),candidates});
 }
 return {existing,additions,conflicts,duplicates};
}

const importChoice=(conflict,choices)=>Object.hasOwn(choices,conflict.key)?choices[conflict.key]:'keep';
const isMerge=(conflict,choices)=>conflict.canMerge&&importChoice(conflict,choices)==='merge';

// One final record per destination, using exactly the same file order for preview and save.
export function previewPlaceMerges(plan,choices={}){
 const byId=new Map();
 for(const conflict of plan.conflicts){
  if(!isMerge(conflict,choices))continue;
  const local=conflict.existing;
  byId.set(local.id,mergePlaces(byId.get(local.id)??local,conflict.incoming));
 }
 return byId;
}

export function applyPlaceImport(plan,choices={}, {createId=makePlaceId}={}){
 const byId=new Map([...plan.existing,...plan.additions].map(p=>[p.id,p]));
 for(const [id,place] of previewPlaceMerges(plan,choices))byId.set(id,place);
 let added=plan.additions.length,merged=0,skipped=plan.duplicates;
 for(const conflict of plan.conflicts){
  const choice=importChoice(conflict,choices);
  if(isMerge(conflict,choices)){
   merged++;
  }else if(choice==='separate'){
   let id=conflict.incoming.id;
   if(byId.has(id)){
    for(let attempt=0;attempt<10&&byId.has(id);attempt++)id=createId();
    if(typeof id!=='string'||!id||byId.has(id))throw Error('无法为导入的地点生成唯一编号');
   }
   byId.set(id,id===conflict.incoming.id?conflict.incoming:{...conflict.incoming,id});
   added++;
  }else skipped++;
 }
 if(byId.size>MAX_PLACES)throw Error('导入后将超过 5000 个地点，请减少选择。');
 return {places:[...byId.values()],added,merged,skipped};
}
