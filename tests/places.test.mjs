import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPrices,placeFromOSM,cities,places,prices} from '../lib/places.js';
import assistant from '../api/assistant.js';
test('city lookup translates common Russian names and excludes unrelated businesses',async()=>{
  const original=global.fetch;global.fetch=async url=>{assert.match(url,/layer=city/);assert.match(decodeURIComponent(url),/Nha Trang/);return {ok:true,text:async()=>JSON.stringify({features:[{properties:{osm_key:'amenity',osm_value:'cafe',name:'Wrong city cafe'},geometry:{coordinates:[1,2]}},{properties:{osm_key:'place',osm_value:'city',name:'Nha Trang',country:'Vietnam',osm_type:'N',osm_id:1},geometry:{coordinates:[109.19,12.24]}}]})};};
  try{const d=await cities('Нячанг');assert.equal(d.cities.length,1);assert.equal(d.cities[0].lat,12.24);}finally{global.fetch=original;}
});
test('prices preserve ticket categories and currency, reject unrelated amounts',()=>{
  const html='<script>Admission 999 USD</script><p>Hotel room 200 USD</p><table><tr><th>Ticket</th><th>Adult</th><th>Child</th></tr><tr><td>Entrance</td><td>950,000 VND</td><td>710,000 VND</td></tr></table>';
  const d=extractPrices(html,'https://example.com/tickets');assert.equal(d.length,1);assert.match(d[0].context,/Adult.*Child/);assert.match(d[0].text,/950,000 VND.*710,000 VND/);assert.equal(d[0].source,'https://example.com/tickets');
  assert.equal(extractPrices('<p>Hotel 100 USD</p><p>Phone 123456789</p>','https://example.com').length,0);
});
test('do not fabricate missing prices or accept arbitrary fetch URLs',async()=>{
  assert.equal(extractPrices('<p>Tickets available online</p>','https://example.com').length,0);
  await assert.rejects(prices('https://127.0.0.1'),/Некорректное/);
  await assert.rejects(places({lat:12,lon:109,radius:100000}),/Выберите/);
});
test('catalog uses real names, excludes abandoned places, does not treat OSM charge as verified fare',()=>{
  const p=placeFromOSM({type:'node',id:12,lat:12,lon:109,tags:{name:'Place',tourism:'museum',charge:'30 VND'}});assert.equal(p.charge,'30 VND');assert.equal(p.prices,undefined);assert.match(p.source,/node\/12$/);
  assert.equal(placeFromOSM({tags:{name:'Closed',abandoned:'yes'}}),null);
});
test('assistant creates a free draft from facts and rejects missing facts',async()=>{
  async function request(input){let status=200,data;await assistant({method:'POST',body:{message:'Подготовь черновик поста',input}},{setHeader(){},status(s){status=s;return this;},json(d){data=d;return this;}});return {status,data};}
  const ok=await request({title:'Тур',facts:'Обед отдельно.'});assert.equal(ok.status,200);assert.equal(ok.data.result.provider,'rules');assert.match(ok.data.result.output.post,/Обед отдельно/);
  assert.equal((await request({title:'Тур'})).status,400);
});
