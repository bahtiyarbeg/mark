// Evidence-first command router. No API key, no invented fares.
const site="gettravel.asia";
const escape=(s)=>String(s||"").slice(0,700);
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"Use POST"});
 const query=escape(req.body?.message).trim();
 if(!query)return res.status(400).json({error:"Введите задачу"});
 const q=query.toLowerCase();
 const base="https://"+(req.headers.host||"");
 const headers={};
 async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(14000)});if(!r.ok)throw Error("Источник не ответил");return r.json()}
 try{
  if(/сайт|seo|индекс|ошибк|доступност|website|вебмастер/.test(q)){
   const d=await get("/api/site-health");
   const bad=d.checks.filter(c=>c.state!=="ok");
   return res.status(200).json({kind:"website",title:"Результат проверки gettravel.asia",answer:"Проверено "+d.checks.length+" пунктов. Успешно: "+d.summary.ok+", замечания: "+d.summary.warning+", ошибки: "+d.summary.error+". "+(bad.length?"Требуют внимания: "+bad.map(c=>c.label+" — "+c.details).join("; "):"По доступным проверкам проблем не обнаружено.")+" Внутреннюю аналитику Google и Яндекса без разрешённого подключения проверить нельзя.",checkedAt:d.checkedAt,source:"https://gettravel.asia",verified:true});
  }
  if(/конкурент|рынок|новост|тренд|туризм|публикац/.test(q)){
   const d=await get("/api/discover");
   const items=d.items.slice(0,8);
   return res.status(200).json({kind:"market",title:"Публикации туристического рынка",answer:items.length?"Найдено "+d.items.length+" публичных публикаций. Ниже первые материалы; это не полный список конкурентов.":"Свежие публикации получить не удалось. Не буду подменять их предположениями.",items:items.map(x=>({title:x.title,url:x.link,source:x.source,date:x.date})),checkedAt:d.updated,verified:items.length>0});
  }
  if(/авиа|самол|перел|рейс|автобус|поезд|билет|театр|парк|аттракцион|vinwonders|стоимост|цен[ауы]/.test(q)){
   return res.status(200).json({kind:"unavailable",title:"Для этого запроса пока нет проверенного источника",answer:"Я понял задачу: «"+query+"». Но подключённого поставщика актуальных тарифов и расписаний пока нет. Поэтому я не могу достоверно показать самую низкую цену, компании и свободные места. Не буду отправлять вас в поисковик вместо результата или придумывать цены.",verified:false,needs:"Подключение тарифного источника/партнёрского API для самолётов, автобусов, поездов и входных билетов."});
  }
  return res.status(200).json({kind:"unavailable",title:"Задача принята, но автоматическое выполнение пока не настроено",answer:"Запрос: «"+query+"». Для достоверного выполнения нужен соответствующий инструмент или источник. Сейчас автоматически доступны проверка сайта и поиск публичных новостей туристического рынка. Остальные возможности находятся в разработке.",verified:false});
 }catch(e){return res.status(502).json({error:"Не удалось получить проверенные данные из внешнего источника. Попробуйте позже."})}
}
