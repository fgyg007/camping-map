const assert=require('node:assert/strict');

// Run in both a Pixel-sized viewport and the mocked Android Capacitor surface.
module.exports=async function placeOverviewSmoke(browser,device,{origin='http://127.0.0.1:5179'}={}){
 const context=await browser.newContext(device);
 try{
  await context.addInitScript(()=>{
   window.androidBridge={};
   window.Capacitor={PluginHeaders:[{name:'MapShare',methods:[{name:'takePending',rtype:'promise'},{name:'addListener',rtype:'callback'}]}],
    nativeCallback(){},nativePromise(){return Promise.resolve({});}};
   const place=(id,name,lat,lng)=>({id,name,lat,lng,category:'其他',status:'待核实',facilities:[]});
   localStorage.setItem('camping-map-v1',JSON.stringify({version:1,places:[
    place('overview-a','合成单个图钉',30,120),place('overview-b','合成相同位置甲',31,122),
    place('overview-c','合成相同位置乙',31,122),place('overview-d','合成另一地点',28,119),
   ]}));
  });
  const page=await context.newPage(),pageErrors=[];
  let tileAttempts=0;
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='tile.openstreetmap.org')tileAttempts++;
   return url.origin===origin?route.continue():route.abort();
  });
  await page.goto(origin);
  await page.getByRole('textbox',{name:'搜索地点'}).fill('没有这样的地点');
  assert.equal(tileAttempts,0);
  await page.getByRole('button',{name:'地图总览',exact:true}).click();
  const overview=page.getByRole('region',{name:'地图总览'});
  await overview.getByText('离线示意 · 无底图',{exact:true}).waitFor();
  const pins=overview.locator('.place-overview-pin');
  await pins.first().waitFor();
  assert.equal(await pins.count(),3); // four records, two of them sharing a map pin
  assert.equal(tileAttempts,0,'opening the local pin view must not request a basemap');
  await overview.locator('.place-overview-pin[aria-label="地图图钉：合成单个图钉"]').click();
  const dialog=page.getByRole('dialog',{name:'地点详情'});
  await dialog.getByRole('heading',{name:'合成单个图钉'}).waitFor();
  await dialog.getByRole('button',{name:'关闭详情'}).click();
  await overview.locator('.place-overview-pin[aria-label="地图图钉：这里有 2 个地点"]').click();
  const group=overview.getByRole('region',{name:'同一位置的图钉'});
  await group.getByRole('button',{name:'合成相同位置乙'}).click();
  await dialog.getByRole('heading',{name:'合成相同位置乙'}).waitFor();
  await dialog.getByRole('button',{name:'关闭详情'}).click();
  await overview.getByRole('button',{name:'加载在线底图'}).click();
  await overview.getByText(/在线底图暂时无法加载/u).waitFor();
  assert.ok(tileAttempts>0);
  assert.equal(await pins.count(),3,'tile errors must not remove offline pins');
  await overview.getByRole('button',{name:'返回列表'}).click();
  await overview.waitFor({state:'hidden'});
  const requestCount=tileAttempts;
  await page.getByRole('button',{name:'地图总览',exact:true}).click();
  await overview.getByText('离线示意 · 无底图',{exact:true}).waitFor();
  assert.equal(tileAttempts,requestCount,'reopening map starts with the overlay offline');
  assert.deepEqual(pageErrors,[]);
 }finally{
  await context.close();
 }
};
