import test from 'node:test';
import assert from 'node:assert/strict';
import {samples,parseBackup,parseBackupDocument,validatePlace,baiduMarkerUrl} from '../src/data.js';
import {validateVehicle} from '../src/vehicle.js';
import {VEHICLE_CATALOG} from '../src/vehicle-catalog.js';
import {validatePhotos,MAX_PHOTO_BYTES} from '../src/photos.js';

const photo='data:image/jpeg;base64,/9j/AA==';
const vehicle={catalogId:'changan-cs75plus-4-2026',model:'长安 CS75 PLUS',lengthMm:4770,widthMm:1910,heightMm:1750};
test('old v1 backs up unchanged; photos and manually overridden vehicle dimensions round-trip',()=>{
 const legacy=JSON.stringify({version:1,places:samples});
 const restored=parseBackupDocument(legacy);
 assert.equal(restored.vehicle,null);
 assert.deepEqual(restored.places,parseBackup(legacy));
 assert.equal(restored.places[0].photos,undefined);
 const input={version:1,places:[{...samples[0],photos:[photo]}],vehicle};
 const output=parseBackupDocument(JSON.stringify(input));
 assert.equal(output.places[0].photos[0],photo);
 assert.deepEqual(output.vehicle,vehicle);
 assert.equal(validatePlace({...output.places[0],photos:[]}).photos,undefined);
});

test('backups reject arbitrary URL payloads and invalid photo collections',()=>{
 for(const candidate of [null,[{}],[null],Array(4).fill(photo),['javascript:alert(1)'],['data:image/svg+xml;base64,AAA='],['data:image/jpeg;base64,/9j/$$$='],['data:image/jpeg;base64,/9j/'+('a'.repeat(MAX_PHOTO_BYTES*2))]]){
  assert.throws(()=>validatePhotos(candidate),/照片|JPEG/);
 }
 assert.deepEqual(validatePhotos(undefined),[]);
});

test('factory entries are trim-specific, sourced, and load as validated whole millimeters',()=>{
 assert.ok(VEHICLE_CATALOG.length>=10);
 assert.equal(new Set(VEHICLE_CATALOG.map(x=>x.id)).size,VEHICLE_CATALOG.length);
 for(const row of VEHICLE_CATALOG){
  assert.equal(new URL(row.sourceUrl).protocol,'https:');
  const vc=validateVehicle({...row,model:row.model+' '+row.trim,catalogId:row.id});
  for(const k of ['lengthMm','widthMm','heightMm'])assert.ok(Number.isInteger(vc[k]));
 }
 assert.ok(VEHICLE_CATALOG.find(x=>x.id==='maxus-v80-short-mid').heightMm>VEHICLE_CATALOG.find(x=>x.id==='maxus-v80-short-low').heightMm);
 const custom=validateVehicle({model:' 自改床车 ',heightMm:'2350'});
 assert.equal(custom.model,'自改床车');assert.equal(custom.heightMm,2350);assert.equal(custom.widthMm,'');
 for(const input of ['12.5','0x1000','1e3',true,500.5,9000])assert.throws(()=>validateVehicle({model:'车辆',heightMm:input}),/车高/);
});

test('Baidu marker sends explicit WGS84 coordinates but not private name or notes',()=>{
 const url=new URL(baiduMarkerUrl({lat:30.25,lng:120.15,name:'私人地点',notes:'不应发送'}));
 assert.equal(url.origin,'https://api.map.baidu.com');
 assert.equal(url.pathname,'/marker');
 assert.equal(url.searchParams.get('coord_type'),'wgs84');
 assert.equal(url.searchParams.get('location'),'30.25,120.15');
 assert.equal(decodeURIComponent(url.href).includes('私人'),false);
});
