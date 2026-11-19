import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBackupDocument,PLACE_REVIEW_MAX,samples,validatePlace} from '../src/data.js';
import {sortPlaces} from '../src/place-review.js';

test('personal rating, short review and added date survive a v1 round trip without replacing field notes',()=>{
 const createdAt='2026-11-19T10:00:00Z';
 const place={...samples[0],rating:2,review:'  风景不错，但睡不着。  ',notes:'入口窄。',createdAt};
 const actual=parseBackupDocument(JSON.stringify({version:1,places:[place]})).places[0];
 assert.equal(actual.rating,2);
 assert.equal(actual.review,'风景不错，但睡不着。');
 assert.equal(actual.notes,'入口窄。');
 assert.equal(actual.createdAt,'2026-11-19T10:00:00.000Z');
 for(const optional of ['rating','review','createdAt']){
  assert.equal(Object.hasOwn(validatePlace(samples[0]),optional),false);
 }
 assert.equal(Object.hasOwn(validatePlace({...place,rating:'',review:'  '}),'rating'),false);
 assert.equal(Object.hasOwn(validatePlace({...place,rating:'',review:'  '}),'review'),false);
});

test('rejects invalid optional rating, review and time instead of silently truncating a backup',()=>{
 for(const rating of [0,6,2.5,'4',true,NaN])assert.throws(()=>validatePlace({...samples[0],rating}),/评分/);
 for(const review of [42,{},'好'.repeat(PLACE_REVIEW_MAX+1)])assert.throws(()=>validatePlace({...samples[0],review}),/短评/);
 for(const createdAt of [123,'2026-11-19','2026-02-30T00:00:00Z','2026-11-19T12:00:00+08:00','not a date'])
  assert.throws(()=>validatePlace({...samples[0],createdAt}),/日期/);
});

test('sorting preserves ties/input and places unrated or undated records after known values',()=>{
 const places=[
  {id:'legacy',name:'营地 10'},
  {id:'a',name:'营地 2',rating:4,createdAt:'2026-08-20T00:00:00Z'},
  {id:'b',name:'营地 1',rating:4,createdAt:'2026-11-19T00:00:00Z'},
  {id:'c',name:'营地 3',rating:1,createdAt:'2026-11-19T00:00:00Z'}
 ];
 const ids=list=>list.map(x=>x.id);
 assert.equal(sortPlaces(places),places);
 assert.deepEqual(ids(sortPlaces(places,'rating')),['a','b','c','legacy']);
 assert.deepEqual(ids(sortPlaces(places,'recent')),['b','c','a','legacy']);
 assert.deepEqual(ids(sortPlaces(places,'name')),['b','a','c','legacy']);
 assert.deepEqual(ids(places),['legacy','a','b','c']);
});
