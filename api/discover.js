// Public news discovery, not private social metrics or an exhaustive competitor directory.
const TOPICS=["Nha Trang tour operator","Cam Ranh excursions","Nha Trang island tour","Dalat tour from Nha Trang","Vinh Hy tour"];
function decode(s){return s.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();}
export default async function handler(req,res){
 res.setHeader("Cache-Control","public, s-maxage=1800, stale-while-revalidate=3600");
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 const out=[];let failures=0;
 for(const topic of TOPICS){
  try{
   const url="https://news.google.com/rss/search?q="+encodeURIComponent(topic+" when:14d")+"&hl=en&gl=VN&ceid=VN:en";
   const response=await fetch(url,{headers:{"User-Agent":"GetTravelMarketing/1.0 (public news research)"},signal:AbortSignal.timeout(6500)});
   if(!response.ok)throw Error("source unavailable");
   const xml=await response.text();
   for(const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){
    const block=match[1];const get=(tag)=>decode((block.match(new RegExp("<"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+tag+">"))||[])[1]||"");
    const title=get("title"),link=get("link"),date=get("pubDate"),source=get("source");
    if(title&&/^https:\/\//.test(link)&&!out.some(x=>x.link===link))out.push({title,link,date,source,topic});
    if(out.length>=35)break;
   }
  }catch(e){failures++;}
 }
 return res.status(200).json({items:out.slice(0,35),checked:TOPICS,source:"Google News RSS: публичные новости, не статистика социальных сетей",updated:new Date().toISOString(),partial:failures>0,notice:out.length?"Это публикации по туристическому рынку, не подтверждённый список всех конкурентов.":"Публичные новости сейчас не получены. Данные не выдумываются."});
}