(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'gettravel.workspace.v2';
  let state = {connections:[],history:[],brief:{}};
  let storageError = '';
  try { const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(saved && Array.isArray(saved.connections) && Array.isArray(saved.history)) state={...state,...saved}; }
  catch { storageError='Не удалось прочитать сохранение. Экспортируйте данные перед закрытием.'; }
  function save() {try {localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{storageError='Браузер не сохранил данные. Скачайте резервную копию.'; $('storageNote').textContent=storageError;return false;}}
  const el=(tag,value,className)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(className)e.className=className;return e;};
  const button=(label,fn)=>{const b=el('button',label,'action secondary');b.type='button';b.onclick=fn;return b;};
  const labels={partial:'Доступно частично',completed:'Выполнено',blocked:'Нужно подключение или данные',failed:'Ошибка',error:'Ошибка источника',not_checked:'Не проверено',needs_account:'Нужно подключить аккаунт',needs_local_ai:'Нужен локальный AI',unavailable:'Источник недоступен',available:'Доступен',not_connected:'Не подключён',not_configured:'Не настроен',configured_unverified:'Настроен, не проверен',needs_local_executor:'Нужен локальный исполнитель',browser_only:'В этом браузере'};
  function download(name,value,mime='application/json') {const u=URL.createObjectURL(new Blob([value],{type:mime}));const a=el('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  async function run(action,input={}) {
    if(Array.isArray(input.connections))input={...input,connections:input.connections.map(({url,label,role,fingerprint,status,checkedAt})=>({url,label,role,fingerprint,status,checkedAt}))};
    const r=await fetch('/api/orchestrator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,input})});
    const data=await r.json();
    if(!r.ok) {state.history.unshift({action,status:'failed',finishedAt:new Date().toISOString(),output:{message:data.error}});state.history=state.history.slice(0,30);save();throw Error(data.error||'Запрос не выполнен');}
    if(Array.isArray(data.output)&&['connections.sync','competitors','social','telegram','directory'].includes(action)){
      for(const result of data.output){const i=state.connections.findIndex(c=>c.url===result.url);if(i>=0)state.connections[i]={...state.connections[i],...result};}
    }
    state.history.unshift(data);state.history=state.history.slice(0,30);
    while(state.history.length>1&&JSON.stringify(state.history).length>2500000)state.history.pop();
    save();if($('runHistory'))renderHistory();return data;
  }
  const nav=document.querySelector('.quicknav');
  // Keep the assistant visible while switching work areas.
  document.querySelector('main').insertBefore($('assistantPanel'),document.querySelector('.notice'));
  document.querySelector('.intro h2').textContent='Ваш маркетинг. В одном месте.';
  document.querySelector('.intro p').textContent='От идеи до готового материала — с проверенными фактами и понятными результатами.';
  $('assistantPanel').querySelector('h2').textContent='С чего начнём сегодня?';
  $('assistantPanel').querySelector('p').textContent='Помощник GETTRAVEL · Проверка сайта и открытые новости по запросу. Работает по правилам, без подключённой AI-модели.';
  const shortcuts=el('div',undefined,'assistant-shortcuts');
  for(const [label,value] of [['Проверить сайт','Проверь сайт gettravel.asia'],['Новости туризма','Покажи новости туристического рынка']]) shortcuts.append(button(label,()=>{$('assistantInput').value=value;$('assistantInput').focus();}));
  $('assistantForm').before(shortcuts);
  const newsPanel=$('refresh').closest('.panel');newsPanel.id='publications';document.querySelector('main').append(newsPanel);
  const assistantTab=nav.querySelector('[data-tab="assistant"]');assistantTab.remove();
  nav.prepend(nav.querySelector('[data-tab="marketing"]'));
  nav.querySelector('[data-tab="marketing"]').textContent='Все модули · 18';
  nav.insertBefore(nav.querySelector('[data-tab="website"]'),nav.querySelector('[data-tab="tickets"]'));
  nav.querySelector('[data-tab="marketing"]').click();
  $('groundSearch').textContent='Открыть поиск перевозчиков';$('ticketSearch').textContent='Найти источники цен';
  $('flightPlan').textContent='Варианты аэропортов';
  const connectTab=button('Подключения',()=>{
    document.querySelectorAll('.workgroup').forEach(g=>g.classList.remove('active'));
    document.querySelectorAll('.quicknav button').forEach(b=>b.setAttribute('aria-selected',String(b===connectTab)));
    $('group-connections').classList.add('active');
  }); connectTab.dataset.tab='connections';nav.append(connectTab);
  document.querySelectorAll('.quicknav button:not([data-tab="connections"])').forEach(b=>b.addEventListener('click',()=>{$('group-connections').classList.remove('active');connectTab.setAttribute('aria-selected','false');}));
  const panel=el('div',undefined,'workgroup');panel.id='group-connections';
  panel.innerHTML=`<section class="panel"><h2>Ваши ссылки и подключения</h2><p>Добавьте свои аккаунты, каналы конкурентов и сайты. Ссылка не является авторизацией аккаунта.</p><p id="storageNote" class="notice">Сохраняется в этом браузере. Синхронизация запускается по кнопке; автоматического фонового расписания и общей облачной базы пока нет.</p><form id="connectionForm"><label>Название<input name="label" maxlength="100" placeholder="Наш Telegram или конкурент"></label><label>Ссылка<input name="url" type="url" required placeholder="https://t.me/channel"></label><label>Назначение<select name="role"><option value="own">Наш аккаунт / площадка</option><option value="competitor">Конкурент</option></select></label><button class="action" type="submit">Сохранить и проверить</button></form><p id="connectionMessage" role="status"></p><div class="actions" id="connectionActions"></div><div id="connectionList"></div></section><section class="panel"><h2>Возможности системы</h2><p>Здесь показывается фактическое наличие исполнителей. Секреты не отображаются.</p><div id="integrationStatus">Проверяем backend…</div></section>`;
  $('workspace').append(panel);
  if(storageError)$('storageNote').textContent=storageError;
  function renderConnections() {
    const list=$('connectionList');list.replaceChildren();
    if(!state.connections.length)list.append(el('p','Пока нет ссылок. Добавьте публичный Telegram-канал, профиль TikTok / Instagram или сайт.'));
    state.connections.forEach((c,index)=>{
      const row=el('article',undefined,'source');row.append(el('h3',c.label));
      const a=el('a',c.url);if(/^https:\/\//.test(c.url)){a.href=c.url;a.target='_blank';a.rel='noopener noreferrer';}row.append(a);
      row.append(el('p',(c.role==='competitor'?'Конкурент':'Наш аккаунт')+' · '+(labels[c.status]||'Не проверено')));
      row.append(el('p',c.message||'Ссылка ожидает проверки.'));
      if(c.checkedAt)row.append(el('p','Попытка: '+new Date(c.checkedAt).toLocaleString('ru-RU')+(c.lastSuccessAt?' · Успешно: '+new Date(c.lastSuccessAt).toLocaleString('ru-RU'):''),'quiet'));
      if(c.changed!==null&&c.changed!==undefined&&c.status==='partial')row.append(el('p',c.changed?'Содержимое изменилось со времени прошлого успешного снимка.':'Содержимое совпадает с прошлым успешным снимком.'));
      for(const item of c.items||[])row.append(el('p',item.text));
      row.append(button('Проверить',async e=>{e.currentTarget.disabled=true;try{await sync([c]);}catch(err){$('connectionMessage').textContent=err.message;}finally{renderConnections();}}),button('Удалить ссылку',()=>{state.connections.splice(index,1);save();renderConnections();}));
      list.append(row);
    });
  }
  async function sync(connections) {
    const data=await run('connections.sync',{connections});
    if(!Array.isArray(data.output))throw Error(data.output.message);
    for(const result of data.output){const i=state.connections.findIndex(c=>c.url===result.url);if(i>=0){const old=state.connections[i];state.connections[i]={...old,...result};}}
    save();renderConnections();$('connectionMessage').textContent='Проверка завершена. Смотрите отдельный статус каждой ссылки.';
  }
  $('connectionForm').onsubmit=async e=>{
    e.preventDefault();const form=e.currentTarget,b=form.querySelector('button');b.disabled=true;$('connectionMessage').textContent='Проверяем и сохраняем…';
    try {
      if(state.connections.length>=12)throw Error('Лимит — 12 ссылок. Удалите ненужную перед добавлением.');
      const c=Object.fromEntries(new FormData(form));
      const data=await run('connections.sync',{connections:[c]});const result=data.output?.[0];
      if(!result)throw Error(data.output?.message||'Ссылка не принята');
      const i=state.connections.findIndex(x=>x.url===result.url);if(i>=0)state.connections[i]={...state.connections[i],...result};else state.connections.push(result);
      const saved=save();renderConnections();form.reset();$('connectionMessage').textContent=saved?'Ссылка сохранена. '+result.message:storageError;
    }catch(err){$('connectionMessage').textContent=err.message;}finally{b.disabled=false;}
  };
  $('connectionActions').append(button('Синхронизировать все',async e=>{e.currentTarget.disabled=true;try{await sync(state.connections);}catch(err){$('connectionMessage').textContent=err.message;}finally{e.target.disabled=false;}}),button('Скачать резервную копию',()=>download('gettravel-workspace.json',JSON.stringify(state,null,2))));
  const importer=el('input');importer.type='file';importer.accept='.json,application/json';importer.id='workspaceImport';
  const importLabel=el('label','Восстановить ссылки из резервной копии');importLabel.append(importer);$('connectionActions').append(importLabel);
  importer.onchange=async()=>{try{const file=importer.files[0];if(!file)return;if(file.size>1000000)throw Error('Файл слишком большой');const data=JSON.parse(await file.text());if(!Array.isArray(data.connections)||data.connections.length>12)throw Error('Неверный формат');const candidates=data.connections.map(c=>({url:c.url,label:c.label,role:c.role}));const result=await run('connections.sync',{connections:candidates});if(!Array.isArray(result.output))throw Error('Нет ссылок');for(const c of result.output){const i=state.connections.findIndex(x=>x.url===c.url);if(i>=0)state.connections[i]=c;else if(state.connections.length<12)state.connections.push(c);}save();renderConnections();$('connectionMessage').textContent='Ссылки восстановлены и проверены. История из файла не импортировалась.';}catch(err){$('connectionMessage').textContent=err.message;}finally{importer.value='';}};
  renderConnections();

  const brief=el('section',undefined,'panel');brief.id='sharedBrief';
  brief.innerHTML=`<h2>Общие данные для модулей</h2><p>Факты указываете вы. Не включайте пароли, ключи или персональные данные клиентов.</p><label>Название тура или карточки<input id="briefTitle" maxlength="180" placeholder="Например, экскурсия в Далат"></label><label>Подтверждённые факты<textarea id="briefFacts" maxlength="8000" placeholder="Программа, включения, ограничения — только подтверждённое"></textarea></label><label>Текст для перевода / отзыв / наблюдения<textarea id="briefText" maxlength="8000" placeholder="Для анализа тем — одно наблюдение на строку"></textarea></label><div class="briefGrid"><label>Формат<select id="briefPlatform"><option>Telegram</option><option>Instagram</option><option>TikTok</option><option>Facebook</option></select></label><label>Генератор<select id="briefProvider"><option value="template">Бесплатный шаблон</option><option value="local">Локальный AI (если подключён)</option></select></label><label>Язык перевода<select id="briefLanguage"><option value="en">English</option><option value="ru">Русский</option><option value="vi">Tiếng Việt</option><option value="zh">中文</option><option value="ko">한국어</option><option value="tr">Türkçe</option><option value="fr">Français</option></select></label></div><details><summary>Данные для рекламы, заявок и аналитики</summary><p>Одна воронка и один период. Расходы — в выбранной вами валюте.</p><div class="briefGrid"><label>Расходы<input id="briefSpend" type="number" min="0" step="any"></label><label>Клики<input id="briefClicks" type="number" min="0"></label><label>Заявки<input id="briefLeads" type="number" min="0"></label><label>Продажи<input id="briefSales" type="number" min="0"></label></div></details><p id="briefSaved" class="quiet"></p>`;
  $('group-marketing').insertBefore(brief,$('detail'));
  const fields=['title','facts','text','platform','provider','language','spend','clicks','leads','sales'];
  function input() {const d={connections:state.connections,history:state.history.map(({action,status,finishedAt})=>({action,status,finishedAt}))};for(const k of fields)d[k]=$('brief'+k[0].toUpperCase()+k.slice(1)).value;return d;}
  for(const k of fields){const field=$('brief'+k[0].toUpperCase()+k.slice(1));if(state.brief[k]!==undefined)field.value=state.brief[k];field.addEventListener('change',()=>{state.brief=Object.fromEntries(fields.map(key=>[key,$('brief'+key[0].toUpperCase()+key.slice(1)).value]));$('briefSaved').textContent=save()?'Данные сохранены в этом браузере.':storageError;});}
  const outputLabels={post:'Черновик',note:'Ограничения',reply:'Вариант ответа',review:'Исходный отзыв',translation:'Перевод',message:'Статус',warnings:'Проверить',tasks:'Следующие задачи',task:'Задача',priority:'Приоритет',title:'Заголовок',description:'Описание',items:'Материалы',scenes:'Сцены',topics:'Темы',topic:'Тема',count:'Количество',observations:'Наблюдений',spend:'Расходы',clicks:'Клики',leads:'Заявки',sales:'Продажи',conversionPercent:'Клики → заявки, %',salesConversionPercent:'Заявки → продажи, %',runs:'История запусков',sources:'Источники',status:'Статус',checkedAt:'Проверено',finishedAt:'Завершено',action:'Модуль',cost:'Расходы',limitations:'Ограничения',needsHumanApproval:'Нужна проверка человеком'};
  function renderValue(parent,value,key='') {
    if(['file','filename','mime','fingerprint'].includes(key))return;
    if(value&&typeof value==='object') {
      const box=el('div',undefined,'resultBlock');if(key)box.append(el('h3',outputLabels[key]||key));
      if(Array.isArray(value)&&!value.length)box.append(el('p','Нет данных.'));
      Object.entries(value).forEach(([k,v])=>renderValue(box,v,Array.isArray(value)?'':k));parent.append(box);
    } else {const translated=key==='status'?(labels[value]||value):value;parent.append(el('p',(key?(outputLabels[key]||key)+': ':'')+(translated===null?'Нет данных':String(translated))));}
  }
  function renderRun(data,parent) {
    parent.replaceChildren();parent.append(el('p',(labels[data.status]||data.status)+' · '+(data.provider==='local_ai'?'Локальная модель':'Правила / открытые данные')+' · Платный API не вызывался','pill'));
    renderValue(parent,data.output);
    const copyText=data.output?.post||data.output?.translation||data.output?.reply;
    if(copyText)parent.append(button('Копировать текст',async e=>{try{await navigator.clipboard.writeText(copyText);e.target.textContent='Скопировано ✓';}catch{e.target.textContent='Выделите текст и скопируйте вручную';}}));
    if(data.output?.file)parent.append(button('Скачать '+data.output.filename,()=>download(data.output.filename,data.output.file,data.output.mime)));
    parent.append(button('Скачать результат',()=>download('gettravel-'+data.action+'.json',JSON.stringify(data,null,2))));
    if(data.action==='video') parent.append(el('p','Для MP4: запустите локальный сервер, откройте его панель и выберите фотографии ниже. На сайте Vercel сборка MP4 недоступна.'));
  }
  const historyPanel=el('section',undefined,'panel');historyPanel.innerHTML='<h2>Последние результаты</h2><div id="runHistory"></div>'; $('group-marketing').append(historyPanel);
  function renderHistory(){const h=$('runHistory');h.replaceChildren();for(const r of state.history.slice(0,10))h.append(button((r.action)+' · '+(labels[r.status]||r.status)+' · '+new Date(r.finishedAt||r.startedAt).toLocaleString('ru-RU'),()=>{const detail=$('detail');renderRun(r,detail);detail.scrollIntoView({behavior:'smooth'});}));if(!state.history.length)h.append(el('p','Вы ещё не запускали модули.'));}
  renderHistory();
  $('detail').replaceChildren(el('h2','Выберите модуль'),el('p','Заполните общие данные и нажмите на нужное направление выше. Ссылки добавляются в разделе «Подключения».'));
  const ids=['director','competitors','demand','content','design','video','social','telegram','languages','ads','reviews','directory','registrations','leads','analytics','monitor','quality','report'];
  let catalog=[];
  [...$('modules').children].forEach((card,i)=>{
    card.onclick=()=>{
      [...$('modules').children].forEach(c=>{c.classList.toggle('selected',c===card);c.setAttribute('aria-pressed',String(c===card));});
      const m=catalog.find(m=>m.id===ids[i]);const detail=$('detail');detail.replaceChildren(el('h2',m?.name||card.querySelector('strong').textContent),el('p',m?.description||'Состояние backend пока не получено.'));
      const b=button('Выполнить',async()=>{b.disabled=true;out.textContent='Выполняется…';try{renderRun(await run(ids[i],input()),out);renderHistory();}catch(err){out.textContent=err.message;}finally{b.disabled=false;}});const out=el('div');out.setAttribute('aria-live','polite');detail.append(el('p','Используются общие данные выше и ссылки из раздела «Подключения». Все результаты — для вашей проверки.'),b,out);detail.scrollIntoView({behavior:'smooth',block:'start'});
    };
    card.querySelector('.tag').textContent='Проверяем backend…';
  });
  async function refreshCapabilities(){
    try{const r=await fetch('/api/orchestrator');if(!r.ok)throw Error('Backend недоступен');const data=await r.json();catalog=data.modules;
      const status=$('integrationStatus');status.replaceChildren();
      const names={cloudAI:'Платный AI (отдельный API)',localAI:'Локальный AI',video:'Сборка видео',socialAccounts:'Аккаунты соцсетей',storage:'Хранение'};
      for(const [key,value] of Object.entries(data.integrations)){status.append(el('h3',names[key]),el('p',(labels[value.status]||value.status)+' · '+value.note));}
      [...$('modules').children].forEach((card,i)=>{const m=catalog.find(m=>m.id===ids[i]);card.querySelector('.tag').textContent=m?(labels[m.status]||m.status):'Нет обработчика';if(m)card.querySelector('small').textContent=m.description;});
      document.querySelector('.notice').textContent='Сервер доступен · Бесплатные инструменты работают. AI: '+(data.integrations.localAI.status==='available'?'локальная модель подключена.':'не подключён.')+' Цены мест проверяются по публичным страницам. Наличие билетов и автопубликация не подключены.';
      if(data.integrations.video.status==='available')enableVideo();
    }catch(err){$('integrationStatus').textContent=err.message;document.querySelector('.notice').textContent='Сервер недоступен. Запуск модулей требует работающего backend. Сохранённые данные остаются в этом браузере.';[...$('modules').children].forEach(card=>card.querySelector('.tag').textContent='Backend недоступен');}
  }
  function enableVideo(){
    const p=el('section',undefined,'panel');p.innerHTML='<h2>Локальная сборка MP4</h2><p>Выберите 1–8 своих фотографий JPEG/PNG. Получится вертикальное слайд-шоу без звука; субтитры скачиваются отдельно в модуле «Видео».</p><label>Фотографии<input id="videoPhotos" type="file" accept="image/jpeg,image/png" multiple></label><div id="videoResult" role="status"></div>';
    const b=button('Собрать MP4',async()=>{b.disabled=true;const out=$('videoResult');out.textContent='Собираем видео локально…';try{const files=[...$('videoPhotos').files];if(!files.length||files.length>8||files.some(f=>f.size>5000000))throw Error('Нужно 1–8 фотографий, до 5 МБ каждая.');const images=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);})));const r=await fetch('/local/video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images})});const d=await r.json();if(!r.ok)throw Error(d.error);out.replaceChildren();const a=el('a','Скачать MP4');a.href=d.url;a.download='gettravel-video.mp4';out.append(a);}catch(err){out.textContent=err.message;}finally{b.disabled=false;}});p.append(b);$('group-marketing').append(p);
  }
  refreshCapabilities();
  shortcuts.append(button('Подготовить пост',()=>{$('assistantInput').value='Подготовь черновик поста';document.querySelector('[data-tab="marketing"]').click();$('sharedBrief').scrollIntoView({behavior:'smooth'});$('briefTitle').focus({preventScroll:true});}));
  $('assistantForm').onsubmit=async e=>{
    e.preventDefault();const message=$('assistantInput').value.trim(),b=$('assistantSend'),out=$('assistantResult');if(!message)return;
    b.disabled=true;out.textContent='Выполняем задачу…';
    try{
      const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,input:input()})});const d=await r.json();if(!r.ok)throw Error(d.error||'Не удалось выполнить задачу');
      out.replaceChildren(el('h3',d.title),el('p',d.answer));
      if(d.result){const result=el('div');renderRun(d.result,result);out.append(result);state.history.unshift(d.result);state.history=state.history.slice(0,30);save();renderHistory();}
      else {out.append(el('p',(d.verified?'Получено из публичного источника':'Подтверждённых данных нет')+(d.checkedAt?' · '+new Date(d.checkedAt).toLocaleString('ru-RU'):''),'quiet'));for(const item of d.items||[]){if(!/^https?:\/\//.test(item.url||''))continue;const row=el('div',undefined,'source'),a=el('a',item.title);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';row.append(a,el('small',[item.source,item.date].filter(Boolean).join(' · ')));out.append(row);}}
    }catch(err){out.textContent=err.message;}finally{b.disabled=false;}
  };
  // Show evidence and editable copy separately; never label missing text as a fix.
  const auditButtons=$('audit').parentElement.querySelectorAll('button');
  auditButtons[1].onclick=async()=>{
    const out=$('auditResults'),status=$('auditStatus');auditButtons.forEach(b=>b.disabled=true);out.replaceChildren();status.textContent='Проверяем публичные страницы…';
    try{
      const data=await run('website.audit');const d=data.output;
      status.textContent=`Проверено ${d.pagesScanned} страниц · Важных замечаний: ${d.summary.high} · ${new Date(d.checkedAt).toLocaleString('ru-RU')}`;
      for(const page of d.pages){
        const section=el('section',undefined,'source');const link=el('a',page.title||page.url);link.href=page.url;link.target='_blank';link.rel='noopener noreferrer';section.append(link);
        if(!page.issues.length)section.append(el('p','По правилам этой проверки замечаний нет. Это не полный аудит.'));
        for(const issue of page.issues){
          const box=el('article',undefined,'audit-issue');box.append(el('h3',issue.field+' · '+issue.why));
          const comparison=el('div',undefined,'audit-comparison');
          for(const [label,value] of [['ОРИГИНАЛ',issue.current||'Не найдено в исходном HTML'],[issue.replacement?'ГОТОВЫЙ ТЕКСТ · ПРОВЕРЬТЕ ПЕРЕД ПУБЛИКАЦИЕЙ':'НУЖНА ПРОВЕРКА',issue.replacement||issue.reason||issue.suggestion]]){const part=el('div');part.append(el('small',label),el('p',value));comparison.append(part);}
          box.append(comparison);
          if(issue.replacement)box.append(button('Копировать исправление',async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText(issue.replacement);b.textContent='Скопировано ✓';}catch{b.textContent='Копирование недоступно — выделите текст выше';}}));
          section.append(box);
        }out.append(section);
      }out.append(el('p',d.limitations,'quiet'));
    }catch(err){status.textContent='Проверка не выполнена: '+err.message;}finally{auditButtons.forEach(b=>b.disabled=false);}
  };
})();
