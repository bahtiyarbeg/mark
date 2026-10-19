import {execute} from '../lib/orchestrator.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const query=String(req.body?.message||'').trim().slice(0,700);
  if(!query)return res.status(400).json({error:'Введите задачу'});
  try {
    // These are explicit free tools, not an LLM or a simulated AI response.
    const input=req.body?.input&&typeof req.body.input==='object'?req.body.input:{};
    const action=/субтитр|сценари|ролик|видео/i.test(query)?'video':/черновик|пост|контент|напиши/i.test(query)?'content':/конверси|аналитик|рассчитай/i.test(query)?'analytics':null;
    if(action){
      try{
        const result=await execute(action,{...input,provider:'template'});
        return res.json({kind:'tool',title:action==='content'?'Черновик по вашим фактам':action==='video'?'Сценарий и субтитры':'Расчёт по вашим данным',answer:'Бесплатный инструмент по правилам. Это не AI-генерация.',verified:false,result});
      }catch(e){return res.status(400).json({error:e.message+' Данные можно заполнить в разделе «Все модули».'});}
    }
    if(/сайт|seo|индекс|ошибк|доступност|website|вебмастер/i.test(query)){
      const {output:d}=await execute('website.audit');
      return res.json({kind:'website',title:'Аудит сайта GetTravel',answer:`Проверено страниц: ${d.pagesScanned}. Важных замечаний: ${d.summary.high}. ${d.limitations}`,checkedAt:d.checkedAt,verified:d.pages.some(p=>p.status>=200&&p.status<300),items:d.pages.flatMap(p=>p.issues.map(i=>({url:p.url,title:i.field+': '+i.why+' → '+(i.replacement||i.suggestion)}))).slice(0,20)});
    }
    if(/конкурент|рынок|новост|тренд|туризм|публикац/i.test(query)){
      const {output:d}=await execute('news');
      return res.json({kind:'market',title:'Публичные новости туристического рынка',answer:d.notice+' Для проверки конкретного конкурента добавьте его ссылку в «Подключениях».',checkedAt:d.updated,verified:d.items.length>0,items:d.items.slice(0,8).map(x=>({...x,url:x.link}))});
    }
    return res.json({kind:'unavailable',title:'Выберите действие в панели',answer:'Для контента, видео, перевода и аналитики откройте «Все 18 AI-модулей» и заполните общие данные. Telegram, TikTok, Instagram и конкуренты добавляются в «Подключениях». Актуальные тарифы и наличие билетов требуют поставщика данных, который пока не подключён.',verified:false});
  }catch{return res.status(502).json({error:'Источник недоступен. Попробуйте позже.'});}
}
