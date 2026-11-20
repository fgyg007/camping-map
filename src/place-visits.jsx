import React,{useState} from 'react';
import {makePlaceId} from './data.js';
import {PhotoEditor,PhotoGallery} from './preview-features.jsx';
import {compareDimensions,compareVehicles,validateVisitReport,visitOutcomes} from './place-visits.js';
import './place-visits.css';

const sourceLabel=source=>source==='self'?'我的实测':source==='friend'?'车友实测':'来源未标记';

export function PlaceVisits({place,vehicle,onEdit,onOpen}){
 const trips=[...(place.visitReports||[])].sort((a,b)=>b.date.localeCompare(a.date));
 return <section className="visit-panel">
  <div className="visit-heading"><h3>车友实测</h3>{!place.demo&&<button type="button" onClick={()=>onEdit(null)}>添加实测</button>}</div>
  {trips.length===0?<p>还没有实测。开过这条路？记录这次开什么车、开到了哪里。</p>:<ul className="visit-list">{trips.map(trip=>{
   const deltas=compareVehicles(vehicle,trip.vehicle);
   const d=['widthMm','clearanceMm','heightMm','lengthMm'].map(k=>deltas.find(x=>x.key===k)).find(x=>x.deltaMm!==null&&x.deltaMm!==0);
   return <li key={trip.id}><button type="button" className="visit-summary" onClick={()=>onOpen(trip)}>
    <strong>{trip.date} · {trip.vehicle.model}</strong>
    <span className="visit-source">{sourceLabel(trip.source)}</span>
    <span>{trip.outcome}{trip.approach?' · '+trip.approach:''}{trip.conditions?' · '+trip.conditions:''}</span>
    <span>{d?'你的车'+(d.key==='clearanceMm'?'离地间隙':'比它')+d.text:!vehicle?'设置「我的车辆」后对比':deltas.some(x=>x.deltaMm===0)?'已知尺寸相同':'尺寸差值未知'}</span>
   </button></li>;
  })}</ul>}
  {trips.length>0&&<p className="hint">实测仅代表这辆车当时走的路线和路况，不代表你的车一定能通行。</p>}
 </section>;
}
export function VisitReader({trip,vehicle,onClose,onEdit}){
 return <div className="overlay visit-overlay"><section className="dialog visit-dialog" role="dialog" aria-modal="true" aria-label="实测详情">
  <div className="visit-scroll"><h2>{trip.vehicle.model}</h2><p>{sourceLabel(trip.source)} · {trip.date} · {trip.outcome}</p>
  {trip.approach&&<p>路线：{trip.approach}</p>}{trip.conditions&&<p>路况：{trip.conditions}</p>}
  <h3>我的车和这辆车</h3>
  <p>{vehicle?'我的车：'+vehicle.model:'设置「我的车辆」后可对比尺寸。'}</p>
  <dl>{compareVehicles(vehicle,trip.vehicle).map(({key,label,text})=><div key={key}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
  <p className="hint">缺少实测或我的车辆尺寸时显示未知，不判断是否可通行。</p>
  {trip.notes&&<p className="visit-notes">{trip.notes}</p>}<PhotoGallery photos={trip.photos}/></div>
  <div className="visit-bottom"><button type="button" autoFocus onClick={onClose}>关闭实测</button><button type="button" onClick={()=>onEdit(trip)}>编辑实测</button></div>
 </section></div>;
}
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function newVisitDraft(vehicle){
 return {id:'',source:'self',date:today(),vehicle:vehicle?{...vehicle}:{model:''},outcome:'',approach:'',conditions:'',notes:'',photos:[]};
}
export function finalizeVisit(draft){
 return validateVisitReport({...draft,id:draft.id||makePlaceId()});
}
export function VisitFields({draft,onChange,busy,onBusy,inline=false}){
 const updateVehicle=(k,v)=>onChange('vehicle',{...draft.vehicle,[k]:v});
 return <>
  <p className="hint">{inline?'去过就填写；只是收藏地点的话可留空，不会生成实测。已设置「我的车辆」时会带入，可改成当天实际开的车。':'填的是当天开的车，日后换车不会改动这条记录。'}</p>
  <label>开到了哪里<select required={!inline} value={draft.outcome} onChange={e=>onChange('outcome',e.target.value)}><option value="">{inline?'请选择到达情况':'请选择'}</option>{Array.from(new Set([...visitOutcomes,...(draft.outcome?[draft.outcome]:[])])).map(x=><option key={x}>{x}</option>)}</select></label>
  <div className="form-row">
   <label>实测日期<input type="date" required={!inline||Boolean(draft.outcome)} value={draft.date} onChange={e=>onChange('date',e.target.value)}/></label>
   <label>当时的车型<input maxLength="100" required={!inline||Boolean(draft.outcome)} value={draft.vehicle.model} onChange={e=>updateVehicle('model',e.target.value)}/></label>
  </div>
  <div className="visit-dims">{compareDimensions.map(({key,label})=><label key={key}>{label}（毫米）<input inputMode="numeric" value={draft.vehicle[key]??''} onChange={e=>updateVehicle(key,e.target.value)}/></label>)}</div>
  <label>入口或路线（可选）<input maxLength="160" value={draft.approach} onChange={e=>onChange('approach',e.target.value)}/></label>
  <label>天气及路况（可选）<input maxLength="160" value={draft.conditions} onChange={e=>onChange('conditions',e.target.value)}/></label>
  <label>实测感受（可选）<textarea maxLength="1000" value={draft.notes} onChange={e=>onChange('notes',e.target.value)} placeholder="例如：停车方便，但晚上有点吵。"/></label>
  {!inline&&<PhotoEditor photos={draft.photos} onChange={v=>onChange('photos',v)} busy={busy} onBusy={onBusy}/>}
 </>;
}
export function VisitEditor({trip,vehicle,onClose,onSave}){
 const [draft,setDraft]=useState(()=>trip?{...trip,vehicle:{...trip.vehicle}}:newVisitDraft(vehicle));
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const update=(k,v)=>setDraft(d=>({...d,[k]:v}));
 return <div className="overlay visit-overlay"><form className="dialog visit-dialog" role="dialog" aria-modal="true" aria-label={trip?'编辑实测':'添加实测'} onSubmit={e=>{e.preventDefault();if(busy)return;try{setError('');if(onSave(finalizeVisit(draft))===false)setError('未保存，请检查储存空间或记录上限。');}catch(e){setError(e.message);}}}>
  <div className="visit-scroll"><h2>{trip?'编辑实测':'添加实测'}</h2>
  <VisitFields draft={draft} onChange={update} busy={busy} onBusy={setBusy}/>
  {error&&<p role="alert">{error}</p>}</div>
  <div className="visit-bottom"><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary" disabled={busy}>保存实测</button></div>
 </form></div>;
}
