const assert=require('node:assert/strict');

async function swipe(session,{from,to}){
 const point=([x,y])=>[{x:Math.round(x),y:Math.round(y),id:1}];
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(from)});
 for(let step=1;step<=9;step++){
  const p=step/9;
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:point([from[0]+(to[0]-from[0])*p,from[1]+(to[1]-from[1])*p])});
 }
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}

module.exports=async function placeDetailSmoke(browser,device,{origin='http://127.0.0.1:5179'}={}){
 const context=await browser.newContext({...device,viewport:{width:320,height:620},hasTouch:true,isMobile:true});
 try{
  const notes=Array.from({length:38},(_,index)=>`第 ${index+1} 行：现场手记，保持可滚动。`).join('\n')+'\n完整备注结束标记';
  await context.addInitScript(longNote=>{
   const record=(id,name,lat,lng,category,rating,notes='')=>({id,name,lat,lng,category,rating,notes,status:'待核实',facilities:[]});
   localStorage.setItem('camping-map-v1',JSON.stringify({version:1,places:[
    record('pager-low','合成排序低分',30.2,120.2,'湖畔',1),
    record('pager-high','合成排序高分',30.6,120.8,'湖畔',4,longNote),
    record('pager-excluded','合成地图隐藏点',29.6,119.5,'山野',5),
    record('pager-middle','合成排序中分',30.4,120.4,'湖畔',3),
   ]}));
  },notes);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);
  const cdp=await context.newCDPSession(page);
  await page.getByRole('button',{name:'湖畔',exact:true}).click();
  await page.getByRole('combobox',{name:'地点排序'}).selectOption('rating');
  const cards=page.locator('.cards .card h3');
  assert.deepEqual(await cards.allTextContents(),['合成排序高分','合成排序中分','合成排序低分']);
  await page.locator('.card-main').filter({has:page.getByRole('heading',{name:'合成排序高分'})}).click();
  const detail=page.getByRole('dialog',{name:'地点详情'});
  const tab=(name)=>detail.getByRole('tab',{name,exact:true});
  const active=async(name)=>page.waitForFunction(value=>
   document.querySelector('.detail-pager [role="tab"][aria-selected="true"]')?.textContent===value,name);
  const title=async(name)=>detail.getByRole('heading',{name,exact:true}).waitFor();
  await title('合成排序高分');
  assert.equal(await detail.getByRole('button',{name:'上一地点'}).isEnabled(),false);

  const panel=detail.locator('.detail-pager-scroll');
  const rect=await panel.boundingBox();assert.ok(rect);
  // The component intentionally ignores touches beginning on a control. The
  // bottom of a small overview can be filled by the edit/export/delete row.
  async function swipePage(left){
   const fromX=rect.x+rect.width*(left ? .84 : .16),toX=rect.x+rect.width*(left ? .16 : .84);
   const y=await page.evaluate(({fromX,rect})=>{
    for(let y=rect.y+15;y<rect.y+rect.height-15;y+=10){
     const start=document.elementFromPoint(fromX,y);
     if(start?.closest('.detail-pager-scroll')&&!start.closest('button,a,input,select,textarea,label,summary,[role="button"]'))return y;
    }
    return null;
   },{fromX,rect});
   assert.notEqual(y,null,'pager has a noninteractive gesture surface');
   await swipe(cdp,{from:[fromX,y],to:[toX,y]});
  }
  await swipePage(true);
  await detail.getByText('WGS-84 坐标',{exact:true}).waitFor();
  await active('导航');
  await swipePage(false);
  await active('概览');

  await tab('照片').click();
  const cover=await detail.locator('.detail-pager-cover').boundingBox();assert.ok(cover&&cover.height>=52);
  // Start away from the neighboring tabs, which mobile Chrome may hit-test
  // as the target of a touch beginning very close to the cover's lower edge.
  const mid=cover.x+cover.width*.55,upStart=cover.y+cover.height*.53,downStart=cover.y+cover.height*.38;
  await swipe(cdp,{from:[mid,upStart],to:[mid,Math.max(1,upStart-48)]});
  await title('合成排序中分');await active('概览');
  await swipe(cdp,{from:[mid,downStart],to:[mid,downStart+60]});
  await title('合成排序高分');await active('概览');

  const close=detail.getByRole('button',{name:'关闭详情'});
  const closeRect=await close.boundingBox();assert.ok(closeRect&&closeRect.y+closeRect.height<=620);
  await detail.getByRole('button',{name:'阅读完整备注'}).click();
  const full=page.getByRole('dialog',{name:'完整备注'});
  await full.getByText(/完整备注结束标记/u).waitFor({state:'attached'});
  const noteArea=full.locator('.visit-scroll');
  assert.equal(await noteArea.evaluate(e=>e.scrollHeight>e.clientHeight),true);
  const noteRect=await noteArea.boundingBox();assert.ok(noteRect);
  const pinchX=noteRect.x+noteRect.width*.58;
  await swipe(cdp,{from:[pinchX,noteRect.y+noteRect.height*.8],to:[pinchX,noteRect.y+noteRect.height*.2]});
  await page.waitForFunction(()=>document.querySelector('.visit-scroll')?.scrollTop>0);
  const closeNote=full.getByRole('button',{name:'关闭备注'});
  const noteCloseRect=await closeNote.boundingBox();assert.ok(noteCloseRect&&noteCloseRect.y+noteCloseRect.height<=620);
  await closeNote.click();
  await title('合成排序高分');
  await close.click();
  await detail.waitFor({state:'hidden'});

  await page.getByRole('button',{name:'地图总览',exact:true}).click();
  const map=page.getByRole('region',{name:'地图总览'});
  await map.locator('[aria-label="地图图钉：合成地图隐藏点"]').click();
  await title('合成地图隐藏点');await active('概览');
  await detail.getByRole('button',{name:'下一地点'}).click();
  await title('合成排序高分');
  await close.click();
  await map.getByRole('button',{name:'返回列表'}).click();
  assert.deepEqual(await cards.allTextContents(),['合成排序高分','合成排序中分','合成排序低分']);
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();
 }
};
