(() => {
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(label,fn)=>{const b=el('button',label,'action secondary');b.type='button';b.onclick=fn;return b;};
  const panel=$('ticketCity').closest('.panel');panel.id='cityExplorer';
  panel.innerHTML=`<div class="section-title"><div><span class="eyebrow">ОТКРОЙТЕ НОВОЕ</span><h2>Куда сходить?</h2><p>Введите город. Мы найдём места — выберите интересное, и мы проверим опубликованные цены.</p></div><span class="pill">Город → Место → Цены</span></div><form id="cityForm"><label>Город или остров<input id="cityQuery" required minlength="2" maxlength="100" placeholder="Например, Нячанг или Фукуок" autocomplete="off"></label><label>Город и окрестности<select id="cityRadius"><option value="10">В радиусе 10 км</option><option value="25" selected>В радиусе 25 км</option><option value="50">В радиусе 50 км</option></select></label><button class="action" id="cityFind">Найти места</button></form><p id="cityStatus" role="status">Название достопримечательности знать не нужно.</p><div id="cityChoices" class="actions"></div><div id="placeFilters" class="categorybar"></div><div id="placesGrid"></div><p id="placesSource" class="quiet"></p><section id="placePrices" aria-live="polite" hidden></section>`;
  $('group-tickets').prepend(panel);
  let items=[],chosen=null,requestVersion=0,priceVersion=0;
  async function api(body){const r=await fetch('/api/places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Источник недоступен');return d;}
  const link=(label,url)=>{const a=el('a',label);if(/^https:\/\//.test(url)){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}return a;};
  function cards(category='Все места'){
    const grid=$('placesGrid');grid.replaceChildren();
    for(const place of items.filter(p=>category==='Все места'||p.category===category)){
      const card=el('article',undefined,'place-card');card.append(el('span',place.category,'eyebrow'),el('h3',place.name));
      if(place.originalName!==place.name)card.append(el('p',place.originalName,'quiet'));
      if(place.description)card.append(el('p',place.description.slice(0,220)));
      card.append(button('Выбрать · узнать цены',()=>showPrices(place)),link('На карте ↗',place.source));grid.append(card);
    }
  }
  async function loadPlaces(city,version){
    chosen=city;$('cityChoices').replaceChildren();$('cityStatus').textContent='Ищем парки, музеи, шоу и достопримечательности: '+city.label+'…';
    const data=await api({action:'places',lat:city.lat,lon:city.lon,radius:Number($('cityRadius').value)});if(version!==requestVersion)return;
    items=data.items;$('cityStatus').textContent=city.label+' · Найдено мест: '+items.length+' · Радиус '+data.radius+' км'+(data.limited?' · Источник ограничил число результатов':'');
    $('placesSource').replaceChildren(el('span',data.notice+' '),link(data.source,data.sourceURL),el('span',' · Получено '+new Date(data.checkedAt).toLocaleString('ru-RU')));
    const filters=$('placeFilters');filters.replaceChildren();
    for(const category of ['Все места',...new Set(items.map(p=>p.category))]){const b=button(category,()=>{cards(category);filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});b.setAttribute('aria-pressed',String(category==='Все места'));filters.append(b);}
    cards();if(!items.length)$('placesGrid').append(el('p','В выбранном радиусе источник не вернул места. Попробуйте 50 км или другое название города.'));
  }
  $('cityForm').onsubmit=async e=>{
    e.preventDefault();const version=++requestVersion;priceVersion++;const b=$('cityFind');b.disabled=true;$('cityStatus').textContent='Находим город…';$('placesGrid').replaceChildren();$('placeFilters').replaceChildren();$('cityChoices').replaceChildren();$('placesSource').replaceChildren();$('placePrices').hidden=true;
    try{
      const data=await api({action:'cities',city:$('cityQuery').value});if(version!==requestVersion)return;
      if(!data.cities.length){$('cityStatus').textContent='Город не найден. Уточните страну или введите название латиницей.';return;}
      if(data.cities.length===1)await loadPlaces(data.cities[0],version);
      else{
        $('cityStatus').textContent='Уточните, какой город или остров вы имели в виду:';
        for(const city of data.cities)$('cityChoices').append(button(city.label,async()=>{b.disabled=true;try{await loadPlaces(city,version);}catch(err){$('cityStatus').textContent=err.message;}finally{b.disabled=false;}}));
      }
    }catch(err){$('cityStatus').textContent='Не удалось загрузить места: '+err.message;}finally{b.disabled=false;}
  };
  async function showPrices(place){
    const version=++priceVersion,out=$('placePrices');out.hidden=false;out.replaceChildren(el('h2',place.name),el('p','Ищем сайт места и проверяем страницы с ценами…'));out.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const data=await api({action:'prices',id:place.id});if(version!==priceVersion)return;
      out.replaceChildren(el('h2',place.name),el('p','Проверено '+new Date(data.checkedAt).toLocaleString('ru-RU'),'quiet'));
      if(data.prices.length){out.append(el('h3','Найденные опубликованные цены'));for(const price of data.prices){
        const row=el('article',undefined,'price-row'),cells=price.text.split(' | '),headers=(price.context||'').split(' / ').at(-1).split(' | ');
        if(cells.length===headers.length&&cells.length>=3){
          const start=/^\d+$/.test(cells[0])?2:1;row.append(el('h3',cells[start-1]));const values=el('div',undefined,'price-values');
          for(let i=start;i<cells.length;i++){const value=el('div');const label=/elderly|aged 60|over 60/i.test(headers[i])?'Гости от 60 лет':/100.*140/i.test(headers[i])?'Рост от 100 до 140 см':/140/i.test(headers[i])?'Рост от 140 см':/adult/i.test(headers[i])?'Взрослый':/child/i.test(headers[i])?'Детский':headers[i];value.append(el('small',label),el('strong',cells[i]));values.append(value);}row.append(values);
        }else{if(price.context)row.append(el('p',price.context,'quiet'));row.append(el('p',price.text));}
        row.append(link('Источник цены ↗',price.source));out.append(row);
      }}
      else out.append(el('p',data.reason,'notice'));
      out.append(el('p',data.notice,'quiet'));
      if(data.place.hours)out.append(el('p','Часы по открытой карте: '+data.place.hours+'. Перед посещением уточните у места.'));
      const sources=el('div',undefined,'actions');for(const s of data.sources)sources.append(link('Проверенный адрес · '+(s.status||'нет ответа'),s.url));out.append(sources,link('Карточка места на карте ↗',place.source));
      out.append(button('← Вернуться к местам',()=>{out.hidden=true;$('placesGrid').scrollIntoView({behavior:'smooth'});}));
    }catch(err){if(version===priceVersion)out.append(el('p','Не удалось проверить цены: '+err.message));}
  }
})();
