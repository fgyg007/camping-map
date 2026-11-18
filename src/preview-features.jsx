import React,{useState,useEffect,useRef} from 'react';
import {Check,X,Camera,Car} from 'lucide-react';
import {MAX_PLACE_PHOTOS,preparePhoto} from './photos.js';
import {EMPTY_VEHICLE,validateVehicle,vehicleDimensions} from './vehicle.js';
import {VEHICLE_BRANDS,VEHICLE_CATALOG,vehiclesForBrand} from './vehicle-catalog.js';

export function PhotoEditor({photos=[],onChange,busy,onBusy}){
 const input=useRef(null),live=useRef(true),[issue,setIssue]=useState('');
 useEffect(()=>{live.current=true;return ()=>{live.current=false;};},[]);
 async function add(e){
  const files=Array.from(e.target.files||[]);
  e.target.value='';
  if(!files.length||busy)return;
  const count=MAX_PLACE_PHOTOS-photos.length;
  if(!count)return;
  onBusy(true);setIssue('');
  try{
   const next=[];
   for(const f of files.slice(0,count))next.push(await preparePhoto(f));
   if(live.current){
    onChange([...photos,...next]);
    if(files.length>count)setIssue('只添加了前 '+count+' 张，每个地点最多 3 张。');
   }
  }catch(err){if(live.current)setIssue(err.message);}
  finally{if(live.current)onBusy(false);}
 }
 return <fieldset className="photo-editor"><legend><Camera size={16}/>营地照片</legend>
  <p className="hint">每个地点最多 3 张。照片会压缩、去除原始照片的位置信息，由野泊保存在设备，不自动上传；会随手动备份导出，也可能纳入 Android 系统备份。</p>
  {photos.length>0&&<div className="photo-grid">{photos.map((photo,i)=><div className="photo-item" key={i}><img alt={'待保存照片 '+(i+1)} src={photo}/><button type="button" aria-label={'移除照片 '+(i+1)} onClick={()=>onChange(photos.filter((_,j)=>j!==i))} disabled={busy}><X size={16}/></button></div>)}</div>}
  <button type="button" disabled={busy||photos.length>=MAX_PLACE_PHOTOS} onClick={()=>input.current.click()}><Camera size={16}/>{busy?'正在处理照片…':'从相册添加'}</button>
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="添加营地照片" hidden multiple onChange={add}/>
  {issue&&<p role="alert" className="warning">{issue}</p>}
 </fieldset>;
}
export function PhotoGallery({photos=[]}){
 const [index,setIndex]=useState(null);
 if(!photos.length)return null;
 return <section className="campsite-gallery" aria-label="营地照片">
  <h3>营地照片 · {photos.length}</h3>
  <div className="photo-grid">{photos.map((photo,i)=><button key={i} type="button" className="photo-open" onClick={()=>setIndex(i)} aria-label={'查看营地照片 '+(i+1)}><img src={photo} alt={'营地照片 '+(i+1)}/></button>)}</div>
  {index!==null&&photos[index]&&<div className="photo-viewer"><img src={photos[index]} alt={'放大营地照片 '+(index+1)}/><button type="button" onClick={()=>setIndex(null)}>关闭大图</button></div>}
 </section>;
}
export function VehicleEditor({vehicle,onClose,onSave}){
 const [form,setForm]=useState(()=>({...EMPTY_VEHICLE,...vehicle})),[issue,setIssue]=useState('');
 const [brand,setBrand]=useState(()=>VEHICLE_CATALOG.find(v=>v.id===vehicle?.catalogId)?.brand||(VEHICLE_BRANDS.includes(vehicle?.brand)?vehicle.brand:''));
 const choices=vehiclesForBrand(brand);
 const preset=choices.find(v=>v.id===form.catalogId);
 return <div className="overlay" onClick={onClose}><section className="dialog editor vehicle-dialog" aria-label="我的车辆" aria-modal="true" role="dialog" onClick={e=>e.stopPropagation()}>
  <button className="close" aria-label="关闭车辆" onClick={onClose}><X/></button><span className="eyebrow">MY VEHICLE</span><h2><Car size={22}/> 我的车辆</h2>
  <p>选择常见车型带出原厂参考尺寸，找不到就直接填写。加装件请按实测调整。</p>
  <form onSubmit={e=>{e.preventDefault();setIssue('');try{if(!onSave(validateVehicle({...form,brand})))setIssue('未保存车辆，请检查存储空间。');}catch(err){setIssue(err.message);}}}>
   <label>选择品牌<select aria-label="选择品牌" value={brand} onChange={e=>{
    setBrand(e.target.value);
    setForm(current=>({...current,catalogId:''}));
   }}><option value="">其他品牌 / 不选品牌（手动录入）</option>{VEHICLE_BRANDS.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
   <label>选择车型<select aria-label="选择车型" disabled={!brand||!choices.length} value={preset?.id||''} onChange={e=>{
    const p=choices.find(v=>v.id===e.target.value);
    setForm(current=>p?{catalogId:p.id,model:p.model+' '+p.trim,lengthMm:p.lengthMm,widthMm:p.widthMm,heightMm:p.heightMm}:{...current,catalogId:''});
   }}><option value="">{!brand?'请先选择品牌':choices.length?'请选择车型，或直接手填':'这个品牌暂无预设，请手动填写'}</option>{choices.map(v=><option value={v.id} key={v.id}>{v.model} · {v.trim}</option>)}</select></label>
   {preset&&<p className="hint">厂商参考：{preset.lengthMm} × {preset.widthMm} × {preset.heightMm} mm。<a href={preset.sourceUrl} target="_blank" rel="noreferrer">查看厂商资料</a></p>}
   <label>车型名称<input required maxLength={100} value={form.model} onChange={e=>setForm({...form,model:e.target.value})} placeholder="例如：我的改装床车"/></label>
   <div className="vehicle-measures">{vehicleDimensions.map(({key,label,max})=><label key={key}>{label}（毫米）<input type="number" inputMode="numeric" min="500" max={max} step="1" value={form[key]} placeholder="未填写" onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div>
   <p className="hint">宽度请留意是否含后视镜；车高请计入行李架、升顶等加装件。尺寸不作为通行保证。</p>
   {issue&&<p className="warning" role="alert">{issue}</p>}
   <div className="form-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" type="submit"><Check size={18}/>保存车辆</button></div>
  </form>
 </section></div>;
}
