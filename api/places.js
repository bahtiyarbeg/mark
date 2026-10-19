import {cities,places,prices} from '../lib/places.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  try{
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Другой источник запроса запрещён'});
    const body=req.body;if(!body||JSON.stringify(body).length>2000)return res.status(400).json({error:'Некорректный запрос'});
    const result=body.action==='cities'?await cities(body.city):body.action==='places'?await places(body):body.action==='prices'?await prices(body.id):null;
    if(!result)return res.status(400).json({error:'Неизвестное действие'});return res.json(result);
  }catch(e){return res.status(502).json({error:e.message||'Источник недоступен. Попробуйте позже.'});}
}
