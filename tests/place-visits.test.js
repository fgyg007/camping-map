import test from 'node:test';
import assert from 'node:assert/strict';
import {compareVehicles,validateVisitReport,validateVisitReports} from '../src/place-visits.js';
const vehicle={model:'合成车',lengthMm:5000,widthMm:2000,heightMm:1850,clearanceMm:170};
const trip={id:'safe-a',date:'2026-11-18',vehicle,outcome:'途中掉头',approach:'东入口',conditions:'雨后'};
test('vehicle comparison uses signed mm differences and only converts for display',()=>{
 const [l,w,h,c]=compareVehicles(vehicle,{lengthMm:4580,widthMm:1880,heightMm:1850,clearanceMm:200});
 assert.deepEqual([l.deltaMm,l.text,w.deltaMm,w.text,h.deltaMm,h.text,c.deltaMm,c.text],[420,'长 42 cm',120,'宽 12 cm',0,'相同',-30,'低 3 cm']);
 assert.deepEqual(compareVehicles(vehicle,{lengthMm:'',widthMm:1999}).map(x=>x.text),['未知','宽 0.1 cm','未知','未知']);
});
test('report snapshots and validation preserve dated evidence without retaining profile metadata',()=>{
 const profile={...vehicle,brand:'非公开本机字段',catalogId:'sample-id'};
 const one=validateVisitReport({...trip,vehicle:profile});
 profile.widthMm=2200;
 assert.equal(one.vehicle.widthMm,2000);
 assert.equal(Object.hasOwn(one.vehicle,'catalogId'),false);
 assert.equal(one.outcome,'途中掉头');
 assert.deepEqual(validateVisitReports([one,{...one,id:'safe-b',date:'2026-11-20'}]).map(x=>x.id),['safe-a','safe-b']);
 assert.throws(()=>validateVisitReports([one,one]),/重复/);
 assert.throws(()=>validateVisitReport({...trip,date:'2026-02-30'}),/日期/);
 assert.throws(()=>validateVisitReport({...trip,vehicle:{...vehicle,clearanceMm:49}}),/离地间隙/);
 assert.throws(()=>validateVisitReport({...trip,photos:['https://example.com/a.jpg']}),/照片/);
 assert.equal(validateVisitReport({...trip,source:'self'}).source,'self');
 assert.equal(validateVisitReport({...trip,source:'friend'}).source,'friend');
 assert.equal(Object.hasOwn(validateVisitReport(trip),'source'),false);
 assert.equal(Object.hasOwn(validateVisitReport({...trip,source:'untrusted'}),'source'),false);
});
