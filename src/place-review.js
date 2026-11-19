const recentTime=place=>{
 const timestamp=Date.parse(place.createdAt);
 return Number.isFinite(timestamp)?timestamp:-Infinity;
};
const ratingValue=place=>Number.isInteger(place.rating)&&place.rating>=1&&place.rating<=5?place.rating:0;
const byName=new Intl.Collator('zh-CN',{numeric:true,sensitivity:'base'});

export function sortPlaces(places,order='default'){
 switch(order){
  case 'recent':return [...places].sort((a,b)=>{
   const timeA=recentTime(a),timeB=recentTime(b);
   return timeA===timeB?0:timeA>timeB?-1:1;
  });
  case 'rating':return [...places].sort((a,b)=>ratingValue(b)-ratingValue(a));
  case 'name':return [...places].sort((a,b)=>byName.compare(a.name,b.name));
  default:return places;
 }
}
