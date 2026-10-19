import { randomUUID } from 'node:crypto';
import auditHandler from '../api/site-audit.js';
import healthHandler from '../api/site-health.js';
import discoverHandler from '../api/discover.js';
import { syncConnection } from './connections.js';

const definitions = [
  ['director','AI-директор','План по результатам проверок и данным пользователя'],
  ['competitors','Конкурентная разведка','Снимки добавленных сайтов и публичных Telegram-каналов'],
  ['demand','Туристический спрос','Темы в введённых наблюдениях; это не объём спроса'],
  ['content','Контент-студия','Бесплатный черновик по вашим фактам; локальный AI по выбору'],
  ['design','Фото и дизайн','Скачиваемая SVG-карточка с вашим заголовком'],
  ['video','Видео и Reels','Сценарий и SRT; MP4 через локальный FFmpeg'],
  ['social','Социальные сети','Проверка ссылок; публикация и метрики требуют адаптеров аккаунтов'],
  ['telegram','Telegram-центр','Чтение доступных публичных сообщений по ссылке'],
  ['languages','Многоязычный маркетинг','Перевод через подключённую локальную модель'],
  ['ads','Рекламные кампании','Расчёт CPC и CPL по введённым расходам'],
  ['reviews','Отзывы и репутация','Черновик ответа на введённый отзыв'],
  ['directory','Каталог площадок','Проверка вручную добавленных площадок'],
  ['registrations','Контроль регистраций','Сводка возможностей подключений; токены аккаунтов не проверяются'],
  ['leads','Заявки и конверсии','Конверсия по введённым числам, без CRM'],
  ['analytics','Маркетинговая аналитика','Расчёт по введённым данным, без выдуманных метрик'],
  ['monitor','Мониторинг ошибок','Техническая проверка сайта и ошибок источников'],
  ['quality','Контроль качества AI','Эвристические предупреждения о ценах и обещаниях'],
  ['report','Отчёты владельцу','Отчёт по сохранённым в этом браузере запускам']
];
export function registry(runtime = {}) {
  return definitions.map(([id,name,description]) => ({ id,name,description,
    status: id === 'languages' && !runtime.localAI ? 'needs_local_ai' : 'partial',
    mode: ['languages'].includes(id) ? 'local_ai' : 'free',
    limitations: 'Запуск по кнопке. Результаты требуют проверки; автоматическая публикация отключена.' }));
}
export function integrations(runtime = {}) {
  return { cloudAI: { status: process.env.OPENAI_API_KEY ? 'configured_unverified' : 'not_configured',
    enabledByDefault: false, note: 'Существующий платный API сохранён отдельно и требует кода доступа. Наличие ключа не подтверждает работоспособность.' },
    localAI: { status: runtime.localAI ? 'available' : 'not_connected', note: runtime.model || 'Запустите локальный сервер и Ollama с уже установленной моделью.' },
    video: { status: runtime.video ? 'available' : 'needs_local_executor', note: 'FFmpeg работает только на локальном исполнителе.' },
    socialAccounts: { status: 'not_connected', note: 'Ссылки не дают права читать закрытую статистику или публиковать.' },
    storage: { status: 'browser_only', note: 'Ссылки и история хранятся в этом браузере. Экспортируйте резервную копию. Общая облачная база и расписание не подключены.' } };
}
export async function callHandler(handler) {
  let code = 200, result;
  await handler({method:'GET',headers:{}}, {setHeader(){},status(n){code=n;return this;},json(d){result=d;return this;}});
  if (code >= 400) throw Error(result?.error || 'Источник недоступен');
  return result;
}
const text = (s,max=8000) => typeof s === 'string' ? s.trim().slice(0,max) : '';
function required(s, label) { if (!s) throw Error('Заполните: ' + label); return s; }
const escapeXML = s => s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function metrics(input) {
  const values = {};
  for (const key of ['spend','clicks','leads','sales']) {
    const value = input[key];
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value)<0) throw Error('Введите неотрицательные числа: расходы, клики, заявки и продажи.');
    values[key] = Number(value);
  }
  const {spend,clicks,leads,sales} = values;
  if (leads > clicks || sales > leads) throw Error('Для одной воронки продажи ≤ заявки ≤ клики. Проверьте период и числа.');
  return {...values, CPC: clicks ? spend/clicks : null, CPL:leads ? spend/leads : null,
    conversionPercent:clicks ? leads/clicks*100 : null, salesConversionPercent:leads ? sales/leads*100 : null,
    note:'Рассчитано по введённым пользователем данным за один период; валюта расходов сохраняется.'};
}
export async function execute(action, input = {}, runtime = {}) {
  const startedAt = new Date().toISOString();
  const run = {id:randomUUID(),action,startedAt,status:'completed',provider:'rules',cost:'no_paid_api',needsHumanApproval:true};
  const facts = text(input.facts), title = text(input.title,180), content = text(input.text);
  const sources = Array.isArray(input.connections) ? input.connections.slice(0,12) : [];
  const sync = async list => Promise.all(list.map(c => syncConnection(c)));
  let output;
  switch (action) {
    case 'connections.sync': output = await sync(sources); break;
    case 'website.audit': output = await callHandler(auditHandler); break;
    case 'website.health': output = await callHandler(healthHandler); break;
    case 'news': output = await callHandler(discoverHandler); break;
    case 'content': {
      required(title,'название'); required(facts,'подтверждённые факты');
      if (input.provider === 'local') {
        if (!runtime.generate) return {...run,status:'blocked',output:{message:'Локальный AI не подключён. Выберите бесплатный шаблон.'}};
        output = {post:await runtime.generate('Напиши русский рекламный черновик для GetTravel. Используй только факты ниже, не выдумывай цены, включения или популярность. '+JSON.stringify({title,facts,platform:input.platform})),note:'Локальный AI; проверьте каждое утверждение.'};
        run.provider='local_ai';
      } else output = {post:input.platform==='TikTok'
        ? `СЦЕНА 1 · 0–3 сек\n${title}\n\nСЦЕНА 2 · Основная часть\n${facts}\n\nФИНАЛ · Призыв\nУточните программу и даты: gettravel.asia`
        : `${title}\n\n${facts}\n\nУточните программу и доступность на вашу дату: gettravel.asia`,note:'Шаблон по введённым фактам, не AI-генерация и не независимая проверка фактов.'};
      break;
    }
    case 'design': {
      required(title,'название');
      const lines = title.match(/.{1,24}(?:\s|$)|.{1,24}/g) || [title];
      output = {filename:'gettravel-card.svg',mime:'image/svg+xml',
        file:`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#102b33"/><text x="80" y="150" font-family="sans-serif" font-size="36" fill="#4be1cb">GETTRAVEL</text>${lines.slice(0,8).map((line,i)=>`<text x="80" y="${290+i*70}" font-family="sans-serif" font-size="50" fill="white">${escapeXML(line)}</text>`).join('')}<text x="80" y="980" font-family="sans-serif" font-size="30" fill="#4be1cb">gettravel.asia</text></svg>`, note:'Текстовая карточка; логотип и реальные фотографии не добавлены и не проверены.'}; break;
    }
    case 'video': {
      required(title,'название'); required(facts,'факты');
      const scenes = [title, facts.slice(0,160), 'Программа и даты: gettravel.asia'];
      const srt=scenes.map((s,i)=>`${i+1}\n00:00:${String(i*5).padStart(2,'0')},000 --> 00:00:${String((i+1)*5).padStart(2,'0')},000\n${s.replace(/\r?\n/g,' ')}\n`).join('\n');
      output={scenes,filename:'gettravel-subtitles.srt',mime:'text/plain',file:srt,
        note:'Сценарий и субтитры для 15-секундного ролика. MP4 создаётся локально из ваших фотографий; AI-видео не имитируется.'};
      break;
    }
    case 'languages': {
      required(content,'текст');
      if (!runtime.generate) return {...run,status:'blocked',output:{message:'Перевод требует локальной модели Ollama. На Vercel локальная модель не подключена.'}};
      const langs={ru:'Russian',en:'English',vi:'Vietnamese',zh:'Chinese',ko:'Korean',tr:'Turkish',fr:'French'};
      if (!langs[input.language]) throw Error('Выберите язык перевода.');
      output={translation:await runtime.generate(`Translate into ${langs[input.language]}. Preserve facts, numbers, names. Return translation only. Text: ${content}`)};run.provider='local_ai';break;
    }
    case 'competitors': output = await sync(sources.filter(c=>c.role==='competitor')); break;
    case 'social': output = await sync(sources.filter(c=>c.role!=='competitor')); break;
    case 'telegram': output = await sync(sources.filter(c=>/https:\/\/(?:t\.me|telegram\.me)\//.test(c.url))); break;
    case 'directory': output = await sync(sources); break;
    case 'ads': case 'leads': case 'analytics': output=metrics(input);break;
    case 'reviews': required(content,'текст отзыва'); output={review:content,reply:'Спасибо, что поделились впечатлениями. Мы внимательно прочитали ваш отзыв. Пожалуйста, свяжитесь с GetTravel и укажите дату экскурсии и детали бронирования, чтобы мы могли разобраться и ответить по существу.',note:'Нейтральный шаблон. Сбор отзывов, проверка обстоятельств и отправка ответа не выполнялись.'};break;
    case 'demand': {
      required(content,'наблюдения — по одному на строку');
      const lines=content.split('\n').map(s=>s.trim()).filter(Boolean);
      const counts={};for(const line of lines){const k=line.toLowerCase();counts[k]=(counts[k]||0)+1;}
      output={observations:lines.length,topics:Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([topic,count])=>({topic,count})),note:'Частота тем в вашем вводе; не поисковый спрос, сезонность или прогноз продаж.'};break;
    }
    case 'registrations': output={integrations:integrations(runtime),sources:sources.map(c=>({url:c.url,status:c.status||'not_checked',checkedAt:c.checkedAt||null})),note:'Статусы ссылок сохранены в браузере. Авторизация аккаунтов и срок токенов не проверяются.'};break;
    case 'monitor': output={site:await callHandler(healthHandler),sources:await sync(sources)};break;
    case 'quality': {
      required(content,'текст для проверки');
      const warnings=[];
      if(/\d[\d\s.,]*\s*(?:₽|\$|₫|VND|USD|руб)/i.test(content))warnings.push('Есть цена — сверьте с подтверждённым прайсом и датой.');
      if(/гарант|лучш|самый|100%|всё включено|все включено/i.test(content))warnings.push('Есть абсолютное обещание или превосходная степень — нужно подтверждение.');
      if(/виз[ауы]|visa/i.test(content))warnings.push('Проверьте упоминание виз: визовые услуги не входят в маркетинговое предложение.');
      output={warnings,note:'Поиск отдельных рискованных формулировок. Отсутствие предупреждений не подтверждает достоверность, авторские права или качество фото.'};break;
    }
    case 'report': {
      const history=Array.isArray(input.history)?input.history.slice(0,30):[];
      output={runs:history.map(h=>({action:text(h.action,40),status:text(h.status,30),finishedAt:text(h.finishedAt,40)})),sources:sources.map(s=>({url:s.url,status:s.status||'not_checked',checkedAt:s.checkedAt||null})),note:'История передана этим браузером, не серверный журнал; успешный запуск не означает успех всех источников.'};break;
    }
    case 'director': output={tasks:[
      {priority:1,action:'connections.sync',task:sources.length?'Обновить добавленные источники':'Добавить собственные аккаунты и ссылки конкурентов'},
      {priority:2,action:'website.audit',task:'Проверить сайт и вручную утвердить предложенные исправления'},
      {priority:3,action:'content',task:facts?'Создать черновик из введённых фактов':'Указать подтверждённые факты о туре'},
      {priority:4,action:'quality',task:'Проверить текст перед публикацией'}],note:'План по правилам; действия не запускаются без нажатия кнопок, бюджет не расходуется.'};break;
    default: throw Error('Неизвестное действие');
  }
  if (Array.isArray(output) && !output.length) {run.status='blocked';output={message:'Добавьте подходящие ссылки в разделе «Подключения».'};}
  else if (Array.isArray(output) && output.some(x=>['error','unavailable','needs_account'].includes(x.status))) run.status='partial';
  return {...run,finishedAt:new Date().toISOString(),output};
}
