import {publicFetch,publicURL} from './public-fetch.js';

const UA='GetTravelMarketing/3.0 (https://gettravel.asia; destination research)';
const cache=new Map(),pending=new Map(),placeCache=new Map();
async function cached(key,load,ttl=3600000){
  const old=cache.get(key);if(old&&old.until>Date.now())return old.data;
  if(pending.has(key))return pending.get(key);
  const job=load().then(data=>{if(cache.size>=150)cache.delete(cache.keys().next().value);cache.set(key,{until:Date.now()+ttl,data});return data;}).finally(()=>pending.delete(key));pending.set(key,job);return job;
}
async function json(url,options={}){
  const r=await fetch(url,{...options,headers:{'User-Agent':UA,...options.headers},signal:AbortSignal.timeout(22000)});
  if(!r.ok)throw Error('Источник ответил HTTP '+r.status);
  const body=await r.text();if(body.length>3000000)throw Error('Ответ источника слишком большой');return JSON.parse(body);
}
const aliases={'нячанг':'Nha Trang','фукуок':'Phu Quoc','далат':'Da Lat','дананг':'Da Nang','хошимин':'Ho Chi Minh City','ханой':'Hanoi','бангкок':'Bangkok','паттайя':'Pattaya','пхукет':'Phuket','батумі':'Batumi','батуми':'Batumi','стамбул':'Istanbul'};
export async function cities(query){
  const q=String(query||'').trim();if(q.length<2||q.length>100)throw Error('Введите город (от 2 до 100 символов).');
  const search=aliases[q.toLowerCase()]||q;
  return cached('city:'+search.toLowerCase(),async()=>{
    let data=await json('https://photon.komoot.io/api/?layer=city&limit=6&q='+encodeURIComponent(search));
    if(!data.features?.length)data=await json('https://photon.komoot.io/api/?limit=6&q='+encodeURIComponent(search));
    const seen=new Set();
    return {cities:(data.features||[]).filter(f=>['place','boundary'].includes(f.properties?.osm_key)&&['city','town','village','island','administrative'].includes(f.properties.osm_value)).flatMap(f=>{
      const p=f.properties,[lon,lat]=f.geometry.coordinates,label=[p.name,p.state,p.country].filter(Boolean).join(', ');if(seen.has(label))return [];seen.add(label);
      return [{label,lat,lon,id:p.osm_type+p.osm_id}];
    }),source:'Photon / OpenStreetMap',checkedAt:new Date().toISOString()};
  });
}
async function overpass(query){
  let error;
  for(const host of ['https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter']){
    try{const d=await json(host,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query)});if(d.remark)throw Error('Источник вернул неполный результат');return d;}catch(e){error=e;}
  }throw Error('Каталог мест временно недоступен. '+error.message);
}
const categories={theme_park:'Парки развлечений',zoo:'Зоопарки и сафари',aquarium:'Океанариумы',museum:'Музеи',attraction:'Достопримечательности',viewpoint:'Смотровые площадки',water_park:'Аквапарки',park:'Парки',theatre:'Театры и шоу',cinema:'Кинотеатры',arts_centre:'Арт-центры',castle:'Исторические места',ruins:'Исторические места',monument:'Исторические места'};
export function placeFromOSM(e){
  const t=e.tags||{},name=t['name:ru']||t['name:en']||t.name;const point=e.center||e;
  if(!name||t.disused==='yes'||t.abandoned==='yes'||t.access==='private')return null;
  return {id:e.type+'/'+e.id,name,originalName:t.name||name,category:categories[t.tourism]||categories[t.leisure]||categories[t.amenity]||categories[t.historic]||'Достопримечательности',lat:point.lat,lon:point.lon,website:t.website||t['contact:website']||'',wikidata:t.wikidata||'',description:t['description:ru']||t['description:en']||t.description||'',hours:t.opening_hours||'',fee:t.fee||'',charge:t.charge||'',source:'https://www.openstreetmap.org/'+e.type+'/'+e.id};
}
export async function places(input){
  const lat=Number(input.lat),lon=Number(input.lon),radius=Number(input.radius||25);
  if(input.lat==null||input.lon==null||!Number.isFinite(lat)||Math.abs(lat)>85||!Number.isFinite(lon)||Math.abs(lon)>180||![10,25,50].includes(radius))throw Error('Выберите город и радиус поиска.');
  return cached(`places:${lat}:${lon}:${radius}`,async()=>{
    const dy=radius/111.32,dx=dy/Math.cos(lat*Math.PI/180);
    const area=`(${lat-dy},${lon-dx},${lat+dy},${lon+dx})`;
    const query=`[out:json][timeout:16];(nwr["tourism"~"^(theme_park|zoo|aquarium|museum|attraction|viewpoint)$"]${area};nwr["leisure"~"^(water_park|park)$"]${area};nwr["amenity"~"^(theatre|cinema|arts_centre)$"]${area};nwr["historic"~"^(castle|ruins|monument)$"]${area};);out center tags 501;`;
    let data,limited=false;
    try{
      const groups=['tourism.theme_park,tourism.zoo,tourism.aquarium,tourism.museum,tourism.attraction,tourism.viewpoint','leisure.water_park,leisure.park','amenity.theatre,amenity.cinema,amenity.arts_centre,historic.castle,historic.ruins,historic.monument'];
      const features=[];
      for(const group of groups){const d=await json('https://photon.komoot.io/api/?include='+group.split(',').map(s=>'osm.'+s).join(',')+'&bbox='+[lon-dx,lat-dy,lon+dx,lat+dy].join(',')+'&limit=100');features.push(...(d.features||[]));if((d.features||[]).length>=100)limited=true;}
      data={elements:features.map(f=>({type:({N:'node',W:'way',R:'relation'})[f.properties.osm_type],id:f.properties.osm_id,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],tags:{...f.properties.extra,name:f.properties.name,[f.properties.osm_key]:f.properties.osm_value}}))};
    }catch{data=await overpass(query);limited=(data.elements||[]).length>=501;}
    const seen=new Set();
    const items=(data.elements||[]).map(placeFromOSM).filter(Boolean).filter(p=>Math.hypot((p.lat-lat)*111.32,(p.lon-lon)*111.32*Math.cos(lat*Math.PI/180))<=radius).filter(p=>{const key=p.name.toLowerCase()+':'+Number(p.lat).toFixed(3)+':'+Number(p.lon).toFixed(3);if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.category.localeCompare(b.category,'ru')||a.name.localeCompare(b.name,'ru'));
    for(const p of items){if(placeCache.size>=2000)placeCache.delete(placeCache.keys().next().value);placeCache.set(p.id,{place:p,until:Date.now()+3600000});}
    return {items:items.slice(0,500),radius,limited,checkedAt:new Date().toISOString(),source:'© OpenStreetMap contributors · ODbL',sourceURL:'https://www.openstreetmap.org/copyright',notice:'Места из открытой карты в выбранном радиусе, включая окрестности. Каталог Photon: до 100 результатов на группу категорий; резервный Overpass: до 500 объектов. Карта может быть неполной или содержать ошибки; наличие объекта не подтверждает, что он открыт сегодня.'};
  });
}

export const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff))).replace(/\s+/g,' ').trim();
const money=/(?:\d[\d\s.,]*\s*(?:VND|VNĐ|USD|EUR|THB|₫|đồng|руб\.?|₽|€|฿)|(?:\$|€|฿)\s*\d[\d.,]*)/i;
const ticket=/ticket|admission|entrance|adult|child|senior|height|giá vé|vé vào|người lớn|trẻ em|билет|вход|взросл|детск/i;
// Preserve row headings and category context, never turn arbitrary amounts into a live fare.
export function extractPrices(html,url){
  const body=html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,'');const rows=[];
  for(const table of body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const contents=clean(table[1]),formattedAmount=/\b\d{1,3}(?:[.,]\d{3})+\b/;
    if((!money.test(contents)&&!formattedAmount.test(contents))||!ticket.test(contents))continue;
    const tableRows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>clean(c[1])).filter(Boolean).join(' | '));
    const heading=tableRows.slice(0,3).filter(r=>!money.test(r)&&!formattedAmount.test(r)).join(' / ').slice(0,700);
    for(const row of tableRows)if(money.test(row)||formattedAmount.test(row))rows.push({text:row.slice(0,1000),context:heading+(!money.test(contents)?' · Валюта в таблице не указана; уточните в источнике.':''),source:url,kind:'published_price'});
  }
  if(!rows.length)for(const m of body.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)){const text=clean(m[2]);if(text.length<=650&&money.test(text)&&ticket.test(text))rows.push({text,context:'Цена в тексте источника',source:url,kind:'published_price'});}
  return rows.filter((r,i,a)=>a.findIndex(x=>x.text===r.text)===i).slice(0,16);
}
function knownPricePage(p){
  const name=(p.name+' '+p.originalName).toLowerCase();
  if(/vinwonders|винвондерс/.test(name)&&p.lat>12&&p.lat<13&&p.lon>109&&p.lon<110)return 'https://vinwonders.com/en/vinwonders-nha-trang-price-and-regulations/';
  if(p.lat>9.8&&p.lat<10.6&&p.lon>103.7&&p.lon<104.2){
    if(/vinwonders|винвондерс/.test(name))return 'https://vinwonders.com/en/wonderpedia/news/vinwonders-phu-quoc-the-biggest-theme-park-in-vietnam/';
    if(/safari|сафари/.test(name))return 'https://vinwonders.com/en/wonderpedia/news/notice-of-adjustment-to-entrance-ticket-prices-at-vinpearl-safari-phu-quoc/';
  }return '';
}
export async function prices(id){
  if(!/^(node|way|relation)\/[1-9]\d{0,12}$/.test(id||''))throw Error('Некорректное место. Выберите его в каталоге.');
  return cached('price:'+id,async()=>{
    let place=placeCache.get(id)?.until>Date.now()?placeCache.get(id).place:null;
    if(!place){const data=await overpass(`[out:json][timeout:10];${id.replace('/', '(')});out center tags;`);place=data.elements?.[0]?placeFromOSM(data.elements[0]):null;}
    if(!place)throw Error('Место больше не доступно в каталоге.');
    if(!knownPricePage(place)&&!place.website){try{const d=await overpass(`[out:json][timeout:10];${id.replace('/', '(')});out center tags;`);const fresh=d.elements?.[0]?placeFromOSM(d.elements[0]):null;if(fresh)place=fresh;}catch{}}
    let website=knownPricePage(place)||place.website;
    if(!website&&/^Q\d+$/.test(place.wikidata)){try{const d=await json('https://www.wikidata.org/wiki/Special:EntityData/'+place.wikidata+'.json');website=d.entities?.[place.wikidata]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value||'';}catch{}}
    const result={place,checkedAt:new Date().toISOString(),prices:[],sources:[],status:'not_found',notice:'Опубликованные цены из источника, не подтверждение мест или итоговой стоимости на дату посещения. Проверьте категории гостей, дату действия, включения и валюту. Перевод и пересчёт валют не выполнялись.'};
    if(!website){result.reason='В открытой карточке нет сайта с тарифами. Цена автоматически не найдена.';return result;}
    let url;try{url=publicURL(website.replace(/^http:/,'https:')).href;}catch{result.reason='У места нет доступной безопасной ссылки на сайт с ценами.';return result;}
    const inspect=async target=>{try{const page=await publicFetch(target,0,{maxBytes:2500000,timeout:10000});result.sources.push({url:page.url,status:page.status});if(!page.ok)return null;result.prices.push(...extractPrices(page.text,page.url));return page;}catch{result.sources.push({url:target,status:0});return null;}};
    const page=await inspect(url);
    if(page&&!result.prices.length){
      const links=[...page.text.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>/ticket|price|admission|bang-gia|gia-ve|билет|цен/i.test(m[1]+' '+clean(m[2]))).flatMap(m=>{try{const u=new URL(m[1].replace(/&amp;/g,'&'),page.url);return u.origin===new URL(page.url).origin&&!/\.(pdf|jpe?g|png)(?:\?|$)/i.test(u.pathname)&&u.href!==page.url?[u.href]:[];}catch{return [];}});
      await Promise.all([...new Set(links)].slice(0,2).map(inspect));
    }
    result.prices=result.prices.filter((r,i,a)=>a.findIndex(x=>x.text===r.text)===i).slice(0,20);
    result.status=result.prices.length?'published_prices':page?'not_found':'source_unavailable';
    if(!result.prices.length)result.reason=page?'В доступных страницах цены билетов не найдены. Прайс может быть в PDF, изображении или системе бронирования.':'Сайт с тарифами не ответил или ограничил автоматический доступ.';
    return result;
  },900000);
}
