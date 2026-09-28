import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../cui-interface/companion-worker.js',import.meta.url),'utf8').replace("import './background.js';",'');
function harness(fetch){let listener;const chrome={runtime:{id:'test-extension',onMessage:{addListener:l=>{listener=l;}}}};vm.runInNewContext(code,{chrome,URL,Map,Date,AbortSignal,fetch});return {send(message,sender={id:'test-extension',tab:{id:1},url:'https://lhr-sis.comsats.edu.pk/Courses/Index'}){return new Promise(resolve=>{const pending=listener(message,sender,resolve);if(!pending)resolve(undefined);});}};}
test('public provider pins destination, omits credentials, caches and sends no SIS values',async()=>{
  const calls=[];const worker=harness(async(url,options)=>{calls.push({url:String(url),options});return {ok:true,headers:new Headers({'content-type':'text/html'}),text:async()=>'<p>public</p>'};});
  const query={type:'sis-studio-public-timetable',kind:'room',who:'A-2'};
  const first=await worker.send(query);const second=await worker.send(query);
  assert.equal(first.ok,true);assert.equal(second.fetchedAt,first.fetchedAt);assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://sfs.cuilahore.edu.pk/schedule/Public/Timetable?Kind=room&Who=A-2');
  assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.body,undefined);
});
test('public provider rejects wrong senders, arbitrary kinds and malformed input',async()=>{
  let calls=0;const worker=harness(async()=>{calls++;throw Error('unexpected');});const query={type:'sis-studio-public-timetable',kind:'room',who:'A-2'};
  assert.equal(await worker.send(query,{id:'other',tab:{},url:'https://lhr-sis.comsats.edu.pk/'}),undefined);
  assert.equal(await worker.send(query,{id:'test-extension',tab:{},url:'https://evil.example/'}),undefined);
  assert.equal((await worker.send({...query,kind:'private'})).ok,false);
  assert.equal((await worker.send({...query,who:'<script>'})).ok,false);assert.equal(calls,0);
});
test('public provider errors do not manufacture an empty schedule',async()=>{
  const worker=harness(async()=>{throw Error('offline');});const result=await worker.send({type:'sis-studio-public-timetable',kind:'room',who:'A-2'});
  assert.equal(result.ok,false);assert.equal(result.html,undefined);assert.match(result.error,/No availability has been assumed/);
});
test('packaged wrapper keeps original backup events, deduplication and login reset',async()=>{
  const listeners={};const event=name=>({addListener:fn=>{listeners[name]=fn;}});
  const area=()=>{const data={};return {async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));},async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete data[key];}};};
  const originalChrome=globalThis.chrome,originalFetch=globalThis.fetch;
  const local=area(),session=area();let reads=0,writes=0;
  globalThis.chrome={storage:{local,session},runtime:{id:'integration',onInstalled:event('install'),onMessage:event('message')},action:{onClicked:event('click'),async setBadgeText(){}},tabs:{async create(){}},webRequest:{onBeforeRequest:event('before'),onCompleted:event('completed')},alarms:{onAlarm:event('alarm'),async create(){},async clear(){}}};
  globalThis.fetch=async(url)=>{
    if(String(url).startsWith('https://lhr-sis.comsats.edu.pk/')){reads++;const response=new Response('<html><body><form id="synopsisForm"><input name="uid" value="TEST-001"><input name="pwd" type="password" hidden value="Synthetic Student"></form></body></html>',{headers:{'content-type':'text/html'}});Object.defineProperty(response,'url',{value:'https://lhr-sis.comsats.edu.pk/RESULTCARD'});return response;}
    writes++;return new Response('{}',{status:201});
  };
  const settle=async()=>{for(let i=0;i<30;i++)await new Promise(resolve=>setImmediate(resolve));};
  try{
    await import('../cui-interface/companion-worker.js');
    assert.ok(listeners.before && listeners.completed && listeners.alarm && listeners.click && listeners.message);
    const visit=()=>listeners.completed({statusCode:200,url:'https://lhr-sis.comsats.edu.pk/RESULTCARD'});
    visit();visit();await settle();assert.equal(reads,1);assert.equal(writes,2);assert.equal((await local.get('status')).status.state,'uploaded');
    listeners.before({method:'POST',type:'main_frame',url:'https://lhr-sis.comsats.edu.pk/'});visit();await settle();assert.equal(reads,2);assert.equal(writes,4);
  }finally{globalThis.chrome=originalChrome;globalThis.fetch=originalFetch;}
});
