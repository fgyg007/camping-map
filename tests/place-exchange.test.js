import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBackupDocument,serializeBackupDocument} from '../src/data.js';
import {makeSelectedExport,parsePlaceImportDocument,planPlaceImport,previewPlaceMerges,previewPlaceImport,applyPlaceImport} from '../src/place-exchange.js';

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
 assert.deepEqual(previewPlaceMerges(plan,{[c.key]:'merge'}).get(stored.id),chosen.places[0]);
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

test('preview shows one final result per place, reflecting choice changes and file order',()=>{
 const stored=place('local',{photos:[photo(1),photo(2)],rating:4,review:'不覆盖'});
 const a=place('friend-a',{heightLimit:2,photos:[photo(3)],facilities:['厕所']});
 const b=place('friend-b',{heightLimit:3,photos:[photo(4)],facilities:['水源']});
 for(const [first,second] of [[a,b],[b,a]]){
  const plan=planPlaceImport([stored],[first,second]);
  const both={0:'merge',1:'merge'},secondOnly={0:'separate',1:'merge'};
  assert.equal(previewPlaceMerges(plan).size,0);
  const finalPreview=previewPlaceMerges(plan,both);
  assert.equal(finalPreview.size,1);
  assert.deepEqual(finalPreview.get(stored.id),{
   ...stored,heightLimit:first.heightLimit,photos:[...stored.photos,...first.photos],
   facilities:[...first.facilities,...second.facilities],
  });
  assert.deepEqual(applyPlaceImport(plan,both).places,[...finalPreview.values()]);
  const changedPreview=previewPlaceMerges(plan,secondOnly).get(stored.id);
  assert.deepEqual(changedPreview,{...stored,heightLimit:second.heightLimit,photos:[...stored.photos,...second.photos],facilities:second.facilities});
  assert.deepEqual(applyPlaceImport(plan,secondOnly).places,[changedPreview,first]);
  assert.equal(stored.heightLimit,'');
 }
});

const ride=(id,edits={})=>({id,date:'2026-11-18',vehicle:{model:'合成实测车',lengthMm:5000,widthMm:1990,heightMm:1850,clearanceMm:175},outcome:'途中掉头',approach:'东入口',conditions:'雨后',notes:'谨慎掉头',photos:[photo(1)],...edits});
test('visit export is explicit, versioned, and preserves a frozen snapshot without private profile or reviews',()=>{
 const visit=ride('r1',{vehicle:{...ride('x').vehicle,catalogId:'not-shared',brand:'not-shared'},privateReview:'ignored'});
 const p=place('p1',{notes:'私有备注',review:'私有短评',rating:4,visitReports:[visit]});
 const regular=JSON.parse(makeSelectedExport([p],['p1']));
 assert.equal(regular.version,1);
 assert.equal(regular.places[0].visitReports,undefined);
 const opted=makeSelectedExport([p],['p1'],{includeVisits:true});
 const rich=JSON.parse(opted);
 assert.equal(rich.version,2);
 assert.equal(rich.places[0].notes,undefined);
 assert.equal(rich.places[0].review,undefined);
 assert.equal(rich.places[0].rating,undefined);
 assert.deepEqual(parsePlaceImportDocument(opted).places[0].visitReports,[ride('r1')]);
 assert.equal(parsePlaceImportDocument(opted).vehicle,null);
 assert.throws(()=>parsePlaceImportDocument(JSON.stringify({...rich,version:1})),/版本 2/);
 assert.throws(()=>parseBackupDocument(JSON.stringify({...rich,version:1})),/版本 2/);
 const own=JSON.parse(serializeBackupDocument([p],{model:'本机车辆',clearanceMm:180}));
 assert.equal(own.version,2);
 assert.equal(parseBackupDocument(JSON.stringify(own)).places[0].review,p.review);
 assert.equal(parseBackupDocument(JSON.stringify(own)).vehicle.clearanceMm,180);
 assert.equal(JSON.parse(serializeBackupDocument([place('ordinary')])).version,1);
 assert.equal(JSON.parse(serializeBackupDocument([place('ordinary')],{model:'本机车辆',clearanceMm:180})).version,2);
});

test('default report-only import on a matched camp preserves local fields and report collisions survive safely',()=>{
 const existing=place('local',{notes:'本机备注',rating:5,review:'本机点评',favorite:true,visitReports:[ride('collides')]});
 const other=place('remote',{notes:'车友备注',facilities:['水源'],visitReports:[ride('collides',{conditions:'晴'}),ride('same-data')]});
 const plan=planPlaceImport([existing],[other],{kind:'place-share'});
 assert.equal(plan.conflicts[0].defaultChoice,'reports');
 const preview=previewPlaceImport(plan);
 const result=applyPlaceImport(plan);
 assert.equal(result.places.length,1);
 assert.equal(result.places[0].notes,existing.notes);
 assert.equal(result.places[0].review,existing.review);
 assert.equal(result.places[0].favorite,existing.favorite);
 assert.deepEqual(result.places[0].visitReports,[ride('collides'),ride('collides_copy2',{conditions:'晴'})]);
 assert.deepEqual(preview.byId.get('local'),result.places[0]);
 assert.equal(preview.addedReports,1);
 assert.deepEqual(applyPlaceImport(plan,{0:'keep'}).places,[existing]);
 assert.deepEqual(applyPlaceImport(plan,{0:'merge'}).places[0],{...result.places[0],facilities:['水源']});
 const repeated=planPlaceImport(result.places,[other],{kind:'place-share'});
 assert.equal(previewPlaceImport(repeated).addedReports,0);
 assert.deepEqual(applyPlaceImport(repeated).places,result.places);
});

test('visit dedupe works among new records, and import never silently exceeds the report limit',()=>{
 const d=planPlaceImport([],[place('p',{visitReports:[ride('r1'),ride('r2')]})]);
 assert.equal(previewPlaceImport(d).addedReports,1);
 assert.deepEqual(applyPlaceImport(d).places[0].visitReports,[ride('r1')]);
 const filled=place('full',{visitReports:Array.from({length:100},(_,i)=>ride('r'+i,{notes:'记录 '+i}))});
 const p=planPlaceImport([filled],[place('new',{visitReports:[ride('r1',{notes:'新记录'})]})]);
 assert.equal(previewPlaceImport(p).reportOverflow,1);
 assert.throws(()=>applyPlaceImport(p),/超过 100/);
 assert.deepEqual(applyPlaceImport(p,{0:'keep'}).places,[filled]);
});

test('similar pins with different names require a human to choose report append',()=>{
 const local=place('local'), incoming=place('new',{name:'另一个地点',visitReports:[ride('r1')]});
 const plan=planPlaceImport([local],[incoming]);
 assert.equal(plan.conflicts[0].reason,'same-pin');
 assert.equal(plan.conflicts[0].defaultChoice,'keep');
 assert.deepEqual(applyPlaceImport(plan).places,[local]);
 assert.deepEqual(applyPlaceImport(plan,{0:'reports'}).places,[{...local,visitReports:[ride('r1')]}]);
});
