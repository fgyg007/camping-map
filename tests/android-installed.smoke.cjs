const {_android}=require(process.env.CAMPING_PLAYWRIGHT || 'playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const pkg='com.jlmac.campingmap';
const adb=(...args)=>execFileSync('adb',args,{stdio:'pipe',encoding:'utf8'});
(async()=>{
 const [phone]=await _android.devices();
 if(!phone)throw Error('Android emulator was not available');
 try{
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');
  const web=await phone.webView({pkg,timeout:30000});
  const page=await web.page();
  await page.locator('.filter').click({timeout:20000});
  await page.getByRole('button',{name:'湖畔',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索地点'}).fill('无法匹配的测试筛选');
  adb('shell',"am start -W -n "+pkg+"/.MainActivity -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'https://uri.amap.com/marker?position=102,25&coordinate=wgs84'");
  await page.getByRole('button',{name:'预览分享地点'}).click({timeout:20000});
  await page.waitForFunction(()=>[...document.querySelectorAll('.editor input[type=number]')].some(x=>x.value==='25'));
  await page.getByRole('textbox',{name:'地点名称'}).fill('安卓合成地点');
  await page.getByRole('button',{name:'保存地点'}).click();
  const card=page.locator('.cards').getByText('安卓合成地点',{exact:true});
  await card.waitFor({state:'visible',timeout:15000});
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.locator('.camp-marker[title="安卓合成地点"]').waitFor({state:'attached',timeout:15000});
  assert.ok(await card.evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
  adb('shell','am','force-stop',pkg);
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');
  const restored=await (await phone.webView({pkg,timeout:30000})).page();
  await restored.locator('.cards').getByText('安卓合成地点',{exact:true}).waitFor({state:'visible',timeout:15000});
  console.log('Installed APK passed real ACTION_SEND, editor prefill, immediate home return, marker, and force-stop/relaunch.');
 }finally{await phone.close();}
})().catch(e=>{console.error(e);process.exit(1);});
