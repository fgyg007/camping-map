const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');

module.exports=async function exchangeSmoke(browser,device){
 const context=await browser.newContext({...device,acceptDownloads:true});
 try{
  const origin='http://127.0.0.1:5179';
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const place=(id,name,lat,extra={})=>({id,name,lat,lng:112,category:'湖畔',status:'待核实',facilities:[],...extra});
  const local=place('tested-a','本机喜欢的营地',30,{rating:3,review:'私密短评',notes:'本机实测备注',facilities:['厕所']});
  const other=place('tested-b','另外一处',31,{rating:4});
  await page.addInitScript(records=>{if(!localStorage.getItem('camping-map-v1'))localStorage.setItem('camping-map-v1',JSON.stringify({version:1,places:records}));},[other,local]);
  const opened=page.getByRole('dialog',{name:'地点详情'});
  const cards=page.locator('.cards');
  await page.goto(origin);
  await cards.getByText(local.name,{exact:true}).click();
  await opened.getByText(local.review,{exact:true}).waitFor();
  await opened.getByRole('button',{name:'编辑',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'编辑地点'});
  await editor.getByLabel('我的评分').selectOption('5');
  await editor.getByLabel('我的短评').fill('更新后的私人短评');
  await editor.getByRole('button',{name:'保存地点'}).click();
  await page.getByLabel('地点排序').selectOption('rating');
  assert.equal(await cards.locator('.card h3').first().textContent(),local.name);
  await cards.getByText(local.name,{exact:true}).click();
  await opened.getByText('更新后的私人短评',{exact:true}).waitFor();
  await opened.getByRole('button',{name:'导出这个地点'}).click();
  const share=page.getByRole('dialog',{name:'导出选中地点'});
  assert.equal(await share.getByRole('checkbox',{name:local.name}).isChecked(),true);
  assert.equal(await share.getByRole('checkbox',{name:other.name}).isChecked(),false);
  const pending=page.waitForEvent('download');
  await share.getByRole('button',{name:'导出所选地点'}).click();
  const packet=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  assert.equal(packet.kind,'place-share');
  assert.deepEqual(packet.places.map(p=>p.id),[local.id]);
  for(const privateKey of ['rating','review','notes','photos','favorite'])assert.equal(Object.hasOwn(packet.places[0],privateKey),false);
  await share.waitFor({state:'hidden'});
  await opened.getByRole('button',{name:'关闭详情'}).click();

  const incoming=[place('friend-a',local.name,30.0002,{rating:1,review:'朋友个人评价',facilities:['水源'],notes:'来访者的备注',heightLimit:2}),
   place('friend-b','朋友新地点',32,{rating:1,review:'朋友个人短评'}),
   place('friend-c','不导入的地点',33)];
  const file=page.locator('input[type=file][accept=".json,application/json"]');
  const importDialog=page.getByRole('dialog',{name:'预览并确认导入'});
  const setFile=()=>file.setInputFiles({name:'friend.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,places:incoming}))});
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('camping-map-v1')).places);
  await setFile();await importDialog.waitFor();
  assert.equal((await stored()).length,2);
  await importDialog.getByRole('button',{name:'取消',exact:true}).click();
  assert.equal((await stored()).length,2);
  await setFile();await importDialog.getByText(/选择导入地点/u).click();
  await importDialog.getByRole('checkbox',{name:'不导入的地点'}).uncheck();
  const choice=importDialog.getByRole('combobox',{name:'处理「'+local.name+'」'});
  assert.equal(await choice.inputValue(),'keep');
  await choice.selectOption('merge');
  await importDialog.getByText('合并后预览',{exact:true}).waitFor();
  await importDialog.getByRole('button',{name:'确认导入'}).click();
  await importDialog.waitFor({state:'hidden'});
  const after=await stored(),kept=after.find(p=>p.id===local.id),fresh=after.find(p=>p.id==='friend-b');
  assert.equal(after.length,3);
  assert.equal(kept.review,'更新后的私人短评');assert.equal(kept.rating,5);
  assert.equal(kept.notes,local.notes);assert.equal(kept.lat,30);assert.equal(kept.heightLimit,2);
  assert.deepEqual(kept.facilities,['厕所','水源']);assert.ok(fresh);assert.equal(fresh.review,undefined);assert.equal(fresh.rating,undefined);
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();
 }
};
