// Server-side OpenAI content generation. Set OPENAI_API_KEY in Vercel environment.
const FACTS = {
  "Винь Хи": "Морская прогулка по бухте Виньхи: Бãi Amanoi, мыс Дельфина (Mũi Cá Heo), пещера ласточек (Hang Yến), остров Hòn Rùa. Купание только если подтверждено для выбранного варианта.",
  "Фанранг": "Поездка по песчаным дюнам на розовом УАЗ, катание по песку на доске, зоопарк с капибарами, морская прогулка в Виньхи, виноградник. Уточнять конкретную программу.",
  "Далат": "Горный город Далат; достопримечательности и включения зависят от выбранной программы. Не придумывать остановки, цены или длительность.",
  "Три острова": "Морская экскурсия из Нячанга. Конкретные острова, обед и водные активности зависят от варианта программы.",
  "VinWonders": "Парк развлечений VinWonders Nha Trang. Не обещать конкретные аттракционы или часы работы без проверки.",
  "Обзорная экскурсия Нячанг": "Башни По Нагар, пагода Лонг Шон, Кафедральный собор Нячанга, Хон Чонг, площадь 2/4. Программа может различаться.",
  "Янг Бэй": "Экскурсия к водопадам и природным достопримечательностям Yang Bay. Точные включения зависят от программы."
};
const LANGS = ["ru","en","vi","ko","zh","tr","fr"];
const PLATFORMS = ["Facebook","Instagram","TikTok","WeChat","LINE","Viber"];
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI не подключён: администратор должен настроить OPENAI_API_KEY в Vercel."});
  const {tour,platform,language} = req.body || {};
  if(!Object.prototype.hasOwnProperty.call(FACTS,tour)||!PLATFORMS.includes(platform)||!LANGS.includes(language))
    return res.status(400).json({error:"Некорректные параметры"});
  const instructions = "You are the lead travel marketing copywriter for licensed GetTravel Vietnam. Write excellent, specific, persuasive ORIGINAL native-language advertising copy. Never fabricate itinerary stops, prices, included services, guarantees, booking availability or popularity. Do not advertise visas. Do not plagiarize competitors. Use only supplied verified facts. Include a compelling hook, useful specific experience details, and clear booking CTA. No generic fluff. Return only finished post text, no commentary.";
  const prompt = JSON.stringify({tour,platform,language,facts:FACTS[tour],brand:"GetTravel",phone:"+84 342 134 941",website:"gettravel.asia",price_policy:"Do not mention prices",length:"120-180 words for Facebook, 60-110 words for Instagram/WeChat/LINE/Viber, 40-70 words for TikTok"});
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),24000);
    let upstream;
    try {
      upstream=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",signal:controller.signal,
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
        body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",instructions,input:prompt,max_output_tokens:750})
      });
    } finally {clearTimeout(timer);}
    const result=await upstream.json();
    if(!upstream.ok) return res.status(502).json({error:"OpenAI API вернул ошибку. Проверьте ключ, лимиты и баланс."});
    const post=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim();
    if(!post) return res.status(502).json({error:"AI не вернул текст. Повторите попытку."});
    return res.status(200).json({post,model:process.env.OPENAI_MODEL||"gpt-4.1-mini",status:"draft_needs_approval"});
  } catch(e) {return res.status(502).json({error:"Не удалось связаться с AI. Повторите попытку."});}
}
