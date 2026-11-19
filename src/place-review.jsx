import React from 'react';
import {PLACE_REVIEW_MAX} from './data.js';
import './place-review.css';

const ratings=[['','未评分'],[1,'1 分 · 不喜欢'],[2,'2 分 · 不太喜欢'],[3,'3 分 · 一般'],[4,'4 分 · 喜欢'],[5,'5 分 · 很喜欢']];

export function PlaceRatingEditor({rating,review,onChange}){
 return <section className="place-review-editor" aria-label="我的点评">
  <h3>我的点评 <small>可不填</small></h3>
  <p className="hint">别人推荐的地点可以先存着，之后再按自己的感受评分。</p>
  <label>我的评分 <select value={rating??''} onChange={e=>onChange('rating',e.target.value===''?'':Number(e.target.value))}>
   {ratings.map(([value,text])=><option key={value} value={value}>{text}</option>)}
  </select></label>
  <label>我的短评 <textarea value={review??''} onChange={e=>onChange('review',e.target.value)}
   maxLength={PLACE_REVIEW_MAX} rows={2} placeholder="例如：风景好，但晚上有点吵。"/></label>
 </section>;
}

export function PlaceRating({place,showReview=false}){
 if(!place.rating&&(!showReview||!place.review))return null;
 return <div className={'place-rating'+(showReview?' place-rating-detail':'')}>
  {place.rating&&<span className="place-rating-score" aria-label={`我的评分 ${place.rating} 分，满分 5 分`}><span aria-hidden="true">★</span> {place.rating} / 5</span>}
  {showReview&&place.review&&<div className="place-review-copy"><strong>我的短评</strong><p className="notes">{place.review}</p></div>}
 </div>;
}

export function PlaceSort({value,onChange}){
 return <label className="place-sort"><span>排序</span><select aria-label="地点排序" value={value} onChange={e=>onChange(e.target.value)}>
  <option value="default">默认顺序</option>
  <option value="recent">最近添加</option>
  <option value="rating">评分从高到低</option>
  <option value="name">按名称</option>
 </select></label>;
}
