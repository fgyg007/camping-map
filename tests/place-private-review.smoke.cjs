const assert=require('node:assert/strict');

module.exports=async function placePrivateReviewSmoke(browser,device,{origin='http://127.0.0.1:5179'}={}){
 const context=await browser.newContext({...device,viewport:{width:345,height:650},hasTouch:true,isMobile:true});
 try{
  await context.addInitScript(()=>{
   if(localStorage.getItem('camping-map-v1'))return;
   const place=(id,name,lat,lng)=>({id,name,lat,lng,category:'其他',status:'待核实',facilities:[]});
   localStorage.setItem('camping-map-v1',JSON.stringify({version:1,places:[
    place('review-empty','合成只收藏地点',30,120),
    {...place('review-existing','合成原有点评地点',31,121),rating:4,review:'合成原有短评'},
   ]}));
  });
  const page=await context.newPage();
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);
  await page.getByRole('button',{name:'添加地点',exact:true}).first().click();
  const creation=page.getByRole('dialog',{name:'添加地点'});
  await creation.waitFor();
  assert.equal(await creation.getByRole('combobox',{name:'我的评分'}).count(),0);
  await creation.getByRole('button',{name:'关闭表单'}).click();
  const showPlace=title=>page.locator('.card-main').filter({has:page.getByRole('heading',{name:title,exact:true})}).click();
  const detail=page.getByRole('dialog',{name:'地点详情'});
  const overview=()=>detail.getByRole('tabpanel',{name:'概览'});
  const review=()=>overview().getByRole('region',{name:'我的私人点评'});
  const score=()=>review().getByRole('combobox',{name:'我的评分'});
  const note=()=>review().getByRole('textbox',{name:'我的短评'});
  const close=()=>detail.getByRole('button',{name:'关闭详情'}).click();

  await showPlace('合成只收藏地点');
  await review().getByRole('button',{name:'添加点评'}).click();
  assert.equal(await score().inputValue(),'');assert.equal(await note().inputValue(),'');
  await score().selectOption('2');await note().fill('合成草稿，稍后保存');
  await detail.getByRole('tab',{name:'导航'}).click();
  await detail.getByRole('tab',{name:'概览'}).click();
  assert.equal(await note().inputValue(),'合成草稿，稍后保存');

  await detail.getByRole('button',{name:'下一地点'}).click();
  await detail.getByRole('heading',{name:'合成原有点评地点'}).waitFor();
  await review().getByRole('button',{name:'编辑点评'}).click();
  assert.equal(await score().inputValue(),'4');assert.equal(await note().inputValue(),'合成原有短评');
  await note().fill('合成取消的短评');
  await review().getByRole('button',{name:'取消点评'}).click();
  await review().getByText('合成原有短评',{exact:true}).waitFor();

  await detail.getByRole('button',{name:'上一地点'}).click();
  assert.equal(await score().inputValue(),'2');assert.equal(await note().inputValue(),'合成草稿，稍后保存');
  await review().getByRole('button',{name:'保存点评'}).click();
  await review().getByText('合成草稿，稍后保存',{exact:true}).waitFor();
  await close();
  await page.reload();
  await showPlace('合成只收藏地点');
  await review().getByRole('button',{name:'编辑点评'}).click();
  assert.equal(await score().inputValue(),'2');assert.equal(await note().inputValue(),'合成草稿，稍后保存');
  await review().getByRole('button',{name:'取消点评'}).click();
  await close();
 }finally{await context.close();}
};
