import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLE_BRANDS, VEHICLE_CATALOG, vehiclesForBrand} from '../src/vehicle-catalog.js';
import {validateVehicle} from '../src/vehicle.js';

test('catalog has separate, non-overlapping groups with audited added brand coverage', ()=>{
 const rows=VEHICLE_BRANDS.flatMap(vehiclesForBrand);
 assert.equal(new Set(rows.map(v=>v.id)).size, VEHICLE_CATALOG.length);
 assert.equal(rows.length, VEHICLE_CATALOG.length);
 for(const [brand,count] of [['小米',4],['蔚来',3],['小鹏',4],['问界',3],['理想',5]]){
  const group=vehiclesForBrand(brand);
  assert.ok(group.length>=count);
  assert.ok(group.every(v=>v.brand===brand && v.model.startsWith(brand+' ') && new URL(v.sourceUrl).protocol==='https:'));
 }
 assert.deepEqual(vehiclesForBrand(''),[]);
 assert.deepEqual(vehiclesForBrand('未收录品牌'),[]);
});

test('similarly named variants retain their own dimensions and saved manual overrides win', ()=>{
 const find=id=>VEHICLE_CATALOG.find(v=>v.id===id);
 assert.equal(find('xiaomi-su7-2026-standard').heightMm,1460);
 assert.equal(find('xiaomi-su7-2026-pro-max').heightMm,1445);
 assert.equal(find('xpeng-g6-2026-625-max').lengthMm,4758);
 assert.equal(find('xpeng-g6-2026-1704-max').lengthMm,4771);
 const selected=find('li-l6-2024');
 assert.equal(selected.brand,'理想');
 const edited=validateVehicle({...selected,catalogId:selected.id,heightMm:1850});
 assert.equal(edited.catalogId,selected.id);
 assert.equal(edited.heightMm,1850);
 assert.equal(selected.heightMm,1735);
 assert.equal(validateVehicle({model:'我的床车',heightMm:2100}).catalogId,'');
});

test('common brand without preset is selectable and the manual override keeps that brand', ()=>{
 assert.ok(VEHICLE_BRANDS.includes('大众'));
 assert.deepEqual(vehiclesForBrand('大众'),[]);
 assert.deepEqual(validateVehicle({brand:' 大众 ',model:'我的旅行车',heightMm:'1850'}),{
  brand:'大众',catalogId:'',model:'我的旅行车',heightMm:1850,lengthMm:'',widthMm:'',
 });
 assert.equal('brand' in validateVehicle({model:'旧版手填车型'}),false);
});

test('Xiaomi includes separate dimensions for distinct SU7, YU7 and SkyNomad variants', ()=>{
 const group=Object.fromEntries(vehiclesForBrand('小米').map(v=>[v.id,v]));
 for(const [id,L,W,H] of [
  ['xiaomi-su7-2024-standard-pro',4997,1963,1455],
  ['xiaomi-su7-2024-max',4997,1963,1440],
  ['xiaomi-su7-2026-standard',4997,1963,1460],
  ['xiaomi-su7-2026-pro-max',4997,1963,1445],
  ['xiaomi-su7-ultra-standard-2025',5070,1970,1465],
  ['xiaomi-su7-ultra-2025',5115,1970,1465],
  ['xiaomi-yu7-2025-long-range',4999,1996,1608],
  ['xiaomi-yu7-2025',4999,1996,1600],
  ['xiaomi-yu7-2026-standard',4999,1996,1608],
  ['xiaomi-yu7-gt-2026',5015,2007,1597],
  ['xiaomi-skynomad-n70-pro',4960,1998,1785],
  ['xiaomi-skynomad-n70-max',4960,1998,1765],
  ['xiaomi-skynomad-n90-max',5285,1998,1825],
  ['xiaomi-skynomad-n90-max-expedition',5285,1998,1925],
 ]){
  const v=group[id];
  assert.ok(v,id);
  assert.deepEqual([v.lengthMm,v.widthMm,v.heightMm],[L,W,H],id);
 }
});
