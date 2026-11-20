import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Tent,X} from 'lucide-react';
import {PlaceRating,PlaceRatingEditor} from './place-review.jsx';
import './place-detail.css';

const PAGES=['概览','导航','照片','车友实测'];
const GESTURE_IGNORE='button,a,input,select,textarea,label,summary,.photo-viewer,.detail-review-edit,[role="button"],[contenteditable="true"]';
const FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]';
const neighborId=place=>typeof place==='string'?place:place?.id;

export function PlaceDetail({place,neighbors={},onSelect,onClose,onSaveReview,overview,navigation,photos,reports,actions}){
 const [screen,setScreen]=useState({placeId:place.id,index:0});
 const [reviewDrafts,setReviewDrafts]=useState(()=>new Map());
 const page=screen.placeId===place.id?screen.index:0;
 const reviewDraft=reviewDrafts.get(place.id);
 const reviewEdit=useRef(null),reviewButton=useRef(null),restoreReviewFocus=useRef(false);
 const hasReview=Boolean(place.rating||place.review);
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

 useLayoutEffect(()=>{
  if(page!==0)return;
  if(restoreReviewFocus.current&&!reviewDraft){
   restoreReviewFocus.current=false;
   reviewButton.current?.focus();
  } else if(reviewDraft)reviewEdit.current?.querySelector('select')?.focus();
 },[place.id,page,Boolean(reviewDraft)]);

 function updateReviewDraft(value){
  setReviewDrafts(current=>{
   const next=new Map(current);
   if(value)next.set(place.id,value);else next.delete(place.id);
   return next;
  });
 }

 function beginReview(){
  const rating=place.rating??'',review=place.review??'';
  updateReviewDraft({rating,review,initialRating:rating,initialReview:review,error:''});
 }

 function finishReview(){
  restoreReviewFocus.current=true;
  updateReviewDraft(null);
 }

 function submitReview(event){
  event.preventDefault();
  try{
   const saved=onSaveReview(place.id,{rating:reviewDraft.rating,review:reviewDraft.review});
   if(saved===false)throw Error('未保存点评，请检查存储空间后重试。');
   finishReview();
  } catch(error){updateReviewDraft({...reviewDraft,error:error?.message||'暂时无法保存点评。'});}
 }

 function requestClose(){
  const dirty=[...reviewDrafts.values()].some(draft=>draft.rating!==draft.initialRating||draft.review!==draft.initialReview);
  if(!dirty||window.confirm('还有未保存的点评，确定关闭详情并放弃这些修改吗？'))onClose();
 }

 const review=onSaveReview&&<section className="detail-review" aria-label="我的私人点评">
  {reviewDraft?<form className="detail-review-edit" ref={reviewEdit} onSubmit={submitReview}>
   <PlaceRatingEditor rating={reviewDraft.rating} review={reviewDraft.review}
    onChange={(field,value)=>updateReviewDraft({...reviewDraft,[field]:value,error:''})}/>
   {reviewDraft.error&&<p className="warning" role="alert">{reviewDraft.error}</p>}
   <div className="detail-review-controls">
    <button type="button" onClick={finishReview}>取消点评</button>
    <button type="submit" className="primary">保存点评</button>
   </div>
  </form>:<>
   <h3>我的点评 <small>仅自己可见</small></h3>
   {hasReview?<PlaceRating place={place} showReview/>:<p className="hint">还没评分或写短评。喜欢不喜欢，都可以自己记下来。</p>}
   <button type="button" className="detail-review-open" ref={reviewButton} onClick={beginReview}>{hasReview?'编辑点评':'添加点评'}</button>
  </>}
 </section>;
 const slots=[<>{overview}{review}{actions}</>,navigation,photos,reports];

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
   event.preventDefault();event.stopPropagation();requestClose();return;
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

 return <div className="overlay" onClick={event=>{if(event.target===event.currentTarget)requestClose();}}>
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
    <button type="button" className="primary detail-pager-close" aria-label="关闭详情" ref={closeButton} onClick={requestClose}><X size={18} aria-hidden="true"/>关闭</button>
    <button type="button" className="detail-pager-step" disabled={!next} onClick={()=>goToPlace(next)}><ChevronDown size={17} aria-hidden="true"/>下一地点</button>
   </div>
  </section>
 </div>;
}
