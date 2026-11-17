const {chromium,devices}=require(process.env.CAMPING_PLAYWRIGHT || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const c=await b.newContext({...devices['Pixel 7']});
 await c.addInitScript((baseline)=>{
  window.androidBridge={};
  window.Capacitor={PluginHeaders:[{name:'MapShare',methods:[
   {name:'takePending',rtype:'promise'},{name:'openAmapRoute',rtype:'promise'},{name:'resolveAmap',rtype:'promise'},{name:'addListener',rtype:'callback'}
  ]}],nativeCallback(){},nativePromise(_plugin,method,options){
   if(method==='openAmapRoute'){window.amapRequests??=[];window.amapRequests.push(options);return Promise.resolve({target:window.amapRequests.length===1?'app':'web'});}
   if(method==='removeListener')return Promise.resolve({});
   if(method==='takePending'){if(sessionStorage.getItem('camping-mock-consumed'))return Promise.resolve({});sessionStorage.setItem('camping-mock-consumed','1');return Promise.resolve({text:'https://surl.amap.com/Synthetic1'});}
   if(method==='resolveAmap')return Promise.resolve({location:'https://wb.amap.com/?q=25,102,合成分享营地'});
   throw Error('Unexpected simulated bridge method: '+method);
  }};
  if(!baseline)Object.defineProperty(Crypto.prototype,'randomUUID',{value:undefined,configurable:true});
 },process.argv[2]==='baseline');
 const page=await c.newPage(), errs=[];
 let tiles=0;
 page.on('pageerror',e=>errs.push(e.message));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('tile.openstreetmap.org'))tiles++;return u.startsWith('http://127.0.0.1:5179/')?r.continue():r.abort();});
 await page.goto('http://127.0.0.1:5179');
 await page.locator('.filter').click();
 await page.getByRole('button',{name:'湖畔',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索地点'}).fill('无法匹配的测试筛选');
 await page.getByRole('button',{name:'预览分享地点'}).click();
 await page.getByRole('textbox',{name:'地点名称'}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.editor form input')?.value==='合成分享营地');
 await page.getByRole('button',{name:'保存地点'}).click();
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('camping-map-v1')).places.find(p=>p.name==='合成分享营地'));
 assert.ok(Math.abs(data.lat-25)<0.02); assert.ok(Math.abs(data.lng-102)<0.02);
 if(process.argv[2]==='baseline'){
  assert.equal(await page.locator('.cards').getByText('合成分享营地').count(),0);
  assert.equal(await page.getByRole('dialog',{name:'地点详情'}).count(),1);
  console.log('Baseline: written to storage, but not on home list and detail dialog covers home.');
 }else{
  const card=page.locator('.cards').getByText('合成分享营地',{exact:true});
  await card.waitFor({state:'visible'}); assert.equal(await page.getByRole('dialog').count(),0);
  const within=await card.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight});
  assert.ok(within,'saved card must be in the phone viewport');
  assert.equal(await page.locator('.map-wrap').count(),0);
  await page.reload(); await card.waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:'地图视图'}).count(),0);
  assert.equal(tiles,0);
  if(process.env.CAMPING_SCREENSHOT)await page.screenshot({path:process.env.CAMPING_SCREENSHOT});
  await card.click();
  await page.getByRole('button',{name:'高德路线规划'}).click();
  await page.waitForFunction(()=>window.amapRequests?.length===1);
  const request=await page.evaluate(()=>window.amapRequests[0]);
  assert.deepEqual(request,{lat:data.lat,lng:data.lng,gcjLat:request.gcjLat,gcjLng:request.gcjLng});
  assert.ok(Math.abs(request.gcjLat-25)<1e-7);assert.ok(Math.abs(request.gcjLng-102)<1e-7);
  await page.getByRole('button',{name:'高德路线规划'}).click();
  await page.getByRole('status').filter({hasText:'已改用网页'}).waitFor();
  await page.getByRole('button',{name:'关闭详情'}).click();
  await page.getByRole('button',{name:'添加地点',exact:true}).first().click();
  await page.getByRole('textbox',{name:'地点名称'}).fill('失败测试');
  await page.getByRole('spinbutton',{name:'纬度'}).fill('31');
  await page.getByRole('spinbutton',{name:'经度'}).fill('115');
  await page.evaluate(()=>{Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('quota test');},configurable:true});});
  await page.getByRole('button',{name:'保存地点'}).click();
  await page.getByRole('alert').filter({hasText:'未确认保存成功'}).waitFor();
  assert.equal(await page.getByRole('dialog').count(),1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('camping-map-v1')).places.some(p=>p.name==='失败测试')),false);
  console.log('Android layout: offline first-screen list, zero tile requests, share save/reload, native route bridge and storage failure handled.');
  const web=await b.newPage({...devices['Pixel 7']});
  let browserTiles=0;
  await web.route('https://tile.openstreetmap.org/**',r=>{browserTiles++;return r.abort();});
  await web.goto('http://127.0.0.1:5179');
  await web.locator('.cards .card').first().waitFor({state:'visible'});
  assert.equal(await web.locator('.map-wrap').count(),0);
  assert.equal(browserTiles,0);
  await web.getByRole('button',{name:'地图视图'}).click();
  await web.getByText('底图暂时无法加载，地点列表仍可使用。请检查网络。').waitFor();
  assert.ok(browserTiles>0);
  await web.getByRole('button',{name:'返回列表'}).click();
  assert.equal(await web.locator('.map-wrap').count(),0);
  await web.locator('.cards .card').first().waitFor({state:'visible'});
  console.log('Web map is opt-in and returns to list if tiles fail.');
 }
 assert.deepEqual(errs,[]);
 } finally {await b.close();}
})().catch(e=>{console.error(e); process.exit(1);});