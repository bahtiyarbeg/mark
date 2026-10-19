import {execute,registry,integrations} from '../lib/orchestrator.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET') return res.status(200).json({modules:registry(req.runtime),integrations:integrations(req.runtime)});
  if(req.method!=='POST') return res.status(405).json({error:'GET or POST only'});
  try {if(req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({error:'Другой источник запроса запрещён'});}
  catch {return res.status(400).json({error:'Некорректный источник запроса'});}
  if(!req.body || typeof req.body!=='object' || JSON.stringify(req.body).length>100000) return res.status(400).json({error:'Некорректный запрос или слишком много данных'});
  try {return res.status(200).json(await execute(req.body.action,req.body.input||{},req.runtime));}
  catch(e){return res.status(400).json({status:'failed',error:e.message});}
}
