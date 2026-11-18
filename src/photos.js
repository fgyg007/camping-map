export const MAX_PLACE_PHOTOS=3;
export const MAX_PHOTO_BYTES=90*1024;
const MAX_INPUT_BYTES=20*1024*1024;
const JPEG_PREFIX='data:image/jpeg;base64,';
const MAX_ENCODED_SIZE=Math.ceil(MAX_PHOTO_BYTES/3)*4;

export function validatePhotos(value){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>MAX_PLACE_PHOTOS)throw Error('每个地点最多保存 3 张照片');
 return value.map(photo=>{
  if(typeof photo!=='string'||!photo.startsWith(JPEG_PREFIX)||photo.length>JPEG_PREFIX.length+MAX_ENCODED_SIZE)throw Error('备份中的照片格式或大小无效');
  const data=photo.slice(JPEG_PREFIX.length);
  if(!data.startsWith('/9j/')||data.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||data.length*0.75-(data.endsWith('==')?2:data.endsWith('=')?1:0)>MAX_PHOTO_BYTES)throw Error('备份中的 JPEG 照片格式无效');
  return photo;
 });
}

export async function preparePhoto(file){
 if(!file||file.size>MAX_INPUT_BYTES)throw Error('单张原图不能超过 20 MB');
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise((resolve,reject)=>{
   const next=new Image();
   next.onload=()=>resolve(next);
   next.onerror=()=>reject(Error('不能读取这张照片，请改选 JPEG、PNG 或 WebP。'));
   next.src=url;
  });
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>70e6)throw Error('照片像素太大，请先缩小后重试。');
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('设备暂不能处理照片。');
  for(const edge of [960,768,592,448,336]){
   const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   ctx.fillStyle='#fff';
   ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.83,.70,.56]){
    const photo=canvas.toDataURL('image/jpeg',quality);
    if(photo.length<=JPEG_PREFIX.length+MAX_ENCODED_SIZE){
     try{return validatePhotos([photo])[0];}catch{/* Try another size. */}
    }
   }
  }
  throw Error('这张照片无法压缩到可保存大小，请另选一张。');
 }finally{URL.revokeObjectURL(url);}
}
