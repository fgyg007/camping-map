import React,{useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import {ArrowLeft,MapPin} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './place-overview.css';

const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_CREDIT='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap 贡献者</a>';
const isPoint=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
const pointXY=p=>[Math.max(-85.0511,Math.min(85.0511,p.lat)),p.lng];

// Group coincident pins without moving the saved coordinates; the map lets
// people choose the exact record rather than selecting whichever pin is on top.
function groupPins(places){
 const groups=new Map();
 for(const p of places){
  const key=pointXY(p).map(n=>n.toFixed(5)).join(',');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(p);
 }
 return groups;
}

export function PlaceOverview({places,onSelect,onClose}){
 const canvas=useRef(null),map=useRef(null),markers=useRef(null),select=useRef(onSelect);
 const [online,setOnline]=useState(false),[tileError,setTileError]=useState(false),[nearby,setNearby]=useState(null);
 const points=useMemo(()=>places.filter(isPoint),[places]);
 const groups=useMemo(()=>groupPins(points),[points]);
 select.current=onSelect;

 function fitPoints(){
  const instance=map.current;
  if(!instance||!points.length)return;
  instance.invalidateSize({pan:false});
  if(points.length===1)instance.setView(pointXY(points[0]),12);
  else instance.fitBounds(L.latLngBounds(points.map(pointXY)),{paddingTopLeft:[32,40],paddingBottomRight:[36,32],maxZoom:13,animate:false});
 }

 useEffect(()=>{
  if(!canvas.current||!points.length)return;
  const instance=L.map(canvas.current,{zoomControl:false,attributionControl:false,minZoom:0,maxZoom:19,
    maxBounds:[[-85.0511,-180],[85.0511,180]],maxBoundsViscosity:1}).setView([30,110],4);
  map.current=instance;
  markers.current=L.layerGroup().addTo(instance);
  L.control.zoom({position:'bottomright',zoomInTitle:'放大地图',zoomOutTitle:'缩小地图'}).addTo(instance);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>instance.invalidateSize({pan:false})):null;
  observer?.observe(canvas.current);
  return ()=>{
   observer?.disconnect();instance.remove();map.current=null;markers.current=null;
  };
 },[Boolean(points.length)]);

 useEffect(()=>{
  if(!markers.current)return;
  markers.current.clearLayers();
  setNearby(null);
  for(const group of groups.values()){
   const count=group.length;
   const title=count===1?group[0].name+(group[0].demo?'（演示）':''):`这里有 ${count} 个地点`;
   const icon=L.divIcon({className:'place-overview-pin',html:`<span aria-hidden="true">${count===1?'•':count}</span>`,
    iconSize:[31,35],iconAnchor:[15,34],tooltipAnchor:[0,-30]});
   const marker=L.marker(pointXY(group[0]),{icon,title,keyboard:true,riseOnHover:true}).addTo(markers.current);
   const label=document.createElement('span');
   label.textContent=title;
   marker.bindTooltip(label,{direction:'top'});
   marker.getElement()?.setAttribute('aria-label',`地图图钉：${title}`);
   marker.on('click',()=>count===1?select.current(group[0].id):setNearby(group));
  }
  fitPoints();
 },[groups]);

 useEffect(()=>{
  if(!online||!map.current||!points.length)return;
  const instance=map.current;
  const credit=L.control.attribution({position:'bottomleft',prefix:false}).addTo(instance);
  const tiles=L.tileLayer(TILE_URL,{maxZoom:19,noWrap:true,attribution:OSM_CREDIT});
  const error=()=>{setTileError(true);setOnline(false);};
  tiles.on('tileerror',error).addTo(instance);
  return ()=>{tiles.off('tileerror',error);tiles.remove();credit.remove();};
 },[online,Boolean(points.length)]);

 function toggleOnline(){
  setTileError(false);
  setOnline(value=>!value);
 }

 return <section className="place-overview" aria-label="地图总览">
  <div className="place-overview-heading">
   <div><h2>地图总览</h2><p>{points.length} 个地点 · 不受列表筛选影响</p></div>
   <button type="button" onClick={onClose}><ArrowLeft size={15} aria-hidden="true"/>返回列表</button>
  </div>
  {points.length>0?<><div className="place-overview-actions">
   <button type="button" onClick={fitPoints}>查看全部图钉</button>
   <button type="button" aria-pressed={online} onClick={toggleOnline}>{online?'关闭在线底图':'加载在线底图'}</button>
  </div>
  <p className="place-overview-hint">图钉保存在本机，仅作位置预览，不用于导航。在线底图开启后会按当前地图范围向 OpenStreetMap 请求图片。</p>
  <div className="place-overview-frame">
   <div className="place-overview-canvas" ref={canvas} aria-label="全部地点图钉"/>
   {!online&&<span className="place-overview-mode">离线示意 · 无底图</span>}
  </div>
  {tileError&&<p className="warning" role="status">在线底图暂时无法加载，仍可查看本机图钉。</p>}
  {nearby&&<section className="place-overview-nearby" aria-label="同一位置的图钉">
   <h3>这一处有 {nearby.length} 个地点</h3>
   <div>{nearby.map(p=><button key={p.id} type="button" onClick={()=>{setNearby(null);onSelect(p.id);}}><MapPin size={15} aria-hidden="true"/>{p.name}{p.demo?'（演示）':''}</button>)}</div>
   <button type="button" onClick={()=>setNearby(null)}>收起该位置</button>
  </section>}
  <details className="place-overview-directory"><summary>按名称查看图钉（{points.length}）</summary>
   <div>{points.map(p=><button key={p.id} type="button" onClick={()=>onSelect(p.id)}><MapPin size={15} aria-hidden="true"/>{p.name}{p.demo?'（演示）':''}</button>)}</div>
  </details></>:<p className="place-overview-empty">这里还没有图钉，添加第一个地点后就会显示在地图上。</p>}
 </section>;
}
