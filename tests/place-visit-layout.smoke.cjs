const assert=require('node:assert/strict');

module.exports=async function placeVisitLayoutSmoke(browser,device,{origin='http://127.0.0.1:5179'}={}){
 for(const width of [320,393,430]){
  const height=620;
  const context=await browser.newContext({...device,viewport:{width,height},screen:{width,height},isMobile:true,hasTouch:true});
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await context.addInitScript(()=>{
    window.androidBridge={};
    window.Capacitor={PluginHeaders:[{name:'MapShare',methods:[{name:'takePending',rtype:'promise'},{name:'addListener',rtype:'callback'}]}],
     nativeCallback(){},nativePromise(){return Promise.resolve({});}};
   });
   const page=await context.newPage();
   await page.goto(origin);
   await page.getByRole('button',{name:'添加地点',exact:true}).first().click();
   const editor=page.getByRole('dialog',{name:'添加地点'});
   const section=editor.locator('.first-visit');
   await section.waitFor();
   const outcome=section.getByLabel('开到了哪里'),date=section.getByLabel('实测日期'),model=section.getByLabel('当时的车型');
   const comments=section.getByLabel('实测感受（可选）');
   const box=locator=>locator.boundingBox().then(result=>{assert.ok(result,`${width}px: expected a visible layout box`);return result;});
   const [sectionBox,hintBox,outcomeBox,dateBox,modelBox,commentsBox]=await Promise.all([
    box(section),box(section.locator('.hint').first()),box(outcome),box(date),box(model),box(comments),
   ]);
   assert.ok(sectionBox.x>=0&&sectionBox.x+sectionBox.width<=width+1,`${width}px: visit section has horizontal overflow`);
   assert.ok(hintBox.y+hintBox.height+3<=outcomeBox.y,`${width}px: hint and arrival field must stack`);
   assert.ok(outcomeBox.y+outcomeBox.height+3<=dateBox.y,`${width}px: arrival field overlaps the visit date`);
   assert.ok(outcomeBox.y+outcomeBox.height+3<=modelBox.y,`${width}px: arrival field overlaps the vehicle field`);
   assert.ok(Math.max(dateBox.y+dateBox.height,modelBox.y+modelBox.height)+3<=commentsBox.y,`${width}px: comment must be beneath date and vehicle`);
   for(const [label,field,minWidth] of [
    ['开到了哪里',outcomeBox,sectionBox.width*.76],['实测日期',dateBox,110],
    ['当时的车型',modelBox,106],['实测感受',commentsBox,sectionBox.width*.76],
   ]){
    assert.ok(field.width>=minWidth,`${width}px: ${label} too narrow (${field.width}px)`);
    assert.ok(field.x>=sectionBox.x-1&&field.x+field.width<=sectionBox.x+sectionBox.width+1,
     `${width}px: ${label} overflows the visit section`);
   }
   const dimensions=section.locator('.visit-dimensions-details');
   if(await dimensions.count()){
    const fields=dimensions.locator('input');
    assert.ok(await fields.count()>=3,`${width}px: dimensions have too few fields`);
    assert.equal(await fields.first().isVisible(),false);
    await dimensions.locator('summary').click();
    await fields.first().waitFor({state:'visible'});
    for(const field of await fields.all()){
     const dim=await box(field);
     assert.ok(dim.width>=45&&dim.x>=sectionBox.x-1&&dim.x+dim.width<=sectionBox.x+sectionBox.width+1,
      `${width}px: expanded dimension does not fit in the visit section`);
    }
   }
   const save=editor.getByRole('button',{name:'保存地点'});
   const footerYs=[];
   for(const fraction of [0,.5,1]){
    await section.evaluate((node,fraction)=>{
     let scroller=node.parentElement;
     while(scroller&&!(scroller.scrollHeight>scroller.clientHeight+8&&/(?:auto|scroll)/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
     if(!scroller)throw Error('No scrollable visit editor ancestor');
     scroller.scrollTop=(scroller.scrollHeight-scroller.clientHeight)*fraction;
    },fraction);
    const button=await box(save);
    assert.ok(button.y>=0&&button.y+button.height<=height+1,`${width}px: save button leaves viewport when scrolling`);
    assert.ok(button.x>=0&&button.x+button.width<=width+1,`${width}px: save button is clipped horizontally`);
    footerYs.push(button.y);
   }
   assert.ok(Math.max(...footerYs)-Math.min(...footerYs)<=2,`${width}px: save button moves with scroll content`);
   assert.ok(await editor.evaluate(element=>element.scrollWidth<=element.clientWidth+1),`${width}px: modal has horizontal scroll`);
  }finally{await context.close();}
 }
};
