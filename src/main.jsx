import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor,registerPlugin} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {Tent,MapPin,Plus,Search,Heart,Map as MapIcon,List,ArrowUpRight,X,Download,Upload,Trash2,Navigation,Check,Mountain,Trees,Waves,Car, Pencil} from 'lucide-react';
import './style.css';
import {samples,categories,statuses,facilities,validatePlace,parseBackupDocument,serializeBackupDocument,navigationUrl,baiduMarkerUrl,baiduCandidateMarkerUrl} from './data.js';
import {toWgs,amapRoute,wgsToGcj} from './coordinates.js';
import {parseMapLink,mapLinkFromText,externalMapShortFromText,parseExternalMapLocation,isBaiduUidOnlyLocation,parseBaiduSharedPoiMarker} from './map-link.js';
import {PhotoEditor,PhotoGallery,VehicleEditor} from './preview-features.jsx';
import {amapShortFromText,parseAmapLocation} from './amap-share.js';
import {PlaceOverview} from './place-overview.jsx';
import {PlaceRating,PlaceSort} from './place-review.jsx';
import {sortPlaces} from './place-review.js';
import {applyPlaceImport,makeSelectedExport,parsePlaceImportDocument} from './place-exchange.js';
import {PlaceExportDialog,PlaceImportDialog} from './place-exchange-ui.jsx';
import {PlaceDetail} from './place-detail.jsx';
import {PlaceVisits,VisitReader,VisitEditor,VisitFields,newVisitDraft,finalizeVisit} from './place-visits.jsx';
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
 const workerUrl = new URL('./sw.js', document.baseURI);
 navigator.serviceWorker.register(workerUrl).catch(error => {
  console.warn('离线缓存注册失败', error);
 });
}

const MapShare=registerPlugin('MapShare');
const KEY='camping-map-v1';
const symbols={'湖畔':Waves,'山野':Trees,'海边':Waves,'服务区':Car,'其他':Mountain};
const MAX_BACKUP_BYTES=5e6;
function load(){try{const raw=localStorage.getItem(KEY);return {...(raw?parseBackupDocument(raw):{places:samples,vehicle:null}),error:''};}catch{return {places:[],vehicle:null,error:'本机数据无法读取。为保护原记录，暂不覆盖；请先导出原始数据备份，再刷新重试。'};}}
function shortMapLink(text){
 const url=mapLinkFromText(text);
 return url?(amapShortFromText(url)||externalMapShortFromText(url)):null;
}
function baiduShortLink(text){
 const url=externalMapShortFromText(text);
 return url?.startsWith('https://j.map.baidu.com/')?url:null;
}
async function resolveSharedPoint(value,stillCurrent){
 const link=mapLinkFromText(value);
 if(!link)throw Error('请只提供一个支持的高德、百度、腾讯或 Google 地图链接。');
 const amap=amapShortFromText(link),external=externalMapShortFromText(link);
 if(!amap&&!external)return parseMapLink(link);
 if(Capacitor.getPlatform()!=='android')throw Error('分享短链接目前仅可在 Android 版解析；也可先打开原链接，再粘贴带明确坐标的长链接。');
 if(amap)return parseAmapLocation((await MapShare.resolveAmap({url:amap})).location);
 const first=(await MapShare.resolveExternalMapLink({url:external})).location;
 if(!stillCurrent())throw Error('map_import_superseded');
 if(baiduShortLink(external)&&isBaiduUidOnlyLocation(first)){
  try{
   const resolved=await MapShare.resolveBaiduPoiCandidate({location:first});
   if(!stillCurrent())throw Error('map_import_superseded');
   if(resolved.point)return parseBaiduSharedPoiMarker(resolved.point,first,external);
   const candidate=parseExternalMapLocation(resolved.location,external);
   if(candidate.requiresConfirmation)return candidate;
  }catch{/* A blocked, canceled or unknown result will keep the original UID-only guidance. */}
 }
 return parseExternalMapLocation(first,external);
}
function shareError(err){
 const code=String(err?.message||'');
 if(code.startsWith('amap_'))return '未能从高德取得明确地点，请核对网络与链接。';
 if(code==='external_map_timeout')return '地图短链接请求超时，还没取得地点信息。';
 if(code==='external_map_dns'||code==='external_map_tls')return '暂时无法连接地图服务，还没取得地点信息。';
 if(code==='external_map_unrecognized_response')return '地图服务没有返回可识别的分享地址，还没取得地点信息。';
 if(/^(invalid_external_|external_|map_external_|map_link_)/.test(code))return '未能从地图链接取得明确坐标。可以打开原地图核对，再手动录入。';
 return code||'暂时无法读取这个链接。请打开原地图核对。';
}
function App(){
 const [initial]=useState(load),[places,setPlaces]=useState(initial.places),[storageError,setStorageError]=useState(initial.error),[query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[onlyFavorites,setOnlyFavorites]=useState(false),[selected,setSelected]=useState(null),[editing,setEditing]=useState(null),[view,setView]=useState('list'),[toast,setToast]=useState(''),[incoming,setIncoming]=useState(''),[editorError,setEditorError]=useState('');
 const [vehicle,setVehicle]=useState(initial.vehicle),[vehicleOpen,setVehicleOpen]=useState(false);
 const [order,setOrder]=useState('default'),[exchange,setExchange]=useState(null);
 const showMap=view==='map';
 const file=useRef(null),importMode=useRef(null);
 const [visitOverlay,setVisitOverlay]=useState(null),[noteOpen,setNoteOpen]=useState(false),[browseIds,setBrowseIds]=useState([]);
 function openPlace(id,collection){setBrowseIds(collection.map(p=>p.id));setSelected(id);}
 const browseIndex=browseIds.indexOf(selected);
 const neighbors=browseIndex<0?{}:{previous:browseIds[browseIndex-1],next:browseIds[browseIndex+1]};
 function chooseImport(mode){importMode.current=mode;file.current.click();}
 function closeDetail(){setSelected(null);setBrowseIds([]);setVisitOverlay(null);setNoteOpen(false);}
 function saveReview(id,values){
  try{
   const target=places.find(p=>p.id===id);
   if(!target)return false;
   const updated=validatePlace({...target,rating:values.rating,review:values.review});
   if(!save(places.map(p=>p.id===id?updated:p)))return false;
   message('已保存我的点评');return true;
  }catch(e){message(e.message||'未能保存我的点评');return false;}
 }
 function saveVisit(report){
  const existing=current.visitReports||[];
  const next=existing.some(r=>r.id===report.id)?existing.map(r=>r.id===report.id?report:r):[...existing,report];
  const updated=validatePlace({...current,visitReports:next});
  if(!save(places.map(p=>p.id===current.id?updated:p)))return false;
  setVisitOverlay(null);message('已保存实测');return true;
 }
 useEffect(()=>{
  if(!visitOverlay&&!noteOpen)return;
  const handle=e=>{if(e.key==='Escape'){e.preventDefault();if(visitOverlay)setVisitOverlay(null);else setNoteOpen(false);}};
  document.addEventListener('keydown',handle);return ()=>document.removeEventListener('keydown',handle);
 },[visitOverlay,noteOpen]);
 const filtered=sortPlaces(places.filter(p=>(category==='全部'||p.category===category)&&(!onlyFavorites||p.favorite)&&(p.name+p.notes+p.category+(p.review||'')).toLowerCase().includes(query.toLowerCase())),order);
 const current=places.find(p=>p.id===selected);
 useEffect(()=>{
  if(Capacitor.getPlatform()!=='android')return;
  let alive=true;
  const take=()=>MapShare.takePending().then(({text})=>{if(alive&&text)setIncoming(text);}).catch(()=>{});
  const listener=MapShare.addListener('sharedText',take);
  listener.then(take).catch(()=>{});
  return ()=>{alive=false;listener.then(h=>h.remove()).catch(()=>{});};
 },[]);
 function message(t){setToast(t);}
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),4200);return ()=>clearTimeout(t)}},[toast]);
 function save(next,{editor=false,nextVehicle=vehicle}={}){
  const fail=(reason)=>{if(editor)setEditorError(reason);else message(reason);return false;};
  if(storageError)return fail('请先导出原始数据，解决读取错误后重试。');
  if(next.length>5000)return fail('地点数量不能超过 5000 个，请先导出备份。');
  try{
   const payload=serializeBackupDocument(next,nextVehicle);
   if(new Blob([payload]).size>MAX_BACKUP_BYTES)return fail('本机记录已达到备份体积上限。请先导出备份，再整理照片。');
   localStorage.setItem(KEY,payload);
   if(localStorage.getItem(KEY)!==payload)throw Error();
   setPlaces(next);
   setVehicle(nextVehicle);
   return true;
  }catch{return fail('未确认保存成功：设备存储不可用或空间不足。请先导出备份。');}
 }
 function toggle(p){save(places.map(x=>x.id===p.id?{...x,favorite:!x.favorite}:x));}
 async function exportFile(raw,title,name,{rawRecovery=false}={}){
  if(!raw)throw Error('没有可导出的数据。');
  if(!rawRecovery&&new Blob([raw]).size>MAX_BACKUP_BYTES)throw Error('导出文件超过 5 MB，请少选一些地点或不含照片。');
  if(Capacitor.isNativePlatform()){
   const saved=await Filesystem.writeFile({path:name,data:raw,directory:Directory.Cache,encoding:Encoding.UTF8});
   await Share.share({title,url:saved.uri});return;
  }
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 async function download(){
  try{
   const raw=storageError?localStorage.getItem(KEY):serializeBackupDocument(places,vehicle);
   await exportFile(raw,'营地备份','camping-map-backup.json',{rawRecovery:!!storageError});
   message('已生成备份文件');
  }catch{message('导出失败，请检查浏览器下载权限');}
 }
 async function exportPicked(ids,options){
  const raw=makeSelectedExport(places,ids,options);
  await exportFile(raw,'野泊地点分享','yebo-places-'+new Date().toISOString().slice(0,10)+'.json');
  message('已生成地点分享文件');
 }
 async function importFile(e){
  const f=e.target.files[0],mode=importMode.current;importMode.current=null;e.target.value='';if(!f)return;
  try{
   if(f.size>MAX_BACKUP_BYTES)throw Error('备份文件不能超过 5 MB');
   const document=parsePlaceImportDocument(await f.text());
   if(mode==='friend'&&!document.kind)throw Error('这是完整备份，请用「恢复我的备份」。');
   if(mode==='backup'&&document.kind)throw Error('这是车友分享文件，请用「导入车友地点」。');
   setExchange({type:'import',document,ownBackupDefault:mode==='backup'});
  }catch(err){message('导入失败：'+err.message);}
 }
 function confirmImport(plan,choices,restoreVehicle){
  try{
   const result=applyPlaceImport(plan,choices);
   const nextVehicle=vehicle||(restoreVehicle?exchange.document.vehicle:null);
   if((result.added||result.merged||nextVehicle!==vehicle)&&!save(result.places,{nextVehicle}))return;
   setExchange(null);
   message('已新增 '+result.added+' 处、合并 '+result.merged+' 条、跳过 '+result.skipped+' 条'+(nextVehicle!==vehicle?'，已恢复车辆':''));
  }catch(e){message('导入失败：'+(e.message||'请重试'));}
 }
 return <div className="app">
  <aside className="rail"><div className="brand-icon"><Tent size={27}/></div><span className="rail-name">野泊</span><button className={!onlyFavorites?'rail-btn active':'rail-btn'} aria-label="所有地点" onClick={()=>setOnlyFavorites(false)}><MapIcon/></button><button className={onlyFavorites?'rail-btn active':'rail-btn'} aria-label="我的收藏" onClick={()=>setOnlyFavorites(!onlyFavorites)}><Heart/></button><div className="rail-bottom">在路上<br/>也自在</div></aside>
  <main><header><div><div className="eyebrow">WILD STAYS · 寻一处自在</div><h1>让旅途，有处落脚<span>。</span></h1><p>把喜欢的风景，存进自己的露营地图。</p></div><div className="header-actions"><button type="button" onClick={()=>setVehicleOpen(true)}><Car size={17}/>我的车辆</button><button className="primary" onClick={()=>setEditing({})}><Plus size={18}/>添加地点</button></div></header>
  <div className="toolbar"><div className="search"><Search size={19}/><input aria-label="搜索地点" placeholder="搜索地点、路况或备注…" value={query} onChange={e=>setQuery(e.target.value)}/></div><button className={'filter '+(onlyFavorites?'chosen':'')} onClick={()=>setOnlyFavorites(!onlyFavorites)}><Heart size={17}/><span>我的收藏</span></button>{<div className="view-switch"><button aria-label="地图总览" className={view==='map'?'chosen':''} onClick={()=>setView('map')}><MapIcon size={18}/></button><button aria-label="列表视图" className={view==='list'?'chosen':''} onClick={()=>setView('list')}><List size={18}/></button></div>}</div>
  {!showMap&&<div className="category-row">{['全部',...categories].map(c=><button key={c} className={category===c?'chip chosen':'chip'} onClick={()=>setCategory(c)}>{c==='全部'?'全部地点':c}</button>)}<span className="local-label"><span/>野泊不自动上传</span></div>}
  {incoming&&<div className="warning" role="status">收到地图分享。 <button type="button" disabled={!!editing} onClick={()=>{setEditing({shareText:incoming});setIncoming('');}}>预览分享地点</button> <button type="button" onClick={()=>setIncoming('')}>忽略</button></div>}
  {storageError&&<div role="alert" className="warning">{storageError}</div>}
  {showMap?<PlaceOverview places={places} onSelect={id=>openPlace(id,sortPlaces(places,order))} onClose={()=>setView('list')}/>:<section className="workspace list-mode">
   <div className="places-panel"><div className="panel-heading"><div><h2>{onlyFavorites?'收藏的风景':'探索落脚点'}</h2><span>{filtered.length} 个地点 · 慢下来，去看看</span></div><PlaceSort value={order} onChange={setOrder}/></div>
   <div className="cards">{filtered.length===0?<div className="empty"><Tent size={40}/><h3>下一站，由你发现</h3><p>试试其他筛选，或添加第一个地点。</p><button onClick={()=>setEditing({})}>添加地点 <Plus size={16}/></button></div>:filtered.map(p=>{const Icon=symbols[p.category];return <article key={p.id} className={'card '+(selected===p.id?'selected':'')}><button className="card-main" onClick={()=>openPlace(p.id,filtered)}><div className={'scenery scenery-'+p.category}>{p.photos?.[0]?<img src={p.photos[0]} alt="" loading="lazy"/>:<Icon size={30}/>}<span>{p.category}</span></div><div className="card-info"><div className="card-meta">{p.demo?'演示地点':'我的地点'}<span className={'status '+(p.status==='关闭'?'closed':'')}>{p.status}</span></div><h3>{p.name}</h3><PlaceRating place={p}/><p>{p.notes||'还没有备注，记录一些现场见闻吧。'}</p><div className="tags">{p.facilities.length?p.facilities.map(f=><span key={f}>{f}</span>):<span>设施待补充</span>}</div></div></button><button className={'favorite '+(p.favorite?'saved':'')} aria-label={`${p.favorite?'取消收藏':'收藏'}${p.name}`} onClick={()=>toggle(p)}><Heart size={17} fill={p.favorite?'currentColor':'none'}/></button></article>})}</div>
   <div className="panel-footer"><button onClick={download}><Download size={15}/>导出备份</button><button onClick={()=>chooseImport('friend')}><Upload size={15}/>导入车友地点</button><button onClick={()=>chooseImport('backup')}><Upload size={15}/>恢复我的备份</button><button onClick={()=>setExchange({type:'export',ids:[]})}><Download size={15}/>导出选中地点</button></div>{Capacitor.getPlatform()==='android'&&<p className="hint backup-privacy">野泊不自动上传营地、照片或车辆资料。根据手机设置，Android 系统备份可能包含这些数据。</p>}</div>
  </section>}
  <input hidden ref={file} type="file" accept=".json,application/json" onChange={importFile}/>
  <footer><span>野泊 / 个人露营手账</span><span>演示地点未经实测 · 出行前请核实开放与通行情况</span></footer>
  </main>
  {current&&!editing&&<div inert={Boolean(visitOverlay||noteOpen)}>
   <PlaceDetail place={current} neighbors={neighbors} onSelect={setSelected} onClose={closeDetail} onSaveReview={saveReview}
    overview={<><div className="tags"><span>{current.status}</span>{current.facilities.map(f=><span key={f}>{f}</span>)}</div><p className="notes">{current.notes?.length>120?current.notes.slice(0,120)+'…':current.notes||'暂无备注'}</p>{current.notes?.length>120&&<button type="button" onClick={()=>setNoteOpen(true)}>阅读完整备注</button>}<dl><div><dt>现场限高</dt><dd>{current.heightLimit?`${current.heightLimit} 米`:'未记录，请现场确认'}</dd></div><div><dt>最近核实</dt><dd>{current.verifiedAt||'尚未核实'}</dd></div></dl>{current.demo&&<p className="warning">这是演示记录，不代表真实可露营地点。</p>}</>}
    navigation={<><dl><div><dt>WGS-84 坐标</dt><dd>{current.lat.toFixed(6)}, {current.lng.toFixed(6)}</dd></div></dl><a className="primary navigation" href={navigationUrl(current)} target="_blank" rel="noreferrer"><Navigation size={18}/>Google 地图导航<ArrowUpRight size={17}/></a>{amapRoute(current)&&(Capacitor.getPlatform()==='android'
 ?<button type="button" className="primary navigation" onClick={async()=>{
  try{
   const gcj=wgsToGcj(current);
   const result=await MapShare.openAmapRoute({lat:current.lat,lng:current.lng,gcjLat:gcj.lat,gcjLng:gcj.lng});
   if(result.target==='web')message('未能打开高德 App，已改用网页。');
  }catch{message('未能打开高德路线。可复制坐标后手动在地图中打开。');}
 }}><Navigation size={18}/>高德路线规划<ArrowUpRight size={17}/></button>
 :<a className="primary navigation" href={amapRoute(current)} target="_blank" rel="noreferrer"><Navigation size={18}/>高德路线规划<ArrowUpRight size={17}/></a>)}{Capacitor.getPlatform()==='android'
 ?<button type="button" className="primary navigation" onClick={async()=>{
  try{
   const result=await MapShare.openBaiduMarker({lat:current.lat,lng:current.lng});
   if(result.target==='web')message('未能打开百度地图 App，已改用网页。');
  }catch{message('未能打开百度地图。可复制坐标后手动在地图中打开。');}
 }}><MapPin size={18}/>百度地图看点<ArrowUpRight size={17}/></button>
 :<a className="primary navigation" href={baiduMarkerUrl(current)} target="_blank" rel="noreferrer"><MapPin size={18}/>百度地图看点<ArrowUpRight size={17}/></a>}<p className="hint">打开地图会把目的地坐标发送给对应地图服务。导航需要网络；也可复制坐标到支持 WGS-84 的地图。</p></>}
    photos={current.photos?.length?<PhotoGallery key={current.id} photos={current.photos}/>:<p>暂无营地照片。</p>}
    reports={<PlaceVisits place={current} vehicle={vehicle} onOpen={trip=>setVisitOverlay({trip,mode:'read'})} onEdit={trip=>setVisitOverlay({trip,mode:'edit'})}/>}
    actions={<div className="detail-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(`${current.lat}, ${current.lng}`);message('已复制 WGS-84 坐标');}catch{message('无法自动复制，请长按坐标手动复制');}}}>复制坐标</button><button onClick={()=>setEditing(current)}><Pencil size={15}/>编辑</button>{!current.demo&&<button onClick={()=>setExchange({type:'export',ids:[current.id]})}><Download size={15}/>导出这个地点</button>}<button className="danger" onClick={()=>{if(confirm(`删除“${current.name}”？此操作不可撤销。`)&&save(places.filter(p=>p.id!==current.id))){closeDetail();message('地点已删除');}}}><Trash2 size={15}/>删除</button></div>}/>
  </div>}
  {noteOpen&&current&&<div className="overlay visit-overlay"><section className="dialog visit-dialog" role="dialog" aria-modal="true" aria-label="完整备注"><div className="visit-scroll"><h2>现场备注</h2><p className="visit-notes">{current.notes}</p></div><div className="visit-bottom"><button type="button" autoFocus onClick={()=>setNoteOpen(false)}>关闭备注</button></div></section></div>}
  {visitOverlay?.mode==='read'&&<VisitReader trip={visitOverlay.trip} vehicle={vehicle} onEdit={trip=>setVisitOverlay({trip,mode:'edit'})} onClose={()=>setVisitOverlay(null)}/>}
  {visitOverlay?.mode==='edit'&&<VisitEditor trip={visitOverlay.trip} vehicle={vehicle} onClose={()=>setVisitOverlay(null)} onSave={saveVisit}/>}
  {vehicleOpen&&<VehicleEditor vehicle={vehicle} onClose={()=>setVehicleOpen(false)} onSave={value=>{
   if(!save(places,{nextVehicle:value}))return false;
   setVehicleOpen(false);message('已保存车辆：'+value.model);return true;
  }}/>}
  {editing&&<Editor place={editing} vehicle={vehicle} saveError={editorError} onClose={()=>{setEditorError('');setEditing(null);}} onSave={p=>{
   setEditorError('');
   const next=editing.id?places.map(x=>x.id===p.id?p:x):[p,...places];
   if(save(next,{editor:true})){
    setQuery('');setCategory('全部');setOnlyFavorites(false);setView('list');
    setEditing(null);setSelected(null);
    message('已保存到首页：'+p.name);
   }
  }}/>}
  {exchange?.type==='export'&&<PlaceExportDialog places={places} initialIds={exchange.ids} onClose={()=>setExchange(null)} onExport={exportPicked}/>}
  {exchange?.type==='import'&&<PlaceImportDialog existing={places} vehicle={vehicle} document={exchange.document} ownBackupDefault={exchange.ownBackupDefault} onClose={()=>setExchange(null)} onConfirm={confirmImport}/>}
  {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
 </div>
}
function Editor({place,vehicle,onClose,onSave,saveError}){
 const [draft,setDraft]=useState({name:'',lat:'',lng:'',category:'其他',status:'待核实',notes:'',facilities:[],heightLimit:'',verifiedAt:'',photos:[],...place}),[error,setError]=useState(''),[system,setSystem]=useState('wgs84'),[link,setLink]=useState(place.shareText||''),[preview,setPreview]=useState(null),[verificationLink,setVerificationLink]=useState(''),[importError,setImportError]=useState(''),[resolving,setResolving]=useState(false),[photoBusy,setPhotoBusy]=useState(false);
 const [conflict,setConflict]=useState(false);
 const [firstVisit,setFirstVisit]=useState(()=>newVisitDraft(vehicle));
 const [visitStarted,setVisitStarted]=useState(false);
 function updateFirstVisit(key,value){
  setVisitStarted(true);setFirstVisit(d=>({...d,[key]:value}));
 }
 function submitPlace(e){
  e.preventDefault();
  if(resolving||photoBusy||conflict)return;
  setError('');
  try{
   const visit=draft.id||!visitStarted?null:finalizeVisit(firstVisit);
   const creation=draft.id?{}:{createdAt:new Date().toISOString(),...(visit?{visitReports:[visit]}:{})};
   onSave(validatePlace({...draft,...creation,...toWgs(draft.lat,draft.lng,system)}));
  }catch(err){setError(err.message);}
 }

 const request=useRef(0),draftRef=useRef(draft),owned=useRef({name:false,coordinates:false});
 const linkRef=useRef(link),autoRead=useRef(null),activeRead=useRef(null);
 function updateDraft(next){draftRef.current=next;setDraft(next);}
 function clearAutoImport(){
  const {name,coordinates}=owned.current;
  owned.current={name:false,coordinates:false};
  if(name||coordinates)updateDraft({...draftRef.current,...(name?{name:''}:{}),...(coordinates?{lat:'',lng:''}:{})});
  if(coordinates)setSystem('wgs84');
 }
 function resetImport(){
  clearTimeout(autoRead.current);autoRead.current=null;
  activeRead.current=null;
  request.current++;
  clearAutoImport();
  setResolving(false);setPreview(null);setVerificationLink('');setImportError('');setConflict(false);
 }
 function applyImported(result){
  const d=draftRef.current,name=!!result.name&&!d.name.trim();
  owned.current={name,coordinates:true};
  updateDraft({...d,lat:result.lat,lng:result.lng,name:name?result.name:d.name});
  setSystem('wgs84');setConflict(false);
 }
 function showResult(result,value){
  setPreview(result);
  setVerificationLink(result.verificationUrl||mapLinkFromText(value)||'');
  const d=draftRef.current;
  if(d.lat!==''||d.lng!==''){setConflict(true);return;}
  applyImported(result);
 }
 async function showLinkPreview(value){
  if(activeRead.current===value)return;
  resetImport();
  const token=request.current;
  const stillCurrent=()=>token===request.current;
  activeRead.current=value;
  setResolving(true);
  try{
   const result=await resolveSharedPoint(value,stillCurrent);
   if(stillCurrent())showResult(result,value);
  }catch(err){if(stillCurrent())setImportError(shareError(err));}
  finally{if(stillCurrent()){activeRead.current=null;setResolving(false);}}
 }
 useEffect(()=>{
  if(place.shareText)showLinkPreview(place.shareText);
  return ()=>{clearTimeout(autoRead.current);request.current++;};
 },[]);
 const set=(key,value)=>{
  if(key==='lat'||key==='lng')owned.current.coordinates=false;
  if(key==='name')owned.current.name=false;
  updateDraft({...draftRef.current,[key]:value});
 };
 const approximate=preview?.requiresConfirmation===true;
 const originalLink=verificationLink||(importError?mapLinkFromText(link):null);
 const originalShort=baiduShortLink(link);
 function changeLink(value){
  if(value===linkRef.current)return;
  linkRef.current=value;
  resetImport();setLink(value);
  const candidateLink=mapLinkFromText(value);
  if(!candidateLink)return;
  if(shortMapLink(value)){
   if(Capacitor.getPlatform()==='android'){
    // Android keyboards can insert clipboard text with input/change, not a paste event.
    const token=request.current;
    autoRead.current=setTimeout(()=>{
     if(token===request.current&&linkRef.current===value)showLinkPreview(value);
    },450);
   }
  }else{
   try{showResult(parseMapLink(candidateLink),value);}catch{/* Wait for committed paste or explicit retry to explain failure. */}
  }
 }
 function pasteLink(event){
  const value=event.clipboardData?.getData('text/plain')?.trim();
  if(!value||!mapLinkFromText(value))return;
  event.preventDefault();
  linkRef.current=value;
  setLink(value);
  showLinkPreview(value);
 }
 useEffect(()=>{const handler=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',handler);return ()=>document.removeEventListener('keydown',handler);},[]);
 return <div className={"overlay place-editor-overlay"+(Capacitor.getPlatform()==='android'?' place-editor-android':'')}><section className="dialog editor place-editor" role="dialog" aria-modal="true" aria-label={place.id?'编辑地点':'添加地点'}><div className="place-editor-scroll"><button className="close" aria-label="关闭表单" onClick={onClose}><X/></button><span className="eyebrow">SAVE A LITTLE WILD</span><h2>{place.id?'完善这个落脚点':'记录新的落脚点'}</h2><p>留下位置，也留下对下一次出发有用的信息。</p><details open={place.shareText?true:undefined}>
  <summary>从地图链接导入</summary>
  <label>地图分享链接<input type="text" inputMode="url" maxLength={8192} value={link} onChange={e=>changeLink(e.target.value)} onPaste={pasteLink}/></label>
  {resolving&&<p className="hint" role="status">正在读取地图点位…</p>}
  {!resolving&&link.trim()&&!preview&&<button type="button" onClick={()=>showLinkPreview(link)}>{importError?'重试读取链接':'读取链接'}</button>}
  {importError&&<p className="warning" role="alert">{importError}</p>}
  {originalLink&&<p className="hint"><a href={originalLink} target="_blank" rel="noreferrer">打开原地图链接</a></p>}
  {verificationLink&&originalShort&&verificationLink!==originalShort&&<p className="hint"><a href={originalShort} target="_blank" rel="noreferrer">打开原分享短链接</a></p>}
  {preview&&<div>
   <p>来源：{preview.source} · {preview.datum.toUpperCase()} · {preview.original.lat.toFixed(6)}, {preview.original.lng.toFixed(6)}</p>
   {preview.assumedDatum&&<p className="hint">按来源地图坐标约定换算，请核对原图钉：{preview.name||'无名称'}。</p>}
   {approximate&&<p className="warning" role="status">这是地图画面中心换算出的近似点，不一定是地点图钉或停车入口。请核对后再保存。</p>}
   <p>{conflict?'链接坐标':approximate?'已填近似坐标':'已填坐标'}（WGS-84）：{preview.lat.toFixed(6)}, {preview.lng.toFixed(6)}</p>
   {approximate&&<p className="hint"><a href={baiduCandidateMarkerUrl(preview.original)} target="_blank" rel="noreferrer">在百度地图看候选点</a></p>}
   {conflict&&<div><p className="warning" role="status">表单已有坐标，未覆盖。请选择保留这组坐标，或整组替换。</p><button type="button" onClick={()=>applyImported(preview)}>替换为链接位置</button><button type="button" onClick={()=>{setConflict(false);setPreview(null);}}>保留当前坐标</button></div>}
  </div>}
  <p className="hint">粘贴高德、百度、腾讯、Google 地图链接，自动尝试填写，再核对并保存。查短链接需联网，不上传备注或保存链接。</p>
 </details><form id="place-editor-form" onSubmit={submitPlace}><label>地点名称<input autoFocus required maxLength={80} value={draft.name} onChange={e=>set('name',e.target.value)} placeholder="例如：湖边停车场"/></label><label>输入坐标系<select disabled={resolving} value={system} onChange={e=>{owned.current.coordinates=false;setSystem(e.target.value);}}><option value="wgs84">GPS / WGS-84</option><option value="gcj02">高德 / 腾讯 (GCJ-02)</option><option value="bd09">百度经纬度 (BD-09)</option></select></label><div className="form-row"><label>纬度<input required disabled={resolving} type="number" step="any" min="-90" max="90" value={draft.lat} onChange={e=>set('lat',e.target.value)} placeholder="30.250000"/></label><label>经度<input required disabled={resolving} type="number" step="any" min="-180" max="180" value={draft.lng} onChange={e=>set('lng',e.target.value)} placeholder="120.150000"/></label></div><p className="hint">请选择与来源一致的坐标系。保存时近似转换为 WGS-84，仅有地点编号或坐标系不明的链接不会填入；百度桌面地址的画面中心只供确认。导航前请核对落点。</p><div className="form-row"><label>地点类型<select value={draft.category} onChange={e=>set('category',e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>开放状态<select value={draft.status} onChange={e=>set('status',e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label></div><fieldset><legend>已确认的设施</legend>{facilities.map(f=><label className="checkbox" key={f}><input type="checkbox" checked={draft.facilities.includes(f)} onChange={e=>set('facilities',e.target.checked?[...draft.facilities,f]:draft.facilities.filter(x=>x!==f))}/>{f}</label>)}</fieldset><div className="form-row"><label>实测限高（米，可不填）<input type="number" step="0.01" min="0.01" max="10" value={draft.heightLimit} onChange={e=>set('heightLimit',e.target.value)}/></label><label>核实日期（可不填）<input type="date" max={new Date().toISOString().slice(0,10)} value={draft.verifiedAt} onChange={e=>set('verifiedAt',e.target.value)}/></label></div><label>现场备注<textarea rows="3" maxLength={2000} value={draft.notes} onChange={e=>set('notes',e.target.value)} placeholder="入口路况、收费、夜间环境、是否允许过夜…"/></label>{!place.id&&<section className="first-visit" aria-labelledby="first-visit-title"><h3 id="first-visit-title">我的实测 <span>首次到访</span></h3><VisitFields draft={firstVisit} onChange={updateFirstVisit} inline/>{visitStarted&&<button type="button" onClick={()=>{setFirstVisit(newVisitDraft(vehicle));setVisitStarted(false);setError('');}}>清空实测，先只收藏地点</button>}</section>}<PhotoEditor photos={draft.photos} onChange={value=>set('photos',value)} busy={photoBusy} onBusy={setPhotoBusy}/></form></div>{(error||saveError)&&<p role="alert" className="warning place-editor-error">{error||saveError}</p>}<div className="form-actions place-editor-footer"><button type="button" onClick={onClose}>取消</button><button className="primary" form="place-editor-form" type="submit" disabled={resolving||photoBusy||conflict}><Check size={18}/>保存地点</button></div></section></div>
}
createRoot(document.getElementById('root')).render(<App/>);
