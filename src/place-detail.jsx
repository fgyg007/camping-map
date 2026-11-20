import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Tent,X} from 'lucide-react';
import './place-detail.css';

const PAGES=['概览','导航','照片','车友实测'];
const GESTURE_IGNORE='button,a,input,select,textarea,label,summary,.photo-viewer,[role="button"],[contenteditable="true"]';
const FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]';
const neighborId=place=>typeof place==='string'?place:place?.id;

export function PlaceDetail({place,neighbors={},onSelect,onClose,overview,navigation,photos,reports,actions}){
 const [screen,setScreen]=useState({placeId:place.id,index:0});
 const page=screen.placeId===place.id?screen.index:0;
 const slots=[<>{overview}{actions}</>,navigation,photos,reports];
 const previous=neighborId(neighbors.previous),next=neighborId(neighbors.next);
 const uid=useId(),dialog=useRef(null),scroll=useRef(null),closeButton=useRef(null);
 const gesture=useRef(null),tabButtons=useRef([]);

 useEffect(()=>{
  const from=document.activeElement;
  closeButton.current?.focus({preventScroll:true});
  return ()=>{if(from instanceof HTMLElement&&from.isConnected)from.focus({preventScroll:true});};
 },[]);

 useLayoutEffect(()=>{
  setScreen(current=>current.placeId===place.id?current:{placeId:place.id,index:0});
 },[place.id]);

 useLayoutEffect(()=>{
  if(scroll.current)scroll.current.scrollTop=0;
  gesture.current=null;
 },[place.id,page]);

 function changePage(index,{focus=false}={}){
  if(index<0||index>=PAGES.length)return;
  setScreen({placeId:place.id,index});
  if(focus)tabButtons.current[index]?.focus({preventScroll:true});
 }

 function goToPlace(id){
  if(!id||id===place.id)return;
  closeButton.current?.focus({preventScroll:true});
  onSelect(id);
 }

 function onKeyDown(event){
  if(event.defaultPrevented)return;
  if(event.key==='Escape'){
   event.preventDefault();event.stopPropagation();onClose();return;
  }
  if(event.key==='Tab'){
   const nodes=[...dialog.current.querySelectorAll(FOCUSABLE)].filter(node=>node.tabIndex>=0&&node.getClientRects().length);
   const first=nodes[0],last=nodes.at(-1);
   if(first&&event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(last&&!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   return;
  }
  const inTab=event.target.closest('[role="tab"]');
  if(inTab){
   const index=event.key==='Home'?0:event.key==='End'?PAGES.length-1:
    event.key==='ArrowLeft'?(page+PAGES.length-1)%PAGES.length:
    event.key==='ArrowRight'?(page+1)%PAGES.length:null;
   if(index!==null){event.preventDefault();changePage(index,{focus:true});}
  }
 }

 function beginGesture(event,axis){
  // Touch only. Controls, links and photo viewers keep their original behavior.
  if(event.pointerType!=='touch'||!event.isPrimary||event.target.closest(GESTURE_IGNORE))return;
  gesture.current={axis,id:event.pointerId,x:event.clientX,y:event.clientY,t:event.timeStamp};
 }
 function endGesture(event,axis){
  const start=gesture.current;
  if(!start||start.axis!==axis||start.id!==event.pointerId)return;
  gesture.current=null;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  const distance=axis==='x'?dx:dy,cross=axis==='x'?dy:dx;
  if(event.timeStamp-start.t>800||Math.abs(distance)<44||Math.abs(distance)<Math.abs(cross)*1.6)return;
  if(axis==='x')changePage(page+(distance<0?1:-1));
  else goToPlace(distance<0?next:previous);
 }
 function cancelGesture(event){
  if(gesture.current?.id===event.pointerId)gesture.current=null;
 }

 return <div className="overlay" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <section className="dialog detail detail-pager" role="dialog" aria-modal="true" aria-label="地点详情"
   ref={dialog} onKeyDown={onKeyDown}>
   <div className={'detail-pager-cover scenery-'+place.category}
    onPointerDown={event=>beginGesture(event,'y')} onPointerUp={event=>endGesture(event,'y')} onPointerCancel={cancelGesture}>
    <div className="detail-pager-symbol"><Tent size={28} aria-hidden="true"/></div>
    <div className="detail-pager-title">
     <p>{place.category} · {place.demo?'演示地点':'我的地点'}</p>
     <h2>{place.name}</h2>
    </div>
    {(previous||next)&&<span className="detail-pager-gesture"><ChevronUp size={12} aria-hidden="true"/>上下滑切换地点<ChevronDown size={12} aria-hidden="true"/></span>}
   </div>
   <div className="detail-pager-tabs" role="tablist" aria-label="详情分页">
    {PAGES.map((title,index)=><button key={title} type="button" role="tab" id={uid+'-tab-'+index}
     aria-controls={uid+'-page-'+index} aria-selected={page===index} tabIndex={page===index?0:-1}
     ref={node=>{tabButtons.current[index]=node;}} onClick={()=>changePage(index)}>{title}</button>)}
   </div>
   <div className="detail-pager-scroll" ref={scroll} onPointerDown={event=>beginGesture(event,'x')}
    onPointerUp={event=>endGesture(event,'x')} onPointerCancel={cancelGesture}>
    {PAGES.map((title,index)=><div key={title} className="detail-body detail-pager-page" role="tabpanel"
     id={uid+'-page-'+index} aria-labelledby={uid+'-tab-'+index} hidden={index!==page} tabIndex={index===page?0:-1}>
     {index===page&&(slots[index]||<p className="hint">暂无{title}。</p>)}
    </div>)}
   </div>
   <div className="detail-pager-footer">
    <button type="button" className="detail-pager-step" disabled={!previous} onClick={()=>goToPlace(previous)}><ChevronUp size={17} aria-hidden="true"/>上一地点</button>
    <button type="button" className="primary detail-pager-close" aria-label="关闭详情" ref={closeButton} onClick={onClose}><X size={18} aria-hidden="true"/>关闭</button>
    <button type="button" className="detail-pager-step" disabled={!next} onClick={()=>goToPlace(next)}><ChevronDown size={17} aria-hidden="true"/>下一地点</button>
   </div>
  </section>
 </div>;
}
