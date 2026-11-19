import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBackupDocument} from '../src/data.js';
import {makeSelectedExport,parsePlaceImportDocument,planPlaceImport,applyPlaceImport} from '../src/place-exchange.js';

const photo=i=>'data:image/jpeg;base64,/9j/A'+i+'A=';
const place=(id,changes={})=>({id,name:'合成地点 A',lat:30,lng:110,category:'湖畔',status:'待核实',facilities:[],notes:'',heightLimit:'',verifiedAt:'',demo:false,favorite:false,...changes});
const asDoc=(places,extra={})=>JSON.stringify({version:1,places,...extra});

test('selected export omits private metadata and photos/notes by default; full backup compatibility',()=>{
 const owned=place('x',{notes:'私密备注',photos:[photo(1)],favorite:true,rating:4,review:'个人点评'});
 const available=[owned,place('other'),place('demo',{demo:true})];
 const json=makeSelectedExport(available,new Set(['x','demo']));
 assert.deepEqual(JSON.parse(json),{version:1,kind:'place-share',places:[{id:'x',name:'合成地点 A',lat:30,lng:110,category:'湖畔',status:'待核实',heightLimit:'',verifiedAt:'',facilities:[]}]});
 assert.equal(parseBackupDocument(json).places.length,1);
 assert.throws(()=>makeSelectedExport(available,['demo','missing']));
 const data=JSON.parse(makeSelectedExport(available,['x'],{includeNotes:true,includePhotos:true}));
 assert.equal(data.places[0].notes,'私密备注');
 assert.deepEqual(data.places[0].photos,[photo(1)]);
 assert.equal(Object.hasOwn(data.places[0],'review'),false);
 assert.equal(Object.hasOwn(data.places[0],'favorite'),false);
 assert.equal(Object.hasOwn(data.places[0],'rating'),false);
 assert.equal(Object.hasOwn(data,'vehicle'),false);
});

test('incoming shared optional omissions and private local fields are not conflicts',()=>{
 const stored=place('current',{notes:'我的现场备注',photos:[photo(1)],favorite:true,rating:5,review:'私密点评'});
 const incoming=parsePlaceImportDocument(makeSelectedExport([place('other')],['other']));
 const plan=planPlaceImport([stored],incoming.places,{kind:incoming.kind});
 assert.equal(plan.duplicates,1);
 assert.equal(plan.conflicts.length,0);
 const out=applyPlaceImport(plan);
 assert.equal(out.places[0],stored);
 assert.equal(out.skipped,1);
});

test('staged import is immutable, keeps existing by default, and merges non-destructively',()=>{
 const stored=place('current',{notes:'本地',photos:[photo(1),photo(2)],favorite:true,rating:5,review:'本地点评',facilities:['厕所'],verifiedAt:'2026-11-19',status:'开放'});
 const conflicting=place('friend',{lat:30.0004,notes:'外部不同',heightLimit:2,photos:[photo(2),photo(3),photo(4)],facilities:['水源'],verifiedAt:'2026-11-18',status:'关闭'});
 const newPlace=place('new',{name:'合成新增营地',lng:111});
 const base=[stored],plan=planPlaceImport(base,[conflicting,newPlace]);
 assert.equal(plan.conflicts.length,1);
 const [c]=plan.conflicts;
 assert.equal(c.reason,'nearby-name');assert.equal(c.canMerge,true);
 assert.equal(c.existing,stored);assert.equal(c.keeps,stored);
 assert.deepEqual(applyPlaceImport(plan),{places:[stored,newPlace],added:1,merged:0,skipped:1});
 const chosen=applyPlaceImport(plan,{[c.key]:'merge'});
 assert.deepEqual(chosen.places[0],{...stored,heightLimit:2,facilities:['厕所','水源'],photos:[photo(1),photo(2),photo(3)]});
 assert.deepEqual(c.merged,chosen.places[0]);
 assert.equal(chosen.merged,1);assert.equal(chosen.added,1);assert.equal(chosen.skipped,0);
 assert.equal(base[0].heightLimit,'');
});

test('same ID far away cannot merge; explicit separation gets a safe distinct ID',()=>{
 const current=place('collision'),far=place('collision',{lat:35});
 const p=planPlaceImport([current],[far]);
 assert.equal(p.conflicts[0].reason,'id-collision');assert.equal(p.conflicts[0].canMerge,false);
 assert.equal(applyPlaceImport(p,{0:'merge'}).places.length,1);
 assert.deepEqual(applyPlaceImport(p,{0:'separate'},{createId:()=> 'new-id'}).places,[current,{...far,id:'new-id'}]);
});

test('two nearby existing matches are ambiguous; do not merge or alter either',()=>{
 const a=place('a'),b=place('b',{lat:30.0004});
 const incoming=place('friend',{lat:30.0002,notes:'不同信息'});
 const p=planPlaceImport([a,b],[incoming]);
 assert.equal(p.conflicts[0].reason,'ambiguous');assert.equal(p.conflicts[0].canMerge,false);
 assert.deepEqual(p.conflicts[0].candidates,[a,b]);
 assert.deepEqual(applyPlaceImport(p).places,[a,b]);
 assert.deepEqual(applyPlaceImport(p,{0:'separate'}).places,[a,b,incoming]);
});

test('incoming file deduplicates repeats (even repeated IDs) and stages differing duplicate records',()=>{
 const a=place('a');
 const incoming=parsePlaceImportDocument(asDoc([a,place('same-data'),{...a,notes:'有用说明',facilities:['水源']}]));
 const p=planPlaceImport([],incoming.places);
 assert.equal(p.duplicates,1);assert.equal(p.additions.length,1);assert.equal(p.conflicts.length,1);
 assert.equal(p.conflicts[0].reason,'same-id');
 assert.deepEqual(applyPlaceImport(p,{0:'merge'}).places,[{...p.additions[0],notes:'有用说明',facilities:['水源']}]);
 assert.throws(()=>parseBackupDocument(asDoc([a,a])));
});

test('identically named but far-away records are added separately, and dissimilar names are not inferred',()=>{
 const a=place('a');
 const b=place('b',{lat:31}),c=place('c',{name:'另一个合成地点',lat:30.0004});
 const plan=planPlaceImport([a],[b,c]);
 assert.deepEqual(applyPlaceImport(plan).places,[a,b,c]);
});

test('portable input discards forged vehicle and private fields; valid full backup retains vehicle and favorite',()=>{
 const vehicle={model:'合成车型',brand:'合成品牌',lengthMm:4200};
 const a=place('a',{favorite:true,demo:true});
 const legacy=parsePlaceImportDocument(asDoc([a],{vehicle}));
 assert.equal(legacy.vehicle.model,vehicle.model);
 assert.equal(legacy.places[0].favorite,true);
 const shared=parsePlaceImportDocument(asDoc([a],{vehicle,kind:'place-share'}));
 assert.equal(shared.vehicle,null);
 assert.equal(shared.places[0].favorite,false);
 assert.equal(shared.places[0].demo,false);
});

test('different names at the same pin are shown as a possible conflict, never silently merged',()=>{
 const stored=place('a');
 const incoming=place('b',{name:'朋友称呼不同',facilities:['水源']});
 const plan=planPlaceImport([stored],[incoming]);
 assert.equal(plan.conflicts[0].reason,'same-pin');
 assert.deepEqual(applyPlaceImport(plan).places,[stored]);
 assert.deepEqual(applyPlaceImport(plan,{0:'separate'}).places,[stored,incoming]);
});
