import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import L from 'leaflet';
import {Capacitor,registerPlugin} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {Tent,MapPin,Plus,Search,Heart,Map as MapIcon,List,ArrowUpRight,X,Download,Upload,Trash2,SlidersHorizontal,Navigation,Check,Mountain,Trees,Waves,Car, Pencil} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './style.css';
import {samples,categories,statuses,facilities,validatePlace,parseBackup,navigationUrl} from './data.js';
import {toWgs,amapRoute} from './coordinates.js';
import {parseMapLink} from './map-link.js';
import {amapShortFromText,parseAmapLocation} from './amap-share.js';
const MapShare=registerPlugin('MapShare');
const KEY='camping-map-v1';
const symbols={'湖畔':Waves,'山野':Trees,'海边':Waves,'服务区':Car,'其他':Mountain};
function load(){try{const raw=localStorage.getItem(KEY);return {places:raw?parseBackup(raw):samples,error:''};}catch{return {places:[],error:'本机数据无法读取。为保护原记录，暂不覆盖；请先导出原始数据备份，再刷新重试。'};}}
function App(){
 const [initial]=useState(load),[places,setPlaces]=useState(initial.places),[storageError,setStorageError]=useState(initial.error),[query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[onlyFavorites,setOnlyFavorites]=useState(false),[selected,setSelected]=useState(null),[editing,setEditing]=useState(null),[view,setView]=useState('map'),[toast,setToast]=useState(''),[tileError,setTileError]=useState(false),[incoming,setIncoming]=useState('');
 const mapEl=useRef(null),map=useRef(null),markers=useRef(null),file=useRef(null);
 const filtered=places.filter(p=>(category==='全部'||p.category===category)&&(!onlyFavorites||p.favorite)&&(p.name+p.notes+p.category).toLowerCase().includes(query.toLowerCase()));
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
 function save(next){if(storageError){message('请先导出原始数据，解决读取错误后重试');return false;}try{localStorage.setItem(KEY,JSON.stringify({version:1,places:next}));setPlaces(next);return true;}catch{message('保存失败：设备存储不可用或空间不足，请导出备份');return false;}}
 useEffect(()=>{
  map.current=L.map(mapEl.current,{zoomControl:false}).setView([30.35,120.13],9);
  L.control.zoom({position:'bottomright'}).addTo(map.current);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).on('tileerror',()=>setTileError(true)).addTo(map.current);
  markers.current=L.layerGroup().addTo(map.current);
  return ()=>{map.current.remove();};
 },[]);
 useEffect(()=>{markers.current.clearLayers();filtered.forEach(p=>{
  const icon=L.divIcon({className:'camp-marker',html:`<span class="${p.id===selected?'active':''}">${p.category==='山野'?'♠':'⌂'}</span>`,iconSize:[38,42],iconAnchor:[19,42]});
  const marker=L.marker([p.lat,p.lng],{icon}).addTo(markers.current).on('click',()=>setSelected(p.id));
  const label=document.createElement('span');label.textContent=p.name;marker.bindTooltip(label);
 });},[places,query,category,onlyFavorites,selected]);
 useEffect(()=>{if(current)map.current.flyTo([current.lat,current.lng],12,{duration:.6});},[selected]);
 useEffect(()=>{setTimeout(()=>map.current.invalidateSize(),100);},[view]);
 function toggle(p){save(places.map(x=>x.id===p.id?{...x,favorite:!x.favorite}:x));}
 async function download(){try{const raw=storageError?localStorage.getItem(KEY):JSON.stringify({version:1,places},null,2);if(!raw)throw Error();if(Capacitor.isNativePlatform()){const saved=await Filesystem.writeFile({path:'camping-map-backup.json',data:raw,directory:Directory.Cache,encoding:Encoding.UTF8});await Share.share({title:'营地备份',url:saved.uri});return;}const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`camping-map-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);message('已生成备份文件');}catch{message('导出失败，请检查浏览器下载权限');}}
 async function importFile(e){const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>5e6)throw Error('备份文件不能超过 5 MB');const data=parseBackup(await f.text());const ids=new Set(places.map(x=>x.id));const added=data.filter(x=>!ids.has(x.id));if(save([...places,...added]))message(`已导入 ${added.length} 个地点，跳过 ${data.length-added.length} 个重复记录`);}catch(err){message('导入失败：'+err.message);}}
 return <div className="app">
  <aside className="rail"><div className="brand-icon"><Tent size={27}/></div><span className="rail-name">野泊</span><button className={!onlyFavorites?'rail-btn active':'rail-btn'} aria-label="所有地点" onClick={()=>setOnlyFavorites(false)}><MapIcon/></button><button className={onlyFavorites?'rail-btn active':'rail-btn'} aria-label="我的收藏" onClick={()=>setOnlyFavorites(!onlyFavorites)}><Heart/></button><div className="rail-bottom">在路上<br/>也自在</div></aside>
  <main><header><div><div className="eyebrow">WILD STAYS · 寻一处自在</div><h1>让旅途，有处落脚<span>。</span></h1><p>把喜欢的风景，存进自己的露营地图。</p></div><button className="primary" onClick={()=>setEditing({})}><Plus size={18}/>添加地点</button></header>
  <div className="toolbar"><div className="search"><Search size={19}/><input aria-label="搜索地点" placeholder="搜索地点、路况或备注…" value={query} onChange={e=>setQuery(e.target.value)}/></div><button className={'filter '+(onlyFavorites?'chosen':'')} onClick={()=>setOnlyFavorites(!onlyFavorites)}><Heart size={17}/><span>我的收藏</span></button><div className="view-switch"><button aria-label="地图视图" className={view==='map'?'chosen':''} onClick={()=>setView('map')}><MapIcon size={18}/></button><button aria-label="列表视图" className={view==='list'?'chosen':''} onClick={()=>setView('list')}><List size={18}/></button></div></div>
  <div className="category-row">{['全部',...categories].map(c=><button key={c} className={category===c?'chip chosen':'chip'} onClick={()=>setCategory(c)}>{c==='全部'?'全部地点':c}</button>)}<span className="local-label"><span/>仅保存在本机</span></div>
  {incoming&&<div className="warning" role="status">收到地图分享。 <button type="button" disabled={!!editing} onClick={()=>{setEditing({shareText:incoming});setIncoming('');}}>预览分享地点</button> <button type="button" onClick={()=>setIncoming('')}>忽略</button></div>}
  {storageError&&<div role="alert" className="warning">{storageError}</div>}
  <section className={'workspace '+(view==='list'?'list-mode':'')}>
   <div className="places-panel"><div className="panel-heading"><div><h2>{onlyFavorites?'收藏的风景':'探索落脚点'}</h2><span>{filtered.length} 个地点 · 慢下来，去看看</span></div><SlidersHorizontal size={18}/></div>
   <div className="cards">{filtered.length===0?<div className="empty"><Tent size={40}/><h3>下一站，由你发现</h3><p>试试其他筛选，或添加第一个地点。</p><button onClick={()=>setEditing({})}>添加地点 <Plus size={16}/></button></div>:filtered.map(p=>{const Icon=symbols[p.category];return <article key={p.id} className={'card '+(selected===p.id?'selected':'')}><button className="card-main" onClick={()=>{setSelected(p.id);}}><div className={'scenery scenery-'+p.category}><Icon size={30}/><span>{p.category}</span></div><div className="card-info"><div className="card-meta">{p.demo?'演示地点':'我的地点'}<span className={'status '+(p.status==='关闭'?'closed':'')}>{p.status}</span></div><h3>{p.name}</h3><p>{p.notes||'还没有备注，记录一些现场见闻吧。'}</p><div className="tags">{p.facilities.length?p.facilities.map(f=><span key={f}>{f}</span>):<span>设施待补充</span>}</div></div></button><button className={'favorite '+(p.favorite?'saved':'')} aria-label={`${p.favorite?'取消收藏':'收藏'}${p.name}`} onClick={()=>toggle(p)}><Heart size={17} fill={p.favorite?'currentColor':'none'}/></button></article>})}</div>
   <div className="panel-footer"><button onClick={download}><Download size={15}/>导出备份</button><button onClick={()=>file.current.click()}><Upload size={15}/>导入备份</button><input hidden ref={file} type="file" accept=".json,application/json" onChange={importFile}/></div></div>
   <div className="map-wrap"><div className="map-canvas" ref={mapEl}/><div className="map-caption"><span className="live-dot"/>一路的风景，都在这里<span className="map-caption-sub">在线底图 · WGS-84</span></div>{tileError&&<div className="map-error">底图暂时无法加载，地点列表仍可使用。请检查网络。<button onClick={()=>location.reload()}>重试</button></div>}<div className="map-note"><Tent size={18}/><span>留下坐标，带走回忆。</span></div></div>
  </section><footer><span>野泊 / 个人露营手账</span><span>演示地点未经实测 · 出行前请核实开放与通行情况</span><span>v0.1.0</span></footer>
  </main>
  {current&&!editing&&<div className="overlay" onClick={()=>setSelected(null)}><section className="dialog detail" role="dialog" aria-modal="true" aria-label="地点详情" onClick={e=>e.stopPropagation()}><button className="close" aria-label="关闭详情" onClick={()=>setSelected(null)}><X/></button><div className={'detail-art scenery-'+current.category}><Tent size={62}/><span>{current.category} / {current.demo?'演示地点':'我的地点'}</span></div><div className="detail-body"><span className="eyebrow">YOUR NEXT STAY</span><h2>{current.name}</h2><div className="tags"><span>{current.status}</span>{current.facilities.map(f=><span key={f}>{f}</span>)}</div><p className="notes">{current.notes||'暂无备注'}</p><dl><div><dt>WGS-84 坐标</dt><dd>{current.lat.toFixed(6)}, {current.lng.toFixed(6)}</dd></div><div><dt>现场限高</dt><dd>{current.heightLimit?`${current.heightLimit} 米`:'未记录，请现场确认'}</dd></div><div><dt>最近核实</dt><dd>{current.verifiedAt||'尚未核实'}</dd></div></dl>{current.demo&&<p className="warning">这是演示记录，不代表真实可露营地点。</p>}<a className="primary navigation" href={navigationUrl(current)} target="_blank" rel="noreferrer"><Navigation size={18}/>Google 地图导航<ArrowUpRight size={17}/></a>{amapRoute(current)&&<a className="primary navigation" href={amapRoute(current)} target="_blank" rel="noreferrer"><Navigation size={18}/>高德路线规划<ArrowUpRight size={17}/></a>}<p className="hint">打开路线规划会把目的地坐标发送给对应地图服务。导航需要网络；也可复制坐标到支持 WGS-84 的地图。</p><div className="detail-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(`${current.lat}, ${current.lng}`);message('已复制 WGS-84 坐标');}catch{message('无法自动复制，请长按坐标手动复制');}}}>复制坐标</button><button onClick={()=>setEditing(current)}><Pencil size={15}/>编辑</button><button className="danger" onClick={()=>{if(confirm(`删除“${current.name}”？此操作不可撤销。`)&&save(places.filter(p=>p.id!==current.id))){setSelected(null);message('地点已删除');}}}><Trash2 size={15}/>删除</button></div></div></section></div>}
  {editing&&<Editor place={editing} onClose={()=>setEditing(null)} onSave={p=>{const next=editing.id?places.map(x=>x.id===p.id?p:x):[p,...places];if(save(next)){setEditing(null);setSelected(p.id);message('地点已保存到本机');}}}/>}
  {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
 </div>
}
function Editor({place,onClose,onSave}){
 const [draft,setDraft]=useState({name:'',lat:'',lng:'',category:'其他',status:'待核实',notes:'',facilities:[],heightLimit:'',verifiedAt:'',...place}),[error,setError]=useState(''),[system,setSystem]=useState('wgs84'),[link,setLink]=useState(place.shareText||''),[preview,setPreview]=useState(null),[importError,setImportError]=useState(''),[resolving,setResolving]=useState(false);
 useEffect(()=>{
  if(!place.shareText)return;
  let alive=true;
  setResolving(true);
  (async()=>{
   try{
    const short=amapShortFromText(place.shareText);
    const result=short?parseAmapLocation((await MapShare.resolveAmap({url:short})).location):parseMapLink(place.shareText);
    if(!alive)return;
    setPreview(result);
    setDraft(d=>({...d,lat:d.lat===''?result.lat:d.lat,lng:d.lng===''?result.lng:d.lng,name:d.name||result.name||''}));
   }catch(err){
    if(alive)setImportError(String(err.message).startsWith('amap_')?'未能从高德取得明确地点，请核对网络与链接。':err.message);
   }finally{if(alive)setResolving(false);}
  })();
  return ()=>{alive=false;};
 },[]);
 const set=(key,value)=>setDraft({...draft,[key]:value});
 useEffect(()=>{const handler=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',handler);return ()=>document.removeEventListener('keydown',handler);},[]);
 return <div className="overlay"><section className="dialog editor" role="dialog" aria-modal="true" aria-label={place.id?'编辑地点':'添加地点'}><button className="close" aria-label="关闭表单" onClick={onClose}><X/></button><span className="eyebrow">SAVE A LITTLE WILD</span><h2>{place.id?'完善这个落脚点':'记录新的落脚点'}</h2><p>留下位置，也留下对下一次出发有用的信息。</p>{!place.id&&<details open={place.shareText?true:undefined}><summary>从地图长链接导入</summary><label>完整地图链接<input type="text" inputMode="url" maxLength={8192} value={link} disabled={resolving} onChange={e=>{setLink(e.target.value);setPreview(null);setImportError('');}} /></label><button type="button" disabled={resolving} onClick={async()=>{
  setResolving(true);setPreview(null);setImportError('');
  try{
   const short=amapShortFromText(link);
   if(short){
    if(Capacitor.getPlatform()!=='android')throw Error('高德短链接目前仅 Android 支持。');
    setPreview(parseAmapLocation((await MapShare.resolveAmap({url:short})).location));
   }else setPreview(parseMapLink(link));
  }catch(err){
   setImportError(String(err.message).startsWith('amap_')?'未能从高德取得明确地点，请核对网络与链接。':err.message);
  }finally{setResolving(false);}
 }}>{resolving?'正在向高德读取点位…':'预览链接坐标'}</button>{importError&&<p className="warning" role="alert">{importError}</p>}{preview&&<div><p>来源：{preview.source} · {preview.datum.toUpperCase()} · {preview.original.lat}, {preview.original.lng}</p>{preview.assumedDatum&&<p className="hint">按高德 GCJ-02 约定换算（分享格式未公开保证）。请核对原图钉：{preview.name||'无名称'}。</p>}<p>保存坐标（WGS-84）：{preview.lat.toFixed(6)}, {preview.lng.toFixed(6)}</p><button type="button" onClick={()=>{setDraft(d=>({...d,lat:preview.lat,lng:preview.lng,name:d.name||preview.name||''}));setSystem('wgs84');setPreview(null);setLink('');}}>填入表单</button></div>}<p className="hint">长链接仅在本机读取。Android 预览短链接时仅向高德请求跳转头，不上传备注或保存链接。填入后请核对并保存。</p></details>}<form onSubmit={e=>{e.preventDefault();try{onSave(validatePlace({...draft,...toWgs(draft.lat,draft.lng,system)}));}catch(err){setError(err.message);}}}><label>地点名称<input autoFocus required maxLength={80} value={draft.name} onChange={e=>set('name',e.target.value)} placeholder="例如：湖边停车场"/></label><label>输入坐标系<select disabled={resolving} value={system} onChange={e=>setSystem(e.target.value)}><option value="wgs84">GPS / WGS-84</option><option value="gcj02">高德 / 腾讯 (GCJ-02)</option><option value="bd09">百度经纬度 (BD-09)</option></select></label><div className="form-row"><label>纬度<input required disabled={resolving} type="number" step="any" min="-90" max="90" value={draft.lat} onChange={e=>set('lat',e.target.value)} placeholder="30.250000"/></label><label>经度<input required disabled={resolving} type="number" step="any" min="-180" max="180" value={draft.lng} onChange={e=>set('lng',e.target.value)} placeholder="120.150000"/></label></div><p className="hint">请选择与来源一致的坐标系。保存时近似转换为 WGS-84，不支持百度墨卡托或非高德分享短链；导航前请核对落点。</p><div className="form-row"><label>地点类型<select value={draft.category} onChange={e=>set('category',e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>开放状态<select value={draft.status} onChange={e=>set('status',e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label></div><fieldset><legend>已确认的设施</legend>{facilities.map(f=><label className="checkbox" key={f}><input type="checkbox" checked={draft.facilities.includes(f)} onChange={e=>set('facilities',e.target.checked?[...draft.facilities,f]:draft.facilities.filter(x=>x!==f))}/>{f}</label>)}</fieldset><div className="form-row"><label>实测限高（米，可不填）<input type="number" step="0.01" min="0.01" max="10" value={draft.heightLimit} onChange={e=>set('heightLimit',e.target.value)}/></label><label>核实日期（可不填）<input type="date" max={new Date().toISOString().slice(0,10)} value={draft.verifiedAt} onChange={e=>set('verifiedAt',e.target.value)}/></label></div><label>现场备注<textarea rows="3" maxLength={2000} value={draft.notes} onChange={e=>set('notes',e.target.value)} placeholder="入口路况、收费、夜间环境、是否允许过夜…"/></label>{error&&<p role="alert" className="warning">{error}</p>}<div className="form-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" type="submit" disabled={resolving}><Check size={18}/>保存地点</button></div></form></section></div>
}
createRoot(document.getElementById('root')).render(<App/>);
