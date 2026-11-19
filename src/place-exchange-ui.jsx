import React,{useEffect,useMemo,useRef,useState} from 'react';
import {planPlaceImport,previewPlaceMerges} from './place-exchange.js';
import './place-exchange.css';

function Dialog({title,onClose,children}){
 const panel=useRef(null),closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement;
  panel.current?.focus();
  const handle=e=>{
   if(e.key==='Escape'){e.stopImmediatePropagation();closeRef.current();return;}
   if(e.key!=='Tab'||!panel.current)return;
   const items=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary')]
    .filter(el=>el.getClientRects().length&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));
   const first=items[0],last=items.at(-1),focused=document.activeElement;
   if(!first){e.preventDefault();return;}
   if(!items.includes(focused)||(e.shiftKey&&focused===first)||(!e.shiftKey&&focused===last)){
    e.preventDefault();(e.shiftKey?last:first).focus();
   }
  };
  document.addEventListener('keydown',handle,true);
  return ()=>{document.removeEventListener('keydown',handle,true);if(previous?.isConnected)previous.focus();};
 },[]);
 return <div className="overlay exchange-overlay"><section ref={panel} tabIndex={-1} className="dialog editor exchange" role="dialog" aria-modal="true" aria-label={title}>
  <button className="close" aria-label="关闭" type="button" onClick={onClose}>×</button>
  <h2>{title}</h2>{children}
 </section></div>;
}

export function PlaceExportDialog({places,initialIds,onClose,onExport}){
 const [ids,setIds]=useState(()=>new Set(initialIds)),[notes,setNotes]=useState(false),[photos,setPhotos]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const eligible=places.filter(p=>!p.demo);
 const toggle=id=>setIds(last=>{const n=new Set(last);if(n.has(id))n.delete(id);else n.add(id);return n;});
 return <Dialog title="导出选中地点" onClose={onClose}>
  <p>只分享选中的地点。经纬度、设施和开放信息会包含在内，不包含个人点评、评分、收藏或车辆资料。</p>
  {!eligible.length?<p>没有可分享的自有地点。</p>:<>
   <div className="exchange-options"><button type="button" onClick={()=>setIds(new Set(eligible.map(p=>p.id)))}>全选地点</button>
    <button type="button" onClick={()=>setIds(new Set())}>取消全选</button><span>已选 {ids.size} 处</span></div>
   <div className="exchange-records">{eligible.map(p=><label className="checkbox" key={p.id}><input type="checkbox" checked={ids.has(p.id)} onChange={()=>toggle(p.id)}/><span>{p.name}</span></label>)}</div>
   <label className="checkbox"><input type="checkbox" checked={notes} onChange={e=>setNotes(e.target.checked)}/>包含现场备注</label>
   <label className="checkbox"><input type="checkbox" checked={photos} onChange={e=>setPhotos(e.target.checked)}/>包含地点照片</label>
  </>}
  {error&&<p className="warning" role="alert">{error}</p>}
  <div className="form-actions"><button type="button" onClick={onClose}>取消</button><button type="button" className="primary" disabled={!ids.size||busy}
   onClick={async()=>{setError('');setBusy(true);try{await onExport([...ids],{includeNotes:notes,includePhotos:photos});onClose();}catch(e){setError(e.message||'导出失败，请重试。');}finally{setBusy(false);}}}>导出所选地点</button></div>
 </Dialog>;
}

function PlaceSummary({title,place,showPhotos=false}){
 if(!place)return null;
 return <div className="exchange-summary"><strong>{title}</strong><div>{place.name}</div>
  <div>{place.category} · {place.status} · {place.lat.toFixed(5)}, {place.lng.toFixed(5)}</div>
  <div>设施：{place.facilities.join('、')||'未填'}；核实日期：{place.verifiedAt||'未填'}；限高：{place.heightLimit?place.heightLimit+' 米':'未填'}；照片：{place.photos?.length||0} 张</div>
  {showPhotos&&!!place.photos?.length&&<div className="exchange-photo-preview">
   {place.photos.map((src,i)=><img key={src} src={src} alt={`保留照片 ${i+1}`} loading="lazy"/>)}
  </div>}
  {place.notes&&<div className="exchange-note">备注：{place.notes}</div>}
  {place.rating&&<div>个人评分：{place.rating}/5</div>}
  {place.review&&<div className="exchange-note">个人点评：{place.review}</div>}
 </div>;
}

export function PlaceImportDialog({existing,vehicle,document,onClose,onConfirm}){
 const [picked,setPicked]=useState(()=>new Set(document.places.map((_,i)=>i)));
 const [choices,setChoices]=useState({}),[ownBackup,setOwnBackup]=useState(false),[restoreVehicle,setRestoreVehicle]=useState(false);
 const plan=useMemo(()=>planPlaceImport(existing,document.places.filter((_,i)=>picked.has(i)).map(p=>{
  if(ownBackup)return p;
  const {rating,review,createdAt,...publicFields}=p;
  return {...publicFields,favorite:false};
 }),{kind:document.kind}),[existing,document,picked,ownBackup]);
 const mergePreviews=useMemo(()=>[...previewPlaceMerges(plan,choices).values()],[plan,choices]);
 const toggle=i=>{setChoices({});setPicked(last=>{const n=new Set(last);if(n.has(i))n.delete(i);else n.add(i);return n;});};
 return <Dialog title="预览并确认导入" onClose={onClose}>
  <p>确认前不会改动原有数据。完全相同的地点跳过；可能是同一地点但信息不同时，默认保留本机，可查看差异再选择。</p>
  <details className="exchange-picker">
   <summary>选择导入地点（{picked.size} / {document.places.length}）</summary>
   <div className="exchange-options"><button type="button" onClick={()=>{setChoices({});setPicked(new Set(document.places.map((_,i)=>i)));}}>全选地点</button>
    <button type="button" onClick={()=>{setChoices({});setPicked(new Set());}}>取消全选</button></div>
   <div className="exchange-records">{document.places.map((p,i)=><label className="checkbox" key={i}><input type="checkbox" checked={picked.has(i)} onChange={()=>toggle(i)}/><span>{p.name}</span></label>)}</div>
  </details>
  <p role="status">可新增 {plan.additions.length} 处 · 相同 {plan.duplicates} 处 · 待比对 {plan.conflicts.length} 处</p>
  {plan.conflicts.map((conflict,index)=><details className="exchange-conflict" key={conflict.key} open={plan.conflicts.length===1?true:undefined}>
   <summary>{index+1}. {conflict.incoming.name} · {(choices[conflict.key]??'keep')==='merge'?'合并':choices[conflict.key]==='separate'?'作为新地点':'保留本机'}</summary>
   {conflict.candidates.length>1&&<p className="warning">有 {conflict.candidates.length} 个可能匹配的地点，不自动合并。</p>}
   <div className="exchange-comparison"><PlaceSummary title="已有或本次先选记录" place={conflict.existing}/><PlaceSummary title="导入文件" place={conflict.incoming}/></div>
   <label>处理「{conflict.incoming.name}」<select value={choices[conflict.key]??'keep'} onChange={e=>setChoices({...choices,[conflict.key]:e.target.value})}>
    <option value="keep">保留本机，跳过这条</option>{conflict.canMerge&&<option value="merge">合并，以本机信息优先</option>}<option value="separate">不是同一处，另存为新地点</option>
   </select></label>
  </details>)}
  {!!mergePreviews.length&&<section className="exchange-conflict" aria-labelledby="exchange-merge-heading">
   <h3 id="exchange-merge-heading">合并后预览</h3>
   {mergePreviews.map(place=><PlaceSummary key={place.id} title={place.name} place={place} showPhotos/>)}
  </section>}
  <p className="hint">本机坐标、评分、点评和其他已填内容优先。空项可补，设施和照片去重合并（最多 3 张）。多条记录合并到一处时，按文件顺序补缺。</p>
  {!document.kind&&<label className="checkbox"><input type="checkbox" checked={ownBackup} onChange={e=>{setOwnBackup(e.target.checked);setRestoreVehicle(false);setChoices({});}}/>这是我自己的备份，恢复新地点的个人点评和收藏</label>}
  {ownBackup&&!vehicle&&document.vehicle&&<label className="checkbox"><input type="checkbox" checked={restoreVehicle} onChange={e=>setRestoreVehicle(e.target.checked)}/>同时恢复备份中的车辆资料</label>}
  <div className="form-actions"><button type="button" onClick={onClose}>取消</button>
   <button type="button" className="primary" disabled={!picked.size&&!restoreVehicle} onClick={()=>onConfirm(plan,choices,restoreVehicle)}>确认导入</button></div>
 </Dialog>;
}
