const {chromium,devices}=require(process.env.CAMPING_PLAYWRIGHT || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CAMPING_CHROMIUM?{executablePath:process.env.CAMPING_CHROMIUM}:{})});
 try{
 const c=await b.newContext({...devices['Pixel 7']});
 await c.addInitScript((baseline)=>{
  window.androidBridge={};
  window.Capacitor={PluginHeaders:[{name:'MapShare',methods:[
   {name:'takePending',rtype:'promise'},{name:'openAmapRoute',rtype:'promise'},{name:'openBaiduMarker',rtype:'promise'},{name:'resolveAmap',rtype:'promise'},{name:'resolveExternalMapLink',rtype:'promise'},{name:'resolveBaiduPoiCandidate',rtype:'promise'},{name:'addListener',rtype:'callback'}
  ]}],nativeCallback(){},nativePromise(_plugin,method,options){
   if(method==='openAmapRoute'){window.amapRequests??=[];window.amapRequests.push(options);return Promise.resolve({target:window.amapRequests.length===1?'app':'web'});}
   if(method==='openBaiduMarker'){
    window.baiduMarkerRequests??=[];window.baiduMarkerRequests.push(options);
    if(window.baiduMarkerRequests.length>2)return Promise.reject(Error('baidu_marker_unavailable'));
    return Promise.resolve({target:window.baiduMarkerRequests.length===1?'app':'web'});
   }
   if(method==='removeListener')return Promise.resolve({});
   if(method==='takePending'){
    const extra=sessionStorage.getItem('camping-mock-next-share');
    if(extra){sessionStorage.removeItem('camping-mock-next-share');return Promise.resolve({text:extra});}
    if(sessionStorage.getItem('camping-mock-consumed'))return Promise.resolve({});
    sessionStorage.setItem('camping-mock-consumed','1');
    return Promise.resolve({text:'https://surl.amap.com/Synthetic1'});
   }
   if(method==='resolveAmap')return Promise.resolve({location:'https://wb.amap.com/?q=25,102,合成分享营地'});
   if(method==='resolveExternalMapLink'){
    window.shortRequests??=[];window.shortRequests.push(options.url);
    const explicit='https://api.map.baidu.com/marker?location=35.1,111.2&coord_type=wgs84&title='+encodeURIComponent('合成百度明确点');
    const uidOnly=uid=>'https://map.baidu.com/?s=inf%26uid%3D'+uid;
    if(options.url.endsWith('/Delayed'))return new Promise(resolve=>{window.finishDelayedBaidu=()=>resolve({location:uidOnly('Delayed')});});
    if(options.url.endsWith('/Exact'))return Promise.resolve({location:explicit});
    if(options.url.endsWith('/Approx'))return Promise.resolve({location:uidOnly('SyntheticBaidu')});
    if(options.url.includes('mmapgwh.map.qq.com'))return Promise.resolve({location:'https://apis.map.qq.com/uri/v1/marker?coord_type=1&marker='+encodeURIComponent('coord:30.2,120.2;title:合成腾讯点')});
    return Promise.resolve({location:options.url.includes('goo.gl')?'https://www.google.com/maps/search/?api=1&query=-33.2,151.1':uidOnly('Failed')});
   }
   if(method==='resolveBaiduPoiCandidate'){
    window.baiduCandidateRequests??=[];window.baiduCandidateRequests.push(options.location);
    if(!options.location.endsWith('SyntheticBaidu'))return Promise.reject(Error('baidu_poi_candidate_unavailable'));
    return Promise.resolve({location:'https://map.baidu.com/poi/'+encodeURIComponent('合成百度候选')+'/@12958175,4825923,19z?uid=SyntheticBaidu'});
   }
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
  assert.equal(await page.getByText('野泊不自动上传营地、照片或车辆资料。根据手机设置，Android 系统备份可能包含这些数据。',{exact:true}).isVisible(),true);
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
  await page.locator('.toast').waitFor({state:'hidden'});
  const baidu=page.getByRole('button',{name:'百度地图看点'});
  await baidu.click();
  await page.waitForFunction(()=>window.baiduMarkerRequests?.length===1);
  assert.deepEqual(await page.evaluate(()=>window.baiduMarkerRequests[0]),{lat:data.lat,lng:data.lng});
  assert.equal(await page.locator('.toast').count(),0);
  await baidu.click();
  await page.getByRole('status').filter({hasText:'未能打开百度地图 App，已改用网页'}).waitFor();
  await baidu.click();
  await page.getByRole('status').filter({hasText:'可复制坐标后手动在地图中打开'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.baiduMarkerRequests),Array(3).fill({lat:data.lat,lng:data.lng}));
  await page.getByRole('button',{name:'关闭详情'}).click();
  await page.getByRole('button',{name:'添加地点',exact:true}).first().click();
  await page.getByText('从地图链接导入',{exact:true}).click();
  const shareLink=page.getByLabel('地图分享链接');
  async function simulatePaste(value){
   await shareLink.evaluate((input,text)=>{
    const data=new DataTransfer();data.setData('text/plain',text);
    input.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
   },value);
  }
  const explicitShort='https://j.map.baidu.com/ab/Exact',approxShort='https://j.map.baidu.com/ab/Approx';
  const lat=page.getByLabel('纬度',{exact:true}),lng=page.getByLabel('经度',{exact:true});
  const name=page.getByLabel('地点名称');
  const waitLat=value=>page.waitForFunction(value=>document.querySelector('.editor input[placeholder="30.250000"]').value===value,value);
  const googleShort='https://maps.app.goo.gl/TestPin?g_st=ic';
  await shareLink.fill(googleShort);
  assert.equal(await page.evaluate(()=>window.shortRequests?.length||0),0); // typing never makes short-link requests
  await simulatePaste(googleShort);
  await waitLat('-33.2');
  assert.equal(await lng.inputValue(),'151.1');
  assert.equal(await name.inputValue(),''); // source has no title
  assert.deepEqual(await page.evaluate(()=>window.shortRequests),['https://maps.app.goo.gl/TestPin']);
  await simulatePaste('[https://j.map.baidu.com/ab/TestPoi](https://j.map.baidu.com/ab/TestPoi)');
  await page.getByRole('alert').filter({hasText:'只返回地点编号'}).waitFor();
  assert.equal(await page.getByRole('link',{name:'打开原地图链接'}).getAttribute('href'),'https://j.map.baidu.com/ab/TestPoi');
  assert.equal(await lat.inputValue(),'');assert.equal(await lng.inputValue(),'');assert.equal(await name.inputValue(),'');
  assert.deepEqual(await page.evaluate(()=>window.baiduCandidateRequests),['https://map.baidu.com/?s=inf%26uid%3DFailed']);

  await simulatePaste('百度地图 '+explicitShort);
  await waitLat('35.1');
  assert.equal(await lng.inputValue(),'111.2');
  assert.equal(await name.inputValue(),'合成百度明确点');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('camping-map-v1')).places.some(p=>p.name==='合成百度明确点')),false);
  await simulatePaste(approxShort);
  await page.getByRole('status').filter({hasText:'近似点'}).waitFor();
  assert.ok(Math.abs(Number(await lat.inputValue())-39.9075)<.001);
  assert.equal(await name.inputValue(),'合成百度候选');
  assert.equal(await page.getByRole('link',{name:'打开原分享短链接'}).getAttribute('href'),approxShort);
  assert.match(await page.getByRole('link',{name:'打开原地图链接'}).getAttribute('href'),/^https:\/\/map\.baidu\.com\/poi\//);
  assert.equal(await page.getByRole('button',{name:'保存地点'}).isEnabled(),true);
  assert.equal(await page.getByRole('button',{name:/填入表单|确认使用候选点/}).count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('camping-map-v1')).places.some(p=>p.name==='合成百度候选')),false);

  const tencentShort='https://mmapgwh.map.qq.com/shortlink/short?l=0123456789abcdef0123456789abcdef';
  await simulatePaste(tencentShort);
  await waitLat('30.2');
  assert.equal(await lng.inputValue(),'120.2');
  assert.equal(await name.inputValue(),'合成腾讯点');
  const amapLong='https://uri.amap.com/marker?position=121.2,31.2&coordinate=wgs84&name='+encodeURIComponent('合成高德明确点');
  await simulatePaste(amapLong);
  await waitLat('31.2');
  assert.equal(await lng.inputValue(),'121.2');
  assert.equal(await name.inputValue(),'合成高德明确点');
  await page.getByRole('button',{name:'关闭表单'}).click();

  await page.getByRole('button',{name:'添加地点',exact:true}).first().click();
  await page.getByText('从地图链接导入',{exact:true}).click();
  await lat.fill('31');await name.fill('手填名称');
  await simulatePaste(explicitShort);
  await page.getByRole('button',{name:'替换为链接位置'}).waitFor();
  assert.equal(await lat.inputValue(),'31');assert.equal(await lng.inputValue(),'');
  assert.equal(await name.inputValue(),'手填名称');
  await page.getByRole('button',{name:'保留当前坐标'}).click();
  assert.equal(await lat.inputValue(),'31');assert.equal(await lng.inputValue(),'');
  await simulatePaste(explicitShort);
  await page.getByRole('button',{name:'替换为链接位置'}).click();
  assert.equal(await lat.inputValue(),'35.1');assert.equal(await lng.inputValue(),'111.2');
  assert.equal(await name.inputValue(),'手填名称');
  await page.getByRole('button',{name:'关闭表单'}).click();

  await page.getByRole('button',{name:'添加地点',exact:true}).first().click();
  await page.getByText('从地图链接导入',{exact:true}).click();
  await simulatePaste('https://j.map.baidu.com/ab/Delayed');
  await page.waitForFunction(()=>typeof window.finishDelayedBaidu==='function');
  const previousCandidateRequests=await page.evaluate(()=>window.baiduCandidateRequests.length);
  await shareLink.fill('https://www.google.com/maps/search/?api=1&query=-33.2,151.1');
  await waitLat('-33.2');
  await page.evaluate(()=>window.finishDelayedBaidu());
  assert.equal(await lat.inputValue(),'-33.2');
  assert.equal(await page.evaluate(()=>window.baiduCandidateRequests.length),previousCandidateRequests);
  await page.getByRole('button',{name:'关闭表单'}).click();

  await page.evaluate(value=>sessionStorage.setItem('camping-mock-next-share',value),approxShort);
  await page.reload();
  await page.getByRole('button',{name:'预览分享地点'}).click();
  await page.getByRole('status').filter({hasText:'近似点'}).waitFor();
  assert.ok(Math.abs(Number(await lat.inputValue())-39.9075)<.001);
  assert.equal(await name.inputValue(),'合成百度候选');
  assert.equal(await page.getByRole('button',{name:'保存地点'}).isEnabled(),true);
  await page.getByRole('button',{name:'关闭表单'}).click();

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
  const preview=require('./trial-features.smoke.cjs');
  await preview(b,devices['Pixel 7']);
 }
 assert.deepEqual(errs,[]);
 } finally {await b.close();}
})().catch(e=>{console.error(e); process.exit(1);});
