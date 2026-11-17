import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePlace,parseBackup,navigationUrl,samples} from '../src/data.js';
test('coordinates must be finite and within WGS-84 range',()=>{for(const [lat,lng] of [[91,10],[10,181],['',10],[null,10],['oops',10]])assert.throws(()=>validatePlace({...samples[0],lat,lng}));assert.equal(validatePlace({...samples[0],lat:0,lng:0}).lat,0)});
test('backup round trip and duplicate protection',()=>{assert.equal(parseBackup(JSON.stringify({version:1,places:samples})).length,3);assert.throws(()=>parseBackup(JSON.stringify({version:2,places:samples})));assert.throws(()=>parseBackup(JSON.stringify({version:1,places:[samples[0],samples[0]]})));});
test('untrusted backup fields validated and unexpected fields removed',()=>{assert.throws(()=>validatePlace({...samples[0],facilities:['fake']}));assert.throws(()=>validatePlace({...samples[0],heightLimit:-1}));assert.equal(validatePlace({...samples[0],injected:'bad'}).injected,undefined);});
test('navigation uses latitude longitude and API flag',()=>{const u=new URL(navigationUrl({...samples[0],lat:-30,lng:120}));assert.equal(u.searchParams.get('api'),'1');assert.equal(u.searchParams.get('destination'),'-30,120');});
