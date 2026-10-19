import https from 'node:https';
import { lookup } from 'node:dns/promises';

export function publicIPv4(address) {
  const p = address.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b,c] = p;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 2))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export function publicURL(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') ||
      !u.hostname.includes('.') || u.hostname.endsWith('.local') || u.hostname.length > 253) {
    throw Error('Нужна публичная HTTPS-ссылка без пароля и нестандартного порта.');
  }
  u.hash = '';
  return u;
}

// Resolve once, validate every address, pin the selected IP for the request.
// Every redirect is validated again. No proxy credentials or cookies are sent.
export async function publicFetch(input, redirects = 0) {
  const url = publicURL(input);
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, family: 4 }),
    new Promise((_, reject) => { const t = setTimeout(() => reject(Error('DNS timeout')), 4000); t.unref(); })
  ]);
  if (!addresses.length || addresses.some(x => !publicIPv4(x.address))) throw Error('Непубличный адрес запрещён.');
  const result = await new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'GetTravelMarketing/2.0', Accept: 'text/html,text/plain,application/xml' },
      lookup: (_host, options, cb) => options.all ? cb(null, [addresses[0]]) : cb(null, addresses[0].address, 4)
    }, response => {
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 750000) req.destroy(Error('Источник превышает лимит 750 КБ.'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers,
        text: Buffer.concat(chunks).toString('utf8'), url: url.href, ok: response.statusCode >= 200 && response.statusCode < 300 }));
    });
    const timer = setTimeout(() => req.destroy(Error('Источник не ответил за 7 секунд.')), 7000);
    req.on('close', () => clearTimeout(timer)); req.on('error', reject);
  });
  if ([301,302,303,307,308].includes(result.status) && result.headers.location) {
    if (redirects >= 2) throw Error('Слишком много перенаправлений.');
    return publicFetch(new URL(result.headers.location, url).href, redirects + 1);
  }
  return result;
}
