import test from 'node:test';
import assert from 'node:assert/strict';
import {execute,registry,integrations} from '../lib/orchestrator.js';
import {normalizeConnection,syncConnection} from '../lib/connections.js';
import {publicIPv4,publicURL} from '../lib/public-fetch.js';
import handler from '../api/orchestrator.js';
test('all 18 existing directions have unique executable identities',()=>{
  assert.equal(registry().length,18);assert.equal(new Set(registry().map(m=>m.id)).size,18);
  assert.equal(integrations().localAI.status,'not_connected');
});
test('free content preserves facts and never calls paid AI',async()=>{
  const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network forbidden');};
  try{const r=await execute('content',{title:'Далат',facts:'Обед оплачивается отдельно.'});assert.match(r.output.post,/Обед оплачивается отдельно/);assert.equal(r.provider,'rules');assert.equal(r.needsHumanApproval,true);assert.equal(r.cost,'no_paid_api');}finally{globalThis.fetch=original;}
});
test('missing facts fail; unavailable translation is blocked',async()=>{
  await assert.rejects(execute('content',{title:'Тур'}),/факты/);
  assert.equal((await execute('languages',{text:'Текст',language:'en'})).status,'blocked');
});
test('local generation uses supplied runtime only',async()=>{
  const result=await execute('languages',{text:'Hello',language:'ru'},{generate:async prompt=>{assert.match(prompt,/Russian/);return 'Здравствуйте';}});
  assert.equal(result.output.translation,'Здравствуйте');assert.equal(result.provider,'local_ai');
});
test('social URLs normalize and unsupported platforms never pretend to synchronize',async()=>{
  assert.equal(normalizeConnection({url:'https://t.me/s/gettravel'}).url,'https://t.me/gettravel');
  const r=await syncConnection({url:'https://www.tiktok.com/@gettravel'},()=>{throw Error('Should not fetch');});
  assert.equal(r.status,'needs_account');assert.equal(r.lastSuccessAt,undefined);
  assert.throws(()=>normalizeConnection({url:'https://t.me/+private'}));
  assert.throws(()=>normalizeConnection({url:'https://user:pass@example.com'}));
});
test('Telegram extracts public evidence, detects changes and keeps failures honest',async()=>{
  const fixture={ok:true,status:200,text:'<title>Channel</title><div class="tgme_widget_message_text js-message_text">Далат &amp; море</div>'};
  const first=await syncConnection({url:'https://t.me/gettravel'},async()=>fixture);
  assert.equal(first.items[0].text,'Далат & море');assert.equal(first.changed,null);
  const second=await syncConnection({...first},async()=>fixture);assert.equal(second.changed,false);
  const failed=await syncConnection(first,async()=>({ok:false,status:403}));assert.equal(failed.status,'error');assert.equal(failed.lastSuccessAt,undefined);
  const empty=await syncConnection(first,async()=>({...fixture,text:'<title>Telegram</title>'}));assert.equal(empty.status,'unavailable');
});
test('SSRF blocks local, link-local, encoded IP forms and credential-bearing links',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.1.1','192.168.1.1','100.64.0.1','0.0.0.0','224.0.0.1','::1'])assert.equal(publicIPv4(ip),false,ip);
  assert.equal(publicIPv4('8.8.8.8'),true);
  assert.equal(publicIPv4(publicURL('https://2130706433').hostname),false);
  for(const u of ['http://example.com','https://example.com:444','https://a:b@example.com','https://localhost','file:///etc/passwd'])assert.throws(()=>publicURL(u));
});
test('metric calculations validate denominators and do not invent zeros',async()=>{
  const result=await execute('analytics',{spend:100,clicks:50,leads:5,sales:1});assert.equal(result.output.CPL,20);assert.equal(result.output.conversionPercent,10);
  const zero=await execute('leads',{spend:0,clicks:0,leads:0,sales:0});assert.equal(zero.output.CPL,null);
  await assert.rejects(execute('ads',{spend:10,clicks:1,leads:2,sales:1}));
  await assert.rejects(execute('ads',{spend:'',clicks:0,leads:0,sales:0}));
});
test('design escapes markup, video returns real subtitles, empty sources block',async()=>{
  const d=await execute('design',{title:'<script>alert(1)</script>'});assert.ok(!d.output.file.includes('<script>'));
  const v=await execute('video',{title:'Далат',facts:'Программа по запросу'});assert.match(v.output.file,/00:00:05,000/);
  assert.equal((await execute('competitors')).status,'blocked');
});
test('API rejects foreign origins, unknown actions, large requests',async()=>{
  async function request(body,origin){let code=200,data;await handler({method:'POST',body,headers:{host:'example.com',origin}},{setHeader(){},status(n){code=n;return this},json(d){data=d}});return {code,data};}
  assert.equal((await request({action:'director'},'https://evil.example')).code,403);
  assert.equal((await request({action:'unknown'})).code,400);
  assert.equal((await request({action:'content',input:{facts:'x'.repeat(100001)}})).code,400);
  assert.equal((await request({action:'director'})).data.status,'completed');
});
