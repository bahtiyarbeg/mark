// Public, bounded sitemap audit. Evidence-based rules, not an LLM copywriting review.
const ROOT="https://gettravel.asia";
const decode=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&(?:amp|nbsp);/g," ").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const tag=(html,name)=>decode((html.match(new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)<\\/"+name+">","i"))||[])[1]);
const attr=(s,k)=>(s.match(new RegExp("\\b"+k+"\\s*=\\s*[\"']([\\s\\S]*?)[\"']","i"))||[])[1]||"";
async function fetchText(url){const r=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(6500),headers:{"User-Agent":"GetTravelAudit/1.0"}});return {ok:r.ok,status:r.status,url:r.url,text:(await r.text()).slice(0,250000)}}
function issue(type,level,field,current,why,suggestion){return {type,level,field,current,why,suggestion}}
function audit(p){const html=p.text,title=tag(html,"title"),h1s=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(x=>decode(x[1])),h2s=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(x=>decode(x[1]));const meta=(html.match(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/i)||[])[0]||"";const description=attr(meta,"content");const lang=(html.match(/<html\b[^>]*\blang\s*=\s*["']?([\w-]+)/i)||[])[1]||"";const text=decode(html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi," "));const issues=[];
if(!title)issues.push(issue("seo","high","Title","","Нет заголовка страницы","Добавить уникальный Title с названием тура, направлением и брендом"));
else if(title.length<28||title.length>68)issues.push(issue("seo","medium","Title",title,"Длина "+title.length+" символов; может плохо описывать предложение или обрезаться","Написать конкретный заголовок с направлением и главной выгодой (ориентир 30–65 символов)"));
if(!description)issues.push(issue("seo","medium","Meta description","","Отсутствует описание для поисковой выдачи","Написать уникальное описание с маршрутом, преимуществом и призывом к действию"));
else if(description.length<65||description.length>175)issues.push(issue("seo","low","Meta description",description,"Длина "+description.length+" символов","Сделать описание конкретнее, ориентир 70–160 символов"));
if(h1s.length!==1)issues.push(issue("structure","medium","H1",h1s.join(" | "),"Количество H1: "+h1s.length,"Использовать один понятный основной заголовок на странице"));
if(h1s[0]&&h1s[0].length<12)issues.push(issue("marketing","medium","H1",h1s[0],"Слишком короткий заголовок: выгода для туриста может быть неясна","Уточнить направление, формат экскурсии и ключевое преимущество"));
if(!lang)issues.push(issue("localization","medium","Язык HTML","","Не указан язык документа","Указать корректный lang для языковой версии"));
if(!/book|reserv|заброн|бронир|đặt (tour|vé|ngay)|立即预订|예약|rezervasyon/i.test(text))issues.push(issue("conversion","medium","Призыв к бронированию","","Не обнаружен явный текстовый призыв к бронированию в исходном HTML","Добавить заметный призыв к бронированию и понятный контакт; проверить также JS-рендеринг"));
if(!/whatsapp|zalo|telegram|tel:|\+84\s*\d/i.test(html))issues.push(issue("conversion","medium","Контакты","","Не найдены типовые контактные маркеры в HTML","Проверить доступность телефона, Zalo или формы бронирования"));
if(text.length<350)issues.push(issue("content","low","Объём текста",text.slice(0,110),"Мало доступного текстового содержания в исходном HTML","Проверить полноценность описаний туров и клиентских условий"));
return {url:p.url,status:p.status,title,h1:h1s,h2:h2s.slice(0,12),description,lang,issues,visibleTextSample:text.slice(0,450),note:"Эвристическая проверка HTML, не экспертная оценка привлекательности текста"}}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"GET only"});
 try{
 const map=await fetchText(ROOT+"/sitemap.xml");let urls=[];
 if(map.ok){urls=[...map.text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(x=>x[1].replace(/&amp;/g,"&")).filter(x=>{try{return new URL(x).hostname==="gettravel.asia"}catch{return false}})}
 const home=ROOT+"/";urls=[home,...urls.filter(x=>x!==home)].slice(0,12);
 const results=await Promise.allSettled(urls.map(fetchText));
 const pages=results.map((x,i)=>x.status==="fulfilled"?audit(x.value):{url:urls[i],status:0,issues:[issue("technical","high","Доступность","","Страница не ответила","Проверить URL и сервер")]});
 const byTitle=new Map();for(const p of pages){if(!p.title)continue;const old=byTitle.get(p.title);if(old){p.issues.push(issue("seo","high","Дублирующийся Title",p.title,"Тот же Title на "+old,"Сделать уникальный Title для каждой страницы"))}else byTitle.set(p.title,p.url)}
 const all=pages.flatMap(p=>p.issues);
 res.status(200).json({domain:"gettravel.asia",checkedAt:new Date().toISOString(),pagesScanned:pages.length,pages,summary:{high:all.filter(x=>x.level==="high").length,medium:all.filter(x=>x.level==="medium").length,low:all.filter(x=>x.level==="low").length},limitations:"Проверено не более 12 публичных URL из sitemap.xml и главная. Это первый проход, не весь сайт. JS-рендеринг, изображения, реальные поисковые позиции, скорость Core Web Vitals, конкурентные тексты и семантическое качество каждой фразы требуют дополнительных источников и анализа. Эвристические замечания требуют редакторской проверки."});
 }catch(e){res.status(502).json({error:"Не удалось провести проверку страниц",detail:String(e.message||"")})}
}
