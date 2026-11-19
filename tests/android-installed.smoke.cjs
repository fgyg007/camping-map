const {_android}=require(process.env.CAMPING_PLAYWRIGHT || 'playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const pkg='com.jlmac.campingmap.baidutrial';
const component=pkg+'/com.jlmac.campingmap.MainActivity';
const timeout=30000;
const COLD_POINT='https://uri.amap.com/marker?position=102,25&coordinate=wgs84';
const WARM_POINT='https://api.map.baidu.com/marker?location=26,103&coord_type=wgs84';
const adb=(serial,...args)=>execFileSync('adb',['-s',serial,...args],{stdio:'pipe',encoding:'utf8'});

(async()=>{
 const devices=await _android.devices();
 const phone=devices.find(d=>d.serial()===process.env.ANDROID_SERIAL) ||
  (!process.env.ANDROID_SERIAL&&devices.length===1 ? devices[0] : null);
 if(!phone||!phone.serial().startsWith('emulator-'))throw Error('A dedicated Android emulator is required');
 const serial=phone.serial();
 const cmd=(...args)=>adb(serial,...args);
 const openPage=async()=>(await phone.webView({pkg,timeout})).page();
 const share=link=>cmd('shell',"am start -W -n "+component+" -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT '"+link+"'");
 const pendingShare=page=>page.getByRole('button',{name:'预览分享地点'});
 const lat=page=>page.getByRole('spinbutton',{name:'纬度',exact:true});
 const lng=page=>page.getByRole('spinbutton',{name:'经度',exact:true});
 const name=page=>page.getByRole('textbox',{name:'地点名称'});
 const dialog=page=>page.getByRole('dialog',{name:'添加地点'});
 const card=(page,text)=>page.locator('.cards').getByText(text,{exact:true});
 const waitFirstPoint=page=>page.waitForFunction(()=>{
  const fields=document.querySelectorAll('.editor form input[type=number]');
  return fields[0]?.value==='25'&&fields[1]?.value==='102';
 },null,{timeout});
 try{
  // Real Android launch intent on a stopped application, not a simulated bridge.
  cmd('shell','am','force-stop',pkg);
  share(COLD_POINT);
  const page=await openPage();
  await pendingShare(page).waitFor({timeout});
  assert.equal(await page.evaluate(()=>window.Capacitor.getPlatform()),'android');
  assert.equal(await page.getByRole('button',{name:'地图总览',exact:true}).count(),1);
  assert.equal(await page.locator('.place-overview-canvas').count(),0);

  // Saving from a filtered home must reveal the new record immediately.
  await page.locator('.filter').click({timeout});
  await page.getByRole('button',{name:'湖畔',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索地点'}).fill('不可能匹配的合成筛选');
  await pendingShare(page).click();
  await waitFirstPoint(page);
  assert.equal(await lat(page).inputValue(),'25');
  assert.equal(await lng(page).inputValue(),'102');
  await name(page).fill('安卓冷启动合成地点');

  // A warm share must become pending, not overwrite a partially filled form.
  share(WARM_POINT);
  await pendingShare(page).waitFor({timeout});
  assert.equal(await pendingShare(page).isDisabled(),true);
  assert.equal(await name(page).inputValue(),'安卓冷启动合成地点');
  assert.equal(await lat(page).inputValue(),'25');
  await page.getByRole('button',{name:'保存地点'}).click();
  await card(page,'安卓冷启动合成地点').waitFor({state:'visible',timeout});
  assert.equal(await dialog(page).count(),0);
  assert.equal(await page.locator('.place-overview-canvas, .place-overview-pin').count(),0);
  assert.equal(await page.getByRole('textbox',{name:'搜索地点'}).inputValue(),'');

  // The pending warm intent is now importable with its original coordinates.
  await pendingShare(page).click();
  await page.waitForFunction(()=>{
   const fields=document.querySelectorAll('.editor form input[type=number]');
   return fields[0]?.value==='26'&&fields[1]?.value==='103';
  },null,{timeout});
  await name(page).fill('安卓热启动合成地点');
  await page.getByRole('button',{name:'保存地点'}).click();
  await card(page,'安卓热启动合成地点').waitFor({state:'visible',timeout});

  cmd('shell','am','force-stop',pkg);
  cmd('shell','am','start','-W','-n',component);
  const restored=await openPage();
  await card(restored,'安卓冷启动合成地点').waitFor({state:'visible',timeout});
  await card(restored,'安卓热启动合成地点').waitFor({state:'visible',timeout});
  assert.equal(await restored.locator('.place-overview-canvas').count(),0);
  assert.equal(await pendingShare(restored).count(),0);
  console.log('Installed APK passed offline Android list, targeted cold/warm ACTION_SEND, editing protection, immediate save and force-stop/relaunch.');
 }finally{
  await Promise.all(devices.map(d=>d.close()));
 }
})().catch(e=>{console.error(e);process.exit(1);});
