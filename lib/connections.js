import { createHash } from 'node:crypto';
import { publicURL, publicFetch } from './public-fetch.js';
export const cleanText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function normalizeConnection(input) {
  const u = publicURL(String(input.url || '').trim());
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  let platform = 'website';
  if (host === 't.me' || host === 'telegram.me') {
    const name = u.pathname.replace(/^\/s\//, '/').split('/')[1];
    if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name || '') || ['share','proxy','login','joinchat'].includes(name)) throw Error('Укажите публичный Telegram-канал: https://t.me/channel');
    u.hostname = 't.me'; u.pathname = '/' + name; u.search = ''; platform = 'telegram';
  } else if (host === 'instagram.com') {
    if (!/^\/[A-Za-z0-9_.]+\/?$/.test(u.pathname)) throw Error('Укажите ссылку на профиль Instagram.');
    platform = 'instagram'; u.search = '';
  } else if (host === 'tiktok.com') {
    if (!/^\/@[A-Za-z0-9_.]+\/?$/.test(u.pathname)) throw Error('Укажите профиль TikTok: https://www.tiktok.com/@name');
    platform = 'tiktok'; u.search = '';
  }
  return { url: u.href, platform, role: input.role === 'competitor' ? 'competitor' : 'own',
    label: String(input.label || host).slice(0,100) };
}

export async function syncConnection(input, fetcher = publicFetch) {
  const connection = normalizeConnection(input);
  const checkedAt = new Date().toISOString();
  if (['instagram','tiktok'].includes(connection.platform)) return { ...connection, checkedAt,
    status: 'needs_account', message: 'Ссылка сохранена. Чтение публикаций, статистика и публикация требуют официального подключения аккаунта; адаптер ещё не реализован.', items: [] };
  try {
    const url = connection.platform === 'telegram' ? connection.url.replace('t.me/', 't.me/s/') : connection.url;
    const response = await fetcher(url);
    if (!response.ok) throw Error('HTTP ' + response.status);
    const title = cleanText(response.text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const items = connection.platform === 'telegram'
      ? [...response.text.matchAll(/<div\b[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)]
          .slice(-12).map(m => ({ text: cleanText(m[1]).slice(0,1500), url: connection.url }))
      : [];
    const descriptionTag = response.text.match(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i)?.[0] || '';
    const description = cleanText(descriptionTag.match(/content=["']([\s\S]*?)["']/i)?.[1]);
    if (connection.platform === 'telegram' && !items.length) return { ...connection, checkedAt, status: 'unavailable',
      message: 'Публичные сообщения не получены: канал закрыт, пуст или недоступен для веб-просмотра.', items: [] };
    const fingerprint = createHash('sha256').update(JSON.stringify({title,description,items})).digest('hex');
    return { ...connection, checkedAt, lastSuccessAt: checkedAt, status: 'partial', title, description, items, fingerprint,
      changed: input.fingerprint ? input.fingerprint !== fingerprint : null,
      message: connection.platform === 'telegram' ? 'Получены последние доступные публичные сообщения. История, реакции и публикация не подключены.'
        : 'Проверены доступность, заголовок и описание страницы. Это снимок страницы, не статистика продаж.' };
  } catch (e) { return { ...connection, checkedAt, status: 'error', message: e.message, items: [] }; }
}
